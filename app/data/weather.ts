// Where the weather and the clock in the corner are for: always Richmond
// Hill, wherever the visitor is (no geolocation is ever asked for).
//
// Coordinates verified once with Open-Meteo's geocoding API
// (https://geocoding-api.open-meteo.com/v1/search?name=Richmond+Hill):
// GeoNames 6122091, "Richmond Hill, Ontario, CA", America/Toronto,
// elevation 232 m. Checked 10 November 2026.
export const richmondHill = {
  name: "Richmond Hill",
  region: "Ontario",
  latitude: 43.87111,
  longitude: -79.43725,
  timeZone: "America/Toronto",
  geonamesId: 6122091,
} as const;

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
