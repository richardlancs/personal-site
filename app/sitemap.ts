import type { MetadataRoute } from "next";
import { siteUrl } from "./sections/registry";

// The site is one page (every section is an anchor on it), so the sitemap
// is that page. No lastModified: the page is static, and a date that
// isn't true is worse than none.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: siteUrl, changeFrequency: "monthly", priority: 1 }];
}
