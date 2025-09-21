// functions/api/auth/exchange.ts
// Validates the token, sets cookie with Domain=<project>.pages.dev (or custom domain),
// then meta-refreshes to that same domain's "/".

type SessRow = { user_id: string; expires_at?: number | null } | null;

interface Bindings {
  DB: D1Database;
}

function stableCookieDomain(hostname: string) {
  const parts = hostname.split(".");
  if (parts.length >= 3 && parts.slice(-2).join(".") === "pages.dev") {
    return parts.slice(-3).join("."); // "project.pages.dev"
  }
  return hostname; // custom domain
}

function cookieHeader(sessionId: string, domain: string) {
  const maxAge = 60 * 60 * 24 * 30; // 30 days
  return [
    `sid=${encodeURIComponent(sessionId)}`,
    `Domain=${domain}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ].join("; ");
}

export const onRequestGet: PagesFunction<Bindings> = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const sid = (url.searchParams.get("t") || "").trim();
    if (!sid) return new Response("Missing token", { status: 400 });

    const row = (await env.DB.prepare(
      "SELECT user_id, expires_at FROM sessions WHERE id = ?"
    )
      .bind(sid)
      .first<SessRow>()) as SessRow;

    if (!row) return new Response("Invalid token", { status: 401 });
    if (row.expires_at != null) {
      const now = Math.floor(Date.now() / 1000);
      if (Number(row.expires_at) < now) return new Response("Invalid token", { status: 401 });
    }

    const { protocol, hostname } = url;
    const domain = stableCookieDomain(hostname);
    const cookie = cookieHeader(sid, domain);
    const home = `${protocol}//${domain}/`;

    const html = `<!doctype html>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=${home}">
<title>Signing you in…</title>
<p>Signing you in… If this page doesn’t redirect automatically,
<a href="${home}">continue</a>.</p>`;

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Set-Cookie": cookie,
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return new Response("Server error", { status: 500 });
  }
};
