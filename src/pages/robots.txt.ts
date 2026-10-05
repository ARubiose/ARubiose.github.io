import type { APIRoute } from "astro";
import { requireSite, robotsTxt } from "@lib/seo";

export const GET: APIRoute = ({ site }) =>
    new Response(robotsTxt(requireSite(site)), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
