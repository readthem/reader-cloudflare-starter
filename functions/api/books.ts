// functions/api/books.ts
// List the signed-in user's books. Self-contained endpoint.

export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  try {
    // ---- read session cookie ----
    const sid = getCookie(request.headers.get('cookie') || '', 'sid');
    if (!sid) return text('Unauthorized', 401);

    // ---- look up user by session ----
    const user = await env.DB
      .prepare(
        `SELECT u.id, u.email
           FROM sessions s
           JOIN users u ON u.id = s.user_id
          WHERE s.id = ?1
          LIMIT 1`
      )
      .bind(sid)
      .first<{ id: string; email: string }>();

    if (!user) return text('Unauthorized', 401);

    // ---- fetch books for user ----
    const { results } = await env.DB
      .prepare(
        `SELECT
            id,
            title,
            type,
            r2_key    AS r2Key,
            created_at AS createdAt
         FROM books
         WHERE user_id = ?1
         ORDER BY created_at DESC, id DESC`
      )
      .bind(user.id)
      .all();

    return json({ items: results ?? [] });
  } catch (err: any) {
    return json({ items: [], error: String(err?.message ?? err) }, 500);
  }
};

// ---------- helpers ----------
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
function text(msg: string, status = 200) {
  return new Response(msg, { status, headers: { 'content-type': 'text/plain' } });
}
function getCookie(cookieHeader: string, name: string) {
  const m = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}
