/**
 * SubTracker — Cloudflare Worker: Anthropic API Proxy
 *
 * Deploy steps:
 *   1. wrangler deploy  (or paste into Cloudflare dashboard)
 *   2. wrangler secret put ANTHROPIC_API_KEY   → paste your key when prompted
 *
 * The worker:
 *   - Accepts POST /v1/messages  from your GitHub Pages origin only
 *   - Forwards the request body to Anthropic with the secret key injected
 *   - Returns the Anthropic response with CORS headers
 *   - Handles OPTIONS pre-flight
 */

const ALLOWED_ORIGIN = "https://prashant300.github.io";
const ANTHROPIC_URL  = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VER  = "2023-06-01";

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    // — CORS pre-flight ────────────────────────────────────────────────────
    if (request.method === "OPTIONS") {
      return corsResponse(null, 204, origin);
    }

    // — Only accept POST /v1/messages ──────────────────────────────────────
    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/v1/messages") {
      return corsResponse(JSON.stringify({ error: "Not found" }), 404, origin);
    }

    // — Origin guard (relaxed in dev; tighten by removing the localhost check)
    if (origin && origin !== ALLOWED_ORIGIN && !origin.startsWith("http://localhost")) {
      return corsResponse(JSON.stringify({ error: "Forbidden origin" }), 403, origin);
    }

    // — Validate API key secret exists ─────────────────────────────────────
    if (!env.ANTHROPIC_API_KEY) {
      return corsResponse(
        JSON.stringify({ error: "ANTHROPIC_API_KEY secret not configured" }),
        500, origin
      );
    }

    // — Forward to Anthropic ───────────────────────────────────────────────
    let body;
    try {
      body = await request.text();
    } catch {
      return corsResponse(JSON.stringify({ error: "Bad request body" }), 400, origin);
    }

    const upstream = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         env.ANTHROPIC_API_KEY,
        "anthropic-version": ANTHROPIC_VER,
      },
      body,
    });

    const upstreamText = await upstream.text();
    return corsResponse(upstreamText, upstream.status, origin, upstream.headers.get("Content-Type"));
  },
};

// — Helper ──────────────────────────────────────────────────────────────────
function corsResponse(body, status, origin, contentType = "application/json") {
  const allowedOrigin = (origin === ALLOWED_ORIGIN || origin?.startsWith("http://localhost"))
    ? origin
    : ALLOWED_ORIGIN;

  const headers = {
    "Access-Control-Allow-Origin":  allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": contentType || "application/json",
  };

  return new Response(body, { status, headers });
}
