/**
 * SubTracker — Cloudflare Worker: Gemini API Proxy
 *
 * Deploy steps:
 *   1. wrangler deploy
 *   2. wrangler secret put GEMINI_API_KEY   → paste your key when prompted
 */

const ALLOWED_ORIGIN = "https://prashant300.github.io";
const GEMINI_URL     = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return corsResponse(null, 204, origin);
    }

    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/v1/messages") {
      return corsResponse(JSON.stringify({ error: "Not found" }), 404, origin);
    }

    if (origin && origin !== ALLOWED_ORIGIN && !origin.startsWith("http://localhost")) {
      return corsResponse(JSON.stringify({ error: "Forbidden origin" }), 403, origin);
    }

    if (!env.GEMINI_API_KEY) {
      return corsResponse(JSON.stringify({ error: "GEMINI_API_KEY secret not configured" }), 500, origin);
    }

    let body;
    try {
      body = await request.text();
    } catch {
      return corsResponse(JSON.stringify({ error: "Bad request body" }), 400, origin);
    }

    const upstream = await fetch(`${GEMINI_URL}?key=${env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const upstreamText = await upstream.text();
    return corsResponse(upstreamText, upstream.status, origin, upstream.headers.get("Content-Type"));
  },
};

function corsResponse(body, status, origin, contentType = "application/json") {
  const allowedOrigin = (origin === ALLOWED_ORIGIN || origin?.startsWith("http://localhost"))
    ? origin
    : ALLOWED_ORIGIN;

  return new Response(body, {
    status,
    headers: {
      "Access-Control-Allow-Origin":  allowedOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": contentType || "application/json",
    },
  });
}
