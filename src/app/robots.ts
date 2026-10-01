import type { MetadataRoute } from "next";

import { robotsRules } from "@/lib/seo/sitemap";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return robotsRules(process.env, siteUrl());
}
