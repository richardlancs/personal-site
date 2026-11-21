// Whether the 3D city (/city) is open to visitors. Off on the live site
// for now: the "3D city" key and links aren't shown, and /city addresses
// go back to the 2D page (next.config.ts makes the same test). On in
// `next dev`, and in any build made with NEXT_PUBLIC_CITY3D=on (the audits
// and the smoke tests build that way). To open the city on the live site,
// make this `true`, and the copy in next.config.ts.
export const CITY3D_LIVE =
  process.env.NEXT_PUBLIC_CITY3D === "on" || (process.env.NEXT_PUBLIC_CITY3D !== "off" && process.env.NODE_ENV === "development");
