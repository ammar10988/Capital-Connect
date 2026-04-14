const HEALTH_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: HEALTH_CORS_HEADERS,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: HEALTH_CORS_HEADERS,
    });
  }

  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  const version =
    Deno.env.get("APP_VERSION") ??
    Deno.env.get("VERSION") ??
    Deno.env.get("GIT_COMMIT_SHA") ??
    "unknown";

  return json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version,
  });
});
