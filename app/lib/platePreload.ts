// The home tile of the city's panorama, fetched and shown while the HTML
// is still parsing.
//
// The tiles mount their plates only after hydration (DistrictBand.tsx),
// because which plate shows depends on Richmond Hill's clock. That made
// the home tile, the page's largest paint, wait for the scripts. This tiny
// script, inline in <head> (layout.tsx), works out whether it is day or
// night in Richmond Hill (at twilight, the side of sunrise or sunset it's
// on: the plate the blend is closer to), picks that plate's file from the
// tile's own srcset the way the browser would for the tile's sizes
// (homePlate.ts: tileSizes; the smallest candidate at least as wide as the
// tile's drawn width in device pixels, at most 1.5x on phones and tall
// screens), preloads exactly that file, and sets it on <html> as
// --home-plate (with data-home-plate="day|night"). city.css paints it as
// the home tile's background before any script of the page has run, and
// the tile's <img> for that plate later asks for the very same URL
// (homePlate.ts), so it fades in over an identical picture from the cache.
//
// Only on the journey (data-track="on", set just before by lib/track.ts:
// the stacked page has no home tile of its own), and not on a deep link
// (/#projects, …), which lands past it. Its only inputs are the clock, the
// window's size, the device pixel ratio, the journey's switch and the
// address's hash, tested for presence: the URLs and numbers in it are
// fixed at build time.

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

// On phones and tall screens the first paint asks for a plate no denser than 1.5 device
// pixels per CSS pixel: a painting at 1.5x is still sharp, and the file is
// half the 1.75x one, which is what kept the largest paint over 2.5 s on a
// slow phone. (Wider screens get the band's full density.)
export const PHONE_MAX_DPR = 1.5;

type Place = { latitude: number; longitude: number; timeZone: string };

/** The home tile's width over its height (panorama.ts): its drawn width is this times the stage's height, or on phones and tall screens the strip at its top (homePlate.ts: tileSizes) */
export function platePreloadScript(place: Place, day: string, night: string, ratio: number): string {
  const q = JSON.stringify;
  return (
    `(function(){try{var h=location.hash;if(location.pathname!=="/"||h&&h!=="#"&&h!=="#home"||document.documentElement.getAttribute("data-track")!=="on")return;var sun=${SUN_JS};` +
    `var p=new Intl.DateTimeFormat("en-CA",{timeZone:${q(place.timeZone)},year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()),v={};` +
    `p.forEach(function(x){v[x.type]=+x.value});` +
    `var s=sun(v.year,v.month,v.day,${place.latitude},${place.longitude}),now=Date.now()/1e3,` +
    `plate=now>=s[0]&&now<s[1]?"day":"night",set=plate==="day"?${q(day)}:${q(night)},` +
    `vh=window.innerHeight,ph=window.innerWidth<=vh,dpr=window.devicePixelRatio||1,need=${ratio}*(ph?0.3*vh+64:vh)*(ph?Math.min(dpr,${PHONE_MAX_DPR}):dpr),url=null,last=null;` +
    `set.split(", ").forEach(function(c){var x=c.split(" "),w=parseInt(x[1],10);if(!url&&w>=need)url=x[0];if(w)last=x[0]});` +
    `url=url||last;if(!url)return;` +
    `var l=document.createElement("link");l.rel="preload";l.as="image";l.href=url;l.setAttribute("fetchpriority","high");document.head.appendChild(l);` +
    `var r=document.documentElement;r.style.setProperty("--home-plate",'url("'+url+'")');r.setAttribute("data-home-plate",plate)}catch(e){}})()`
  );
}
