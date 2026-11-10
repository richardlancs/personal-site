import type { MetadataRoute } from "next";
import { listed, siteUrl } from "./sections/registry";

// Every listed section, from the registry (an unlisted one stays out, as
// it does from the menu and the map). No lastModified: the pages are
// static, and a date that isn't true is worse than none.
export default function sitemap(): MetadataRoute.Sitemap {
  return listed.map((s) => ({
    url: s.href === "/" ? siteUrl : `${siteUrl}${s.href}`,
    changeFrequency: "monthly",
    priority: s.href === "/" ? 1 : 0.8,
  }));
}
