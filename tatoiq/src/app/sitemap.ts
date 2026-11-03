import type { MetadataRoute } from "next";

const SITE_URL = "https://web-app---tato.web.app";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const marketingPages = ["", "/welcome", "/contact", "/privacy", "/terms", "/disclosures", "/disclaimer"];
  return marketingPages.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: path === "" ? 1 : 0.6,
  }));
}
