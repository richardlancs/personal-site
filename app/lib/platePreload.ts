// The home band's painting, asked for while the HTML is still parsing.
//
// The bands mount their plates only after hydration (DistrictBand.tsx),
// because which plate shows depends on Richmond Hill's clock. That made
// the home plate, the page's largest paint, wait for the scripts. This
// tiny script, inline in <head> (layout.tsx), works out whether it is
// plainly day or plainly night in Richmond Hill and preloads that plate
// with the exact srcset and sizes the band's <img> will use, so the
// browser picks the same file and the band finds it already there. Near
// sunrise or sunset (within 45 minutes: the twilight crossing is 40, and
// the live sun times can differ from these by a minute or two) it does
// nothing, rather than risk fetching the wrong plate.

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

// How far from sunrise or sunset the script stays out of it, in seconds
export const PRELOAD_MARGIN = 45 * 60;

type Place = { latitude: number; longitude: number; timeZone: string };

export function platePreloadScript(place: Place, day: string, night: string, sizes: string): string {
  const q = JSON.stringify;
  return (
    `(function(){try{var sun=${SUN_JS};` +
    `var p=new Intl.DateTimeFormat("en-CA",{timeZone:${q(place.timeZone)},year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()),v={};` +
    `p.forEach(function(x){v[x.type]=+x.value});` +
    `var s=sun(v.year,v.month,v.day,${place.latitude},${place.longitude}),now=Date.now()/1e3,M=${PRELOAD_MARGIN},set=null;` +
    `if(now>s[0]+M&&now<s[1]-M)set=${q(day)};else if(now<s[0]-M||now>s[1]+M)set=${q(night)};` +
    `if(!set)return;var l=document.createElement("link");l.rel="preload";l.as="image";` +
    `l.setAttribute("imagesrcset",set);l.setAttribute("imagesizes",${q(sizes)});l.setAttribute("fetchpriority","high");` +
    `document.head.appendChild(l)}catch(e){}})()`
  );
}
