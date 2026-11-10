import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { richmondHill, WEATHER_CACHE_SECONDS, weatherProvider } from "../../data/weather";
import type { WeatherResponse } from "../../lib/sky";
import { forecastUrl, parseForecast } from "../../lib/weather";

// GET /api/weather: Richmond Hill's current weather and the days' sun, for
// the corner display and the world (components/weather/useRichmondHill.ts).
//
// Caching. The handler only reads a `use cache` function, so with Cache
// Components the route is prerendered at build time and then kept like an
// ISR page: served from the server's cache to every visitor, and refreshed
// in the background by the first request after WEATHER_CACHE_SECONDS
// (15 minutes). Its Cache-Control (set by Next.js from the cache life:
// `s-maxage=900, stale-while-revalidate=2700`) lets a CDN keep it too.
// Open-Meteo is asked at most once per 15 minutes per server cache,
// however many visitors and pages there are.
//
// Failure (timeout, an error from Open-Meteo, or a response that doesn't
// pass parseForecast). A failure is never stored as the route's response:
// it makes the refresh fail (the server logs "[weather] Open-Meteo: …"
// and a "Dynamic server usage" error), and Next.js then
//   - in a background refresh, keeps serving the previous good response,
//     and tries again about 30 seconds later;
//   - past `expire` (an hour without a refresh, so the request waits),
//     answers that request with an error (500) and still keeps the
//     previous response for the next one.
// If the fetch fails during `next build`, the route is built as dynamic
// instead (the build doesn't fail): each request then runs the handler,
// a good reading is reused for 15 minutes from the server's memory, and a
// failure answers { ok: false, error } with status 503 and no-store, and
// is remembered for only 30 seconds. A rebuild makes the route static again.
// The client treats an error status or a body that isn't a valid response
// as no new reading, and keeps the one it has.

// Open-Meteo usually answers in well under a second
const UPSTREAM_TIMEOUT_MS = 4500;

async function fetchWeather(): Promise<WeatherResponse> {
  "use cache";
  // WEATHER_FORECAST_URL points the server at a stand-in for Open-Meteo,
  // to check timeouts and malformed responses; unset in production
  const endpoint = process.env.WEATHER_FORECAST_URL || weatherProvider.forecastEndpoint;
  const fetchedAt = Math.floor(Date.now() / 1000);
  const fail = (error: "timeout" | "upstream" | "malformed"): WeatherResponse => {
    // Short enough that the next try is soon; short enough, too, that a
    // build-time failure isn't prerendered (cacheLife: expire under five
    // minutes makes this a request-time value)
    cacheLife({ stale: 30, revalidate: 30, expire: 60 });
    console.warn(`[weather] Open-Meteo: ${error}`);
    return { ok: false, error };
  };

  let res: Response;
  try {
    res = await fetch(forecastUrl(endpoint, richmondHill), {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (err) {
    return fail(err instanceof Error && err.name === "TimeoutError" ? "timeout" : "upstream");
  }
  if (!res.ok) return fail("upstream");

  let json: unknown;
  try {
    json = await res.json();
  } catch (err) {
    // The body can also time out while it streams in
    return fail(err instanceof Error && err.name === "TimeoutError" ? "timeout" : "malformed");
  }
  const reading = parseForecast(json, fetchedAt, richmondHill.timeZone);
  if (!reading) return fail("malformed");

  // Refreshed after 15 minutes; after an hour with no visitor the next one
  // waits for a fresh reading instead of being served an old one
  cacheLife({ stale: 300, revalidate: WEATHER_CACHE_SECONDS, expire: 60 * 60 });
  return { ok: true, reading };
}

export async function GET() {
  const result = await fetchWeather();
  if (!result.ok) {
    // Keeps a failure out of the prerender and the route's cache (see above)
    await connection();
    return Response.json(result, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json(result);
}
