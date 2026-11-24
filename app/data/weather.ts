// Where the weather and the clock in the corner are for: always Waterloo,
// Ontario, wherever the visitor is (no geolocation is ever asked for).
// The sky's sunrise and sunset (lib/time.ts, lib/platePreload.ts) follow
// these same coordinates.
//
// Coordinates verified once with Open-Meteo's geocoding API
// (https://geocoding-api.open-meteo.com/v1/search?name=Waterloo&country=CA):
// GeoNames 6176823, "Waterloo, Ontario, CA", America/Toronto,
// elevation 325 m. Checked 24 November 2026.
export const waterloo = {
  name: "Waterloo",
  region: "Ontario",
  latitude: 43.4668,
  longitude: -80.51639,
  timeZone: "America/Toronto",
  geonamesId: 6176823,
} as const;

// The old name, still read by app/layout.tsx (the head script's sun) and
// pinned by tests/city-band.test.mjs; the same place. Remove once those
// say `waterloo`.
export const richmondHill = waterloo;

// The data comes from Open-Meteo (free, no key; CC BY 4.0). Attribution
// is in each page's footer (components/ui/Colophon.tsx).
export const weatherProvider = {
  name: "Open-Meteo",
  url: "https://open-meteo.com/",
  licence: "CC BY 4.0",
  licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
  forecastEndpoint: "https://api.open-meteo.com/v1/forecast",
} as const;

// How long the server keeps a reading before asking again (Open-Meteo
// updates current conditions every 15 minutes)
export const WEATHER_CACHE_SECONDS = 15 * 60;
