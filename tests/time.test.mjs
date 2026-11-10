// Richmond Hill's clock and daylight (app/lib/time.ts): local time and
// date through daylight-saving changes and midnights, the astronomical
// sun, and the daylight phases around sunrise and sunset.
import assert from "node:assert/strict";
import { test } from "node:test";
import { richmondHill } from "../app/data/weather.ts";
import { addDays, daylightAt, isDaytime, localDate, localTime, richmondHillClock, solarSun, sunOn, TWILIGHT_SECONDS } from "../app/lib/time.ts";
import { parseForecast } from "../app/lib/weather.ts";

const TZ = richmondHill.timeZone;
const { latitude, longitude } = richmondHill;
const at = (iso) => Date.parse(iso);
const MIN = 60;

// Open-Meteo's sunrise and sunset for Richmond Hill, 9–12 November 2026
// (the same response as tests/weather.test.mjs)
const openMeteoSun = {
  "2026-11-09": { sunrise: 1794225881, sunset: 1794261482 },
  "2026-11-10": { sunrise: 1794312361, sunset: 1794347814 },
  "2026-11-11": { sunrise: 1794398841, sunset: 1794434147 },
  "2026-11-12": { sunrise: 1794485320, sunset: 1794520483 },
};

test("local time reads like a clock: h:mm AM/PM, no leading zero", () => {
  assert.equal(localTime(at("2026-11-10T05:00:00Z"), TZ), "12:00 AM");
  assert.equal(localTime(at("2026-11-10T05:07:00Z"), TZ), "12:07 AM");
  assert.equal(localTime(at("2026-11-10T14:05:00Z"), TZ), "9:05 AM");
  assert.equal(localTime(at("2026-11-10T17:00:00Z"), TZ), "12:00 PM");
  assert.equal(localTime(at("2026-11-10T20:07:59Z"), TZ), "3:07 PM");
  assert.equal(localTime(at("2026-11-11T04:59:00Z"), TZ), "11:59 PM");
  assert.match(localTime(Date.now(), TZ), /^(1[0-2]|[1-9]):[0-5]\d (AM|PM)$/);
});

test("spring forward (8 March 2026): 1:59 AM is followed by 3:00 AM", () => {
  assert.equal(localTime(at("2026-03-08T06:59:00Z"), TZ), "1:59 AM"); // EST, UTC−5
  assert.equal(localTime(at("2026-03-08T07:00:00Z"), TZ), "3:00 AM"); // EDT, UTC−4
  assert.equal(localTime(at("2026-03-08T17:00:00Z"), TZ), "1:00 PM");
  // The day is 23 hours long: its midnights are 05:00 and 04:00 UTC
  assert.equal(localDate(at("2026-03-08T04:59:00Z"), TZ), "2026-03-07");
  assert.equal(localDate(at("2026-03-08T05:00:00Z"), TZ), "2026-03-08");
  assert.equal(localDate(at("2026-03-09T03:59:00Z"), TZ), "2026-03-08");
  assert.equal(localDate(at("2026-03-09T04:00:00Z"), TZ), "2026-03-09");
});

test("fall back (1 November 2026): 1 AM happens twice", () => {
  assert.equal(localTime(at("2026-11-01T05:30:00Z"), TZ), "1:30 AM"); // EDT
  assert.equal(localTime(at("2026-11-01T05:59:00Z"), TZ), "1:59 AM");
  assert.equal(localTime(at("2026-11-01T06:00:00Z"), TZ), "1:00 AM"); // EST
  assert.equal(localTime(at("2026-11-01T06:30:00Z"), TZ), "1:30 AM");
  assert.equal(localTime(at("2026-11-01T07:00:00Z"), TZ), "2:00 AM");
  // The day is 25 hours long: its midnights are 04:00 and 05:00 UTC
  assert.equal(localDate(at("2026-11-01T03:59:00Z"), TZ), "2026-10-31");
  assert.equal(localDate(at("2026-11-01T04:00:00Z"), TZ), "2026-11-01");
  assert.equal(localDate(at("2026-11-02T04:59:00Z"), TZ), "2026-11-01");
  assert.equal(localDate(at("2026-11-02T05:00:00Z"), TZ), "2026-11-02");
});

