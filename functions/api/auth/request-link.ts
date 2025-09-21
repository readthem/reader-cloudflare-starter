// functions/api/auth/request-link.ts
// Creates a session row and returns a magic-link that points to the
// stable cookie domain (works for both preview and production hosts).

type UserRow = { id: string } | null;

interface Bindings {
  DB: D1Database;
}

function stableCookieDomain(hostname: string) {
  // Handles:
  //   - project.pages.dev           -> project.pages.dev
  //   - <hash>.project.pages.dev    -> project.pages.dev
  const parts = hostname.split(".");
  if (parts.length >= 3 && parts.slice(-2).join(".") === "pages.dev") {
    // project.pages.dev  OR  hash.project.pages.dev
    return parts.slice(-3).join("."); // "project.pages.dev"
  }
  // Custom domain? Use the custom host itself.
  return hostname;
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

    // Upsert user
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

    // Create session (24h)
    const sid = crypto.randomUUID();
    const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
    await env.DB.prepare(
      "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)"
    )
      .bind(sid, userId, expires)
      .run();

    // Build link on the stable cookie domain
    const { protocol, hostname } = new URL(request.url);
    const domain = stableCookieDomain(hostname);
    const origin = `${protocol}//${domain}`;
    const link = `${origin}/api/auth/exchange?t=${encodeURIComponent(sid)}`;

    return new Response(JSON.stringify({ ok: true, link }), {
      headers: { "content-type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "server_error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};
