// Richmond Hill's weather (app/lib/weather.ts): the Open-Meteo request,
// strict reading of its response, WMO codes → label, preset and icon, and
// when a reading is stale.
import assert from "node:assert/strict";
import { test } from "node:test";
import { richmondHill, weatherProvider } from "../app/data/weather.ts";
import {
  describeWeather,
  forecastUrl,
  isWeatherReading,
  parseForecast,
  readingAge,
  STALE_AFTER_SECONDS,
  UNUSABLE_AFTER_SECONDS,
} from "../app/lib/weather.ts";

const TZ = richmondHill.timeZone;

// A real response for Richmond Hill (reading of 10 November 2026, 04:15
// EST), as Open-Meteo sent it to forecastUrl's request (timeformat=unixtime,
// past_days=1, forecast_days=3); only generationtime_ms, elevation and
// timezone_abbreviation left out
const sample = () => ({
  latitude: 43.873108,
  longitude: -79.43404,
  utc_offset_seconds: -18000,
  timezone: "America/Toronto",
  current_units: { time: "unixtime", interval: "seconds", temperature_2m: "°C", weather_code: "wmo code", cloud_cover: "%", is_day: "" },
  current: { time: 1794302100, interval: 900, temperature_2m: 4.9, weather_code: 3, cloud_cover: 100, is_day: 0 },
  daily_units: { time: "unixtime", sunrise: "unixtime", sunset: "unixtime" },
  daily: {
    time: [1794200400, 1794286800, 1794373200, 1794459600],
    sunrise: [1794225881, 1794312361, 1794398841, 1794485320],
    sunset: [1794261482, 1794347814, 1794434147, 1794520483],
  },
});
const FETCHED = 1794302400; // five minutes after the reading

test("the request asks Open-Meteo for the configured place, in Toronto time, as Unix seconds", () => {
  const url = new URL(forecastUrl(weatherProvider.forecastEndpoint, richmondHill));
  assert.equal(url.origin + url.pathname, "https://api.open-meteo.com/v1/forecast");
  assert.equal(url.searchParams.get("latitude"), String(richmondHill.latitude));
  assert.equal(url.searchParams.get("longitude"), String(richmondHill.longitude));
  assert.equal(url.searchParams.get("timezone"), "America/Toronto");
  assert.equal(url.searchParams.get("timeformat"), "unixtime");
  assert.deepEqual(url.searchParams.get("current").split(","), ["temperature_2m", "weather_code", "cloud_cover", "is_day"]);
  assert.deepEqual(url.searchParams.get("daily").split(","), ["sunrise", "sunset"]);
  assert.ok(Number(url.searchParams.get("forecast_days")) >= 2, "tomorrow's sun is included");
});

test("a real response becomes a reading, with each day's sun by Toronto date", () => {
  const r = parseForecast(sample(), FETCHED, TZ);
  assert.deepEqual(r, {
    observedAt: 1794302100,
    fetchedAt: FETCHED,
    temperatureC: 4.9,
    weatherCode: 3,
    cloudCover: 100,
    isDay: false,
    sun: [
      { date: "2026-11-09", sunrise: 1794225881, sunset: 1794261482 },
      { date: "2026-11-10", sunrise: 1794312361, sunset: 1794347814 },
      { date: "2026-11-11", sunrise: 1794398841, sunset: 1794434147 },
      { date: "2026-11-12", sunrise: 1794485320, sunset: 1794520483 },
    ],
  });
  assert.ok(isWeatherReading(r));
});

test("malformed responses are rejected whole, never patched up", () => {
  const broken = [
    null,
    "nope",
    [],
    {},
    { ...sample(), current: undefined },
    { ...sample(), daily: undefined },
  ];
  const withCurrent = (patch) => ({ ...sample(), current: { ...sample().current, ...patch } });
  const withDaily = (patch) => ({ ...sample(), daily: { ...sample().daily, ...patch } });
  broken.push(
    withCurrent({ temperature_2m: undefined }),
    withCurrent({ temperature_2m: "4.9" }),
    withCurrent({ temperature_2m: NaN }),
    withCurrent({ temperature_2m: 120 }),
    withCurrent({ temperature_2m: -150 }),
    withCurrent({ weather_code: 3.5 }),
    withCurrent({ weather_code: -1 }),
    withCurrent({ weather_code: 100 }),
    withCurrent({ weather_code: null }),
    withCurrent({ cloud_cover: 101 }),
    withCurrent({ cloud_cover: -5 }),
    withCurrent({ is_day: true }),
    withCurrent({ is_day: 2 }),
    withCurrent({ time: "2026-11-10T03:55" }), // ISO time: timeformat wasn't honoured
    withCurrent({ time: FETCHED + 2 * 3600 }), // from the future
    withCurrent({ time: FETCHED - 3 * 86400 }), // days old
    withDaily({ sunrise: [] }),
    withDaily({ time: [] }),
    withDaily({ sunset: sample().daily.sunset.slice(1) }),
    withDaily({ sunrise: [1794225881, "x", 1794398841, 1794485320] }),
    withDaily({ sunrise: sample().daily.sunset, sunset: sample().daily.sunrise }), // sunset before sunrise
    withDaily({ sunrise: sample().daily.sunrise.map((s) => s - 86400) }), // sunrise on another date
    withDaily({ time: [...sample().daily.time].reverse(), sunrise: [...sample().daily.sunrise].reverse(), sunset: [...sample().daily.sunset].reverse() }),
  );
  for (const [i, body] of broken.entries()) assert.equal(parseForecast(body, FETCHED, TZ), null, `case ${i} is rejected`);
});

