// functions/api/auth/exchange.ts
// Sets the session cookie on a 200 HTML response (most reliable for browsers)
// and redirects to "/" via meta-refresh.

type Row = { user_id: string; expires_at?: number | null };

interface Bindings {
  DB: D1Database;
  APP_ORIGIN?: string;
}

function homeFrom(req: Request, env: Bindings) {
  const u = new URL(req.url);
  const base = (env.APP_ORIGIN || `${u.protocol}//${u.host}`).replace(/\/+$/, "");
  return `${base}/`;
}

function cookieFor(sessionId: string) {
  // 30 days
  const maxAge = 60 * 60 * 24 * 30;
  return [
    `sid=${encodeURIComponent(sessionId)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ].join("; ");
}

async function validateSession(env: Bindings, sid: string) {
  const row = (await env.DB.prepare(
    "SELECT user_id, expires_at FROM sessions WHERE id = ?"
  )
    .bind(sid)
    .first<Row>()) as Row | null;

  if (!row) return { ok: false as const, reason: "invalid" };

  if (row.expires_at != null) {
    const now = Math.floor(Date.now() / 1000);
    if (Number(row.expires_at) < now) {
      return { ok: false as const, reason: "expired" };
    }
  }
  return { ok: true as const };
}

// We accept GET (links clicked in email) and POST (if you ever call via fetch)
export const onRequest: PagesFunction<Bindings> = async (ctx) => {
  try {
    const url = new URL(ctx.request.url);
    const sid = (url.searchParams.get("t") || "").trim();
    if (!sid) {
      return new Response("Missing token", { status: 400 });
    }

    const check = await validateSession(ctx.env, sid);
    if (!check.ok) {
      const msg = check.reason === "expired" ? "Token expired" : "Invalid token";
      return new Response(msg, { status: 401 });
    }

    const cookie = cookieFor(sid);
    const home = homeFrom(ctx.request, ctx.env);

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
  } catch (err) {
    return new Response("Server error", { status: 500 });
  }
};
