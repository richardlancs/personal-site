// The home band's painting, fetched and shown while the HTML is still
// parsing.
//
// The bands mount their plates only after hydration (DistrictBand.tsx),
// because which plate shows depends on Richmond Hill's clock. That made
// the home plate, the page's largest paint, wait for the scripts. This
// tiny script, inline in <head> (layout.tsx), works out whether it is day
// or night in Richmond Hill (at twilight, the side of sunrise or sunset
// it's on: the plate the blend is closer to), picks that plate's file from
// the band's own srcset the way the browser would for the band's sizes
// (the smallest candidate at least as wide as the band's drawn width in
// device pixels, at most 1.5x on phones), preloads exactly that file, and sets it on <html> as
// --home-plate (with data-home-plate="day|night"). city.css paints it as
// the home band's background before any script of the page has run, and
// the band's <img> for that plate later asks for the very same URL
// (homePlate.ts), so it fades in over an identical picture from the cache.
//
// A deep link (/#projects, …) lands below the home band, and any other
// page (/city/…) has no home band, so then it does nothing. Its only inputs are the clock, the window's width, the device
// pixel ratio and the address's hash, tested for presence: the URLs and
// numbers in it are fixed at build time.

// solarSun (lib/time.ts) as plain JS for the inline script: sunrise and
// sunset, in seconds since the epoch, for a local date. tests/city-band
// checks it agrees with solarSun to the second.
export const SUN_JS =
  "function(y,m,d,lat,lon){var R=Math.PI/180,t=Date.UTC(y,m-1,d)/1e3,n=Math.round((t-Date.UTC(y,0,1)/1e3)/86400)+1," +
  "N=(y%4===0&&y%100!==0)||y%400===0?366:365,g=2*Math.PI/N*(n-1+(12-lon/15-12)/24)," +
  "e=229.18*(0.000075+0.001868*Math.cos(g)-0.032077*Math.sin(g)-0.014615*Math.cos(2*g)-0.040849*Math.sin(2*g))," +
  "c=0.006918-0.399912*Math.cos(g)+0.070257*Math.sin(g)-0.006758*Math.cos(2*g)+0.000907*Math.sin(2*g)-0.002697*Math.cos(3*g)+0.00148*Math.sin(3*g)," +
  "a=Math.acos(Math.min(1,Math.max(-1,Math.cos(90.833*R)/(Math.cos(lat*R)*Math.cos(c))-Math.tan(lat*R)*Math.tan(c))))/R;" +
  "return[Math.round(t+(720-4*(lon+a)-e)*60),Math.round(t+(720-4*(lon-a)-e)*60)]}";

// On phones the first paint asks for a plate no denser than 1.5 device
// pixels per CSS pixel: a painting at 1.5x is still sharp, and the file is
// half the 1.75x one, which is what kept the largest paint over 2.5 s on a
// slow phone. (Wider screens get the band's full density.)
export const PHONE_MAX_DPR = 1.5;

type Place = { latitude: number; longitude: number; timeZone: string };

/** The band's drawn width as a multiple of the window's, on phones and on wider screens (plates.ts) */
export type BandWidth = { phoneMax: number; phoneScale: number };

export function platePreloadScript(place: Place, day: string, night: string, band: BandWidth): string {
  const q = JSON.stringify;
  return (
    `(function(){try{var h=location.hash;if(location.pathname!=="/"||h&&h!=="#"&&h!=="#home")return;var sun=${SUN_JS};` +
    `var p=new Intl.DateTimeFormat("en-CA",{timeZone:${q(place.timeZone)},year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()),v={};` +
    `p.forEach(function(x){v[x.type]=+x.value});` +
    `var s=sun(v.year,v.month,v.day,${place.latitude},${place.longitude}),now=Date.now()/1e3,` +
    `plate=now>=s[0]&&now<s[1]?"day":"night",set=plate==="day"?${q(day)}:${q(night)},` +
    `vw=window.innerWidth,ph=vw<=${band.phoneMax},dpr=window.devicePixelRatio||1,need=vw*(ph?${band.phoneScale}:1)*(ph?Math.min(dpr,${PHONE_MAX_DPR}):dpr),url=null,last=null;` +
    `set.split(", ").forEach(function(c){var x=c.split(" "),w=parseInt(x[1],10);if(!url&&w>=need)url=x[0];if(w)last=x[0]});` +
    `url=url||last;if(!url)return;` +
    `var l=document.createElement("link");l.rel="preload";l.as="image";l.href=url;l.setAttribute("fetchpriority","high");document.head.appendChild(l);` +
    `var r=document.documentElement;r.style.setProperty("--home-plate",'url("'+url+'")');r.setAttribute("data-home-plate",plate)}catch(e){}})()`
  );
}

// The same for a 3D city page (/city, /city/<section>, CityPage.tsx): its
// band's painting, there before the scripts, which were what held the
// page's largest paint back (about 5 s on Lighthouse's slow phone, the
// band's <img> mounting only after hydration). Inline right after the
// band, it picks the plate (day or night in Richmond Hill, as above) and
// the file the band's <img> will itself ask for (its srcset, at the
// band's "100vw", plates.ts: BELOW_SIZES; the smallest candidate at least
// as wide as the window in device pixels, as the browser picks it),
// preloads it and sets it as --city-plate in a rule of its own that
// holds only on this page's band (a <style> it adds to <head>, keyed by
// the page's data-section; city-pages.css paints it as the band's
// background), so a later page of the city, reached in the browser, never
// shows another's painting. It writes into nothing React renders (the
// band's style is React's: writing there made every city page hydrate
// with a mismatch). Its only inputs are the clock, the window's width and
// the pixel ratio.
export function cityPlateScript(place: Place, day: string, night: string, section: string): string {
  const q = JSON.stringify;
  const rule = `.city-page[data-section=${q(section)}] .city-band .band{--city-plate:url(`;
  return (
    `(function(){try{var sun=${SUN_JS};` +
    `var p=new Intl.DateTimeFormat("en-CA",{timeZone:${q(place.timeZone)},year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()),v={};` +
    `p.forEach(function(x){v[x.type]=+x.value});` +
    `var s=sun(v.year,v.month,v.day,${place.latitude},${place.longitude}),now=Date.now()/1e3,` +
    `set=now>=s[0]&&now<s[1]?${q(day)}:${q(night)},need=window.innerWidth*(window.devicePixelRatio||1),url=null,last=null;` +
    `set.split(", ").forEach(function(c){var x=c.split(" "),w=parseInt(x[1],10);if(!url&&w>=need)url=x[0];if(w)last=x[0]});` +
    `url=url||last;if(!url)return;` +
    `var l=document.createElement("link");l.rel="preload";l.as="image";l.href=url;l.setAttribute("fetchpriority","high");document.head.appendChild(l);` +
    `var t=document.createElement("style");t.textContent=${q(rule)}+'"'+url+'")}';document.head.appendChild(t)}catch(e){}})()`
  );
}