test("a reading from the server is checked again in the browser", () => {
  const good = parseForecast(sample(), FETCHED, TZ);
  assert.ok(isWeatherReading(good));
  assert.ok(!isWeatherReading(null));
  assert.ok(!isWeatherReading({ ...good, temperatureC: "5" }));
  assert.ok(!isWeatherReading({ ...good, isDay: 1 }));
  assert.ok(!isWeatherReading({ ...good, weatherCode: 1000 }));
  assert.ok(!isWeatherReading({ ...good, sun: [{ date: "today", sunrise: 1, sunset: 2 }] }));
  assert.ok(!isWeatherReading({ ...good, sun: undefined }));
});

test("clear skies say sunny by day and clear at night, with sun or moon", () => {
  assert.deepEqual(describeWeather(0, true), { label: "Sunny", preset: "clear", icon: "sun" });
  assert.deepEqual(describeWeather(0, false), { label: "Clear", preset: "clear", icon: "moon" });
  assert.deepEqual(describeWeather(1, true), { label: "Mainly sunny", preset: "clear", icon: "partly-sun" });
  assert.deepEqual(describeWeather(1, false), { label: "Mainly clear", preset: "clear", icon: "partly-moon" });
  assert.deepEqual(describeWeather(2, true), { label: "Partly cloudy", preset: "cloudy", icon: "partly-sun" });
  assert.deepEqual(describeWeather(2, false), { label: "Partly cloudy", preset: "cloudy", icon: "partly-moon" });
});

test("every WMO code lands in the right preset group", () => {
  const groups = {
    clear: [0, 1],
    cloudy: [2, 3, 45, 48],
    rain: [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99],
    snow: [71, 73, 75, 77, 85, 86],
  };
  for (const [preset, codes] of Object.entries(groups)) {
    for (const code of codes) {
      for (const isDay of [true, false]) {
        const c = describeWeather(code, isDay);
        assert.equal(c.preset, preset, `code ${code}`);
        assert.ok(c.label.length > 0 && c.label !== "Unknown conditions", `code ${code} has a name`);
        assert.notEqual(c.icon, "unknown", `code ${code} has an icon`);
      }
    }
  }
});

test("labels and icons are accurate for each kind of weather", () => {
  const cases = [
    [3, "Overcast", "cloud"],
    [45, "Fog", "fog"],
    [48, "Freezing fog", "fog"],
    [53, "Drizzle", "drizzle"],
    [57, "Freezing drizzle", "freezing-rain"],
    [63, "Rain", "rain"],
    [67, "Freezing rain", "freezing-rain"],
    [81, "Rain showers", "rain"],
    [73, "Snow", "snow"],
    [77, "Snow grains", "snow"],
    [85, "Snow showers", "snow"],
    [95, "Thunderstorm", "thunder"],
    [96, "Thunderstorm with hail", "thunder"],
  ];
  for (const [code, label, icon] of cases) {
    assert.deepEqual(describeWeather(code, true), { label, preset: describeWeather(code, true).preset, icon }, `code ${code}`);
    assert.equal(describeWeather(code, false).label, label, `code ${code} at night`);
  }
});

test("codes the table doesn't name are unknown and neutral, never guessed", () => {
  for (const code of [4, 10, 44, 50, 70, 90, 98, 99.5, -1, 1000, Number.NaN]) {
    assert.deepEqual(describeWeather(code, true), { label: "Unknown conditions", preset: "neutral", icon: "unknown" }, `code ${code}`);
  }
  // Prototype keys aren't codes
  assert.equal(describeWeather(/** @type {any} */ ("constructor"), true).preset, "neutral");
});

test("snow comes only from the code, never from the temperature", () => {
  const cold = { ...sample(), current: { ...sample().current, temperature_2m: -25, weather_code: 61 } };
  const r = parseForecast(cold, FETCHED, TZ);
  assert.equal(describeWeather(r.weatherCode, r.isDay).preset, "rain");
  const warm = { ...sample(), current: { ...sample().current, temperature_2m: 8, weather_code: 73 } };
  const w = parseForecast(warm, FETCHED, TZ);
  assert.equal(describeWeather(w.weatherCode, w.isDay).preset, "snow");
});

test("a reading is fresh for 45 minutes, stale until 3 hours, then unusable", () => {
  const r = parseForecast(sample(), FETCHED, TZ);
  const at = (seconds) => (r.observedAt + seconds) * 1000;
  assert.equal(STALE_AFTER_SECONDS, 45 * 60);
  assert.equal(UNUSABLE_AFTER_SECONDS, 3 * 3600);
  assert.equal(readingAge(r, at(0)), "fresh");
  assert.equal(readingAge(r, at(30 * 60)), "fresh"); // a normal reading: 15-minute interval + 15-minute cache
  assert.equal(readingAge(r, at(45 * 60)), "fresh");
  assert.equal(readingAge(r, at(45 * 60 + 1)), "stale");
  assert.equal(readingAge(r, at(3 * 3600)), "stale");
  assert.equal(readingAge(r, at(3 * 3600 + 1)), "unusable");
});
