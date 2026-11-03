import type { MetadataRoute } from "next";

const SITE_URL = "https://web-app---tato.web.app";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The client workspace holds personal preparation state; keep it out of
        // search results even though the demo data is synthetic.
        disallow: ["/dashboard", "/return", "/documents", "/tasks", "/messages", "/status", "/settings", "/leads"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
