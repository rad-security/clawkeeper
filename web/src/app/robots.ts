import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/hosts/", "/alerts/", "/activity/", "/settings/", "/upgrade/"],
      },
    ],
    sitemap: "https://clawkeeper.dev/sitemap.xml",
  };
}
