// functions/api/auth/request-link.ts
// Creates a session and returns the magic-link URL in JSON.
// No email is required; we always return the link so you can click it.

type UserRow = { id: string } | null;

interface Bindings {
  DB: D1Database;
  APP_ORIGIN?: string;
}

function appOrigin(req: Request, env: Bindings) {
  const u = new URL(req.url);
  return (env.APP_ORIGIN || `${u.protocol}//${u.host}`).replace(/\/+$/, "");
}

export const onRequestPost: PagesFunction<Bindings> = async ({ request, env }) => {
  try {
    const { email } = await request.json().catch(() => ({} as any));
    const addr = (email || "").trim().toLowerCase();
    if (!addr || !addr.includes("@")) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_email" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // 1) upsert user
    let row = (await env.DB.prepare("SELECT id FROM users WHERE email = ?")
      .bind(addr)
      .first<UserRow>()) as UserRow;

    let userId = row?.id;
    if (!userId) {
      userId = crypto.randomUUID();
      await env.DB.prepare("INSERT OR IGNORE INTO users (id, email) VALUES (?, ?)")
        .bind(userId, addr)
        .run();
    }

    // 2) create session; 1-day expiry (seconds)
    const sid = crypto.randomUUID();
    const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
    await env.DB.prepare(
      "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)"
    )
      .bind(sid, userId, expires)
      .run();

    // 3) return link (always)
    const origin = appOrigin(request, env);
    const link = `${origin}/api/auth/exchange?t=${encodeURIComponent(sid)}`;

    return new Response(JSON.stringify({ ok: true, link }), {
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: "server_error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};
