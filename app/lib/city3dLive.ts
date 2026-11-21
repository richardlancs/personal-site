// Whether the 3D city (/city) is open to visitors. Open: the "3D city" key
// and links show where WebGL2 exists, and /city serves the city. To close
// it again without a code change, build with NEXT_PUBLIC_CITY3D=off (set
// it for Production in Vercel and redeploy): the key and links go and
// /city addresses go back to the 2D page (next.config.ts makes the same test).
export const CITY3D_LIVE = process.env.NEXT_PUBLIC_CITY3D !== "off";