test("the date changes at Richmond Hill's midnight, not UTC's", () => {
  // UTC midnight is still the evening before in Toronto
  assert.equal(localDate(at("2026-11-10T00:00:00Z"), TZ), "2026-11-09");
  assert.equal(localTime(at("2026-11-10T00:00:00Z"), TZ), "7:00 PM");
  assert.equal(localDate(at("2026-11-10T04:59:59Z"), TZ), "2026-11-09");
  assert.equal(localDate(at("2026-11-10T05:00:00Z"), TZ), "2026-11-10");
  // In summer, an hour earlier in UTC
  assert.equal(localDate(at("2026-07-01T03:59:59Z"), TZ), "2026-06-30");
  assert.equal(localDate(at("2026-07-01T04:00:00Z"), TZ), "2026-07-01");
  // New Year's Eve
  assert.equal(localDate(at("2027-01-01T04:59:00Z"), TZ), "2026-12-31");
  assert.equal(localDate(at("2027-01-01T05:00:00Z"), TZ), "2027-01-01");
});

test("calendar arithmetic crosses months, years and leap days", () => {
  assert.equal(addDays("2026-11-10", 1), "2026-11-11");
  assert.equal(addDays("2026-11-30", 1), "2026-12-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2027-01-01", -1), "2026-12-31");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2026-03-08", 1), "2026-03-09"); // a 23-hour day is still one day
});

test("the astronomical sun is within three minutes of Open-Meteo's", () => {
  for (const [date, real] of Object.entries(openMeteoSun)) {
    const s = solarSun(date, latitude, longitude);
    assert.ok(Math.abs(s.sunrise - real.sunrise) < 3 * MIN, `${date} sunrise off by ${s.sunrise - real.sunrise} s`);
    assert.ok(Math.abs(s.sunset - real.sunset) < 3 * MIN, `${date} sunset off by ${s.sunset - real.sunset} s`);
  }
});

test("the astronomical sun follows the seasons and daylight saving on the local clock", () => {
  // Midsummer in the Toronto area: sunrise about 5:35 AM, sunset about 9:03 PM (EDT)
  const june = solarSun("2026-06-21", latitude, longitude);
  assert.match(localTime(june.sunrise * 1000, TZ), /^5:[34]\d AM$/);
  assert.match(localTime(june.sunset * 1000, TZ), /^(8:5\d|9:0\d) PM$/);
  assert.ok(june.sunset - june.sunrise > 15 * 3600);
  // Across spring forward the sun barely moves, but the clock jumps an hour
  const sat = solarSun("2026-03-07", latitude, longitude);
  const sun = solarSun("2026-03-08", latitude, longitude);
  assert.ok(Math.abs(sun.sunrise - sat.sunrise - 86400) < 3 * MIN);
  assert.equal(localTime(sat.sunrise * 1000, TZ).startsWith("6:"), true);
  assert.equal(localTime(sun.sunrise * 1000, TZ).startsWith("7:"), true);
  // Each sunrise and sunset falls on its own local date
  for (const date of ["2026-01-01", "2026-03-08", "2026-06-21", "2026-11-01", "2026-12-21"]) {
    const s = solarSun(date, latitude, longitude);
    assert.equal(localDate(s.sunrise * 1000, TZ), date);
    assert.equal(localDate(s.sunset * 1000, TZ), date);
  }
});

