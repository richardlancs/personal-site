import type { MetadataRoute } from "next";
import { siteUrl } from "./sections/registry";

// Everything on the site may be crawled; the sitemap lists the sections
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
