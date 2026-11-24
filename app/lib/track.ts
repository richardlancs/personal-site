import { ROOM_EMS, TRACK_MIN } from "../components/city2d/trackMath.ts";

// The journey's switch, before the first paint (layout.tsx puts it in the
// page's <head>): on `/`, with scripts running and a screen of at least
// TRACK_MIN (its height also in the root's text size) leaving a panel
// ROOM_EMS of room (trackRoom, the same sum), <html data-track="on">, and city-track.css lays the stations
// side by side from the first frame. Without scripts there is no
// attribute, and the page reads top to bottom.
//
// The runway's height comes from CityTrack.tsx, once it has measured the
// stops (it then sets data-track-ready). If it never does (its script
// failed to load or run), the page couldn't scroll at all: so a few
// seconds after the page has loaded, with no data-track-ready, this falls
// back to the stacked page (data-track="fallback") for the visit.
export const TRACK_WAIT_MS = 3000;

export const TRACK_SCRIPT = `(function(){try{var r=document.documentElement;var f=16;try{f=parseFloat(getComputedStyle(r).fontSize)||16}catch(e){}if(location.pathname!=="/"||innerWidth<${TRACK_MIN.width}||innerHeight<Math.max(${TRACK_MIN.height},${TRACK_MIN.ems}*f))return;var w=innerWidth,h=innerHeight,m=w<=h?0.8*(h-3.5*f)-52-2.5*f:h<=500?h-5.5*f-52:h-8.25*f-52;if(m<${ROOM_EMS}*f)return;r.setAttribute("data-track","on");addEventListener("load",function(){setTimeout(function(){if(!r.hasAttribute("data-track-ready"))r.setAttribute("data-track","fallback")},${TRACK_WAIT_MS})})}catch(e){}})()`;