test("daylight phases around sunrise and sunset", () => {
  const today = openMeteoSun["2026-11-10"];
  const { sunrise, sunset } = today;
  const phase = (t) => daylightAt(t, today, openMeteoSun["2026-11-09"].sunset, openMeteoSun["2026-11-11"].sunrise);
  assert.equal(TWILIGHT_SECONDS, 40 * MIN);

  assert.equal(phase(sunrise - 41 * MIN).phase, "night");
  assert.deepEqual(phase(sunrise - 40 * MIN), { phase: "dawn", progress: 0 });
  assert.deepEqual(phase(sunrise), { phase: "dawn", progress: 0.5 });
  assert.deepEqual(phase(sunrise + 20 * MIN), { phase: "dawn", progress: 0.75 });
  assert.deepEqual(phase(sunrise + 40 * MIN), { phase: "day", progress: 0 });
  const noon = phase((sunrise + sunset) / 2);
  assert.equal(noon.phase, "day");
  assert.ok(Math.abs(noon.progress - 0.5) < 1e-9);
  assert.deepEqual(phase(sunset - 40 * MIN), { phase: "dusk", progress: 0 });
  assert.deepEqual(phase(sunset), { phase: "dusk", progress: 0.5 });
  assert.deepEqual(phase(sunset + 40 * MIN), { phase: "night", progress: 0 });

  // The night runs from the end of one dusk to the start of the next dawn
  const evening = phase(sunset + 3 * 3600);
  assert.equal(evening.phase, "night");
  assert.ok(evening.progress > 0 && evening.progress < 0.5);
  const beforeDawn = phase(sunrise - 50 * MIN);
  assert.equal(beforeDawn.phase, "night");
  assert.ok(beforeDawn.progress > 0.95 && beforeDawn.progress < 1);
  // Progress always stays within 0..1
  for (let t = sunrise - 86400; t < sunset + 86400; t += 7 * MIN) {
    const p = phase(t).progress;
    assert.ok(p >= 0 && p <= 1, `progress ${p} at ${t}`);
  }
});

test("the clock takes the day's sun from the reading, or from astronomy without one", () => {
  const body = {
    current: { time: 1794302100, temperature_2m: 4.9, weather_code: 3, cloud_cover: 100, is_day: 0 },
    daily: {
      time: [1794200400, 1794286800, 1794373200, 1794459600],
      sunrise: Object.values(openMeteoSun).map((s) => s.sunrise),
      sunset: Object.values(openMeteoSun).map((s) => s.sunset),
    },
  };
  const reading = parseForecast(body, 1794302400, TZ);
  const noonish = at("2026-11-10T17:30:00Z");

  const live = richmondHillClock(noonish, reading, richmondHill);
  assert.equal(live.time, "12:30 PM");
  assert.equal(live.date, "2026-11-10");
  assert.equal(live.daylight.phase, "day");
  assert.equal(live.daylight.sunrise, openMeteoSun["2026-11-10"].sunrise);
  assert.equal(live.daylight.sunset, openMeteoSun["2026-11-10"].sunset);

  const astro = richmondHillClock(noonish, null, richmondHill);
  assert.equal(astro.daylight.phase, "day");
  assert.deepEqual({ sunrise: astro.daylight.sunrise, sunset: astro.daylight.sunset }, solarSun("2026-11-10", latitude, longitude));

  // Past Richmond Hill's midnight the next day's sun comes from the reading
  // (it was fetched the day before) ...
  const after = richmondHillClock(at("2026-11-11T05:01:00Z"), reading, richmondHill);
  assert.equal(after.date, "2026-11-11");
  assert.equal(after.time, "12:01 AM");
  assert.equal(after.daylight.phase, "night");
  assert.equal(after.daylight.sunrise, openMeteoSun["2026-11-11"].sunrise);
  // ... and a date the reading doesn't cover falls back to astronomy
  assert.deepEqual(sunOn("2026-11-20", reading, latitude, longitude), solarSun("2026-11-20", latitude, longitude));
});

test("Sunny or Clear follows Richmond Hill's sun, not the reading's is_day", () => {
  // 10 November 2026: sunrise 7:06 AM, sunset 4:56 PM EST
  const sun = { sunrise: 1794312361, sunset: 1794347814 };
  const at = (h, m) => Date.UTC(2026, 10, 10, h + 5, m) / 1000; // EST is UTC-5
  assert.equal(isDaytime(at(17, 20), sun, true), false, "5:20 PM is after sunset, whatever is_day said");
  assert.equal(isDaytime(at(7, 25), sun, false), true, "7:25 AM is after sunrise");
  assert.equal(isDaytime(at(12, 0), sun, false), true);
  assert.equal(isDaytime(at(3, 0), sun, true), false);
  assert.equal(isDaytime(at(12, 0), { sunrise: 0, sunset: 0 }, false), false, "unknown sun: the reading decides");
});
