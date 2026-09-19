/**
 * The one Worker that serves everything: the static site, the CMS API, and
 * the admin panel. Request order is the contract:
 *
 *   1. redirects  — real 301s, checked before anything can shadow them
 *   2. /_api/*    — the CMS (auth, content, forms, media proxy); /api/* still answers
 *   3. /admin/*   — the admin SPA from dist/admin, with an index fallback
 *   4. assets     — the built site from dist/
 *
 * Static assets that exist are served by the platform BEFORE this script
 * runs (that's free and fast); the script only sees paths with no matching
 * file — which is exactly where the API, redirects, the admin SPA fallback
 * and the 404 page live.
 */
import { createCmsWorker, createRedirects } from "@stelstone/worker";
import config from "../cms.config.mjs";
import redirectMap from "./redirects.json";
import repoInfo from "./repo.json";

// Content-repo coordinates, in precedence order: an explicit value in
// cms.config wins; otherwise the build-time auto-detection from the git
// remote (repo.json); the GITHUB_REPO variable can still override both at
// request time (see @stelstone/server adapter options).
const content = { ...config.content };
if ((!content.owner || content.owner.startsWith("REPLACE")) && repoInfo.owner) content.owner = repoInfo.owner;
if ((!content.repo || content.repo.startsWith("REPLACE")) && repoInfo.repo) content.repo = repoInfo.repo;

const cms = createCmsWorker({ ...config, content });
const redirect = createRedirects(redirectMap);

export default {
  async fetch(request, env, ctx) {
    const hit = redirect(request);
    if (hit) return hit;

    const url = new URL(request.url);
    const { pathname } = url;

    // The admin SPA loads its bundle with relative paths, so the slashless
    // address resolves them against the wrong base and renders blank.
    if (pathname === "/admin") return Response.redirect(`${url.origin}/admin/`, 301);

    // The admin calls /_api/*; /api/* is the older address and still answers.
    if (pathname.startsWith("/_api/") || pathname.startsWith("/api/") || pathname.startsWith("/admin/oauth/")) {
      return cms.fetch(request, env, ctx);
    }

    if (pathname.startsWith("/admin/")) {
      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) return asset;
      // Client-routed admin paths have no file — the SPA's index answers.
      return env.ASSETS.fetch(new URL("/admin/index.html", url.origin));
    }

    // No file matched: serve the site's 404 page, with a 404 status.
    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404) return asset;
    const notFound = await env.ASSETS.fetch(new URL("/404.html", url.origin));
    return new Response(notFound.body, { status: 404, headers: notFound.headers });
  },

  async scheduled(event, env, ctx) {
    return cms.scheduled(event, env, ctx);
  },
};
