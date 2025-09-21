// functions/api/books/open.ts
// Stream a user's book from R2 (inline) by id.

export const onRequestGet: PagesFunction<{ DB: D1Database; R2: R2Bucket }> = async ({
  request,
  env,
}) => {
  try {
    // ---- auth via session cookie ----
    const sid = cookie(request.headers.get('cookie') || '', 'sid');
    if (!sid) return txt('Unauthorized', 401);

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

    if (!user) return txt('Unauthorized', 401);

    // ---- get book row ----
    const id = new URL(request.url).searchParams.get('id') || '';
    if (!id) return txt('missing id', 400);

    const row = await env.DB
      .prepare(
        `SELECT title, type, r2_key
           FROM books
          WHERE id = ?1 AND user_id = ?2
          LIMIT 1`
      )
      .bind(id, user.id)
      .first<{ title: string | null; type: string; r2_key: string }>();

    if (!row) return txt('not found', 404);

    // ---- stream object from R2 ----
    const obj = await env.R2.get(row.r2_key);
    if (!obj || !obj.body) return txt('file missing', 404);

    const contentType =
      obj.httpMetadata?.contentType ||
      (row.type === 'pdf' ? 'application/pdf' : 'application/epub+zip');

    const filename = sanitizeFilename(`${(row.title || id).trim()}.${row.type}`);
    const headers = new Headers({
      'content-type': contentType,
      'content-length': String(obj.size ?? ''),
      etag: obj.etag || '',
      'cache-control': 'private, max-age=0, must-revalidate',
      // open in browser tab when possible
      'content-disposition': `inline; filename="${filename}"`,
    });

    return new Response(obj.body, { headers });
  } catch (e: any) {
    return txt(`error: ${e?.message || e}`, 500);
  }
};

// ------- helpers -------
function txt(msg: string, status = 200) {
  return new Response(msg, { status, headers: { 'content-type': 'text/plain' } });
}
function cookie(h: string, n: string) {
  const m = h.match(new RegExp(`(?:^|; )${n}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}
function sanitizeFilename(s: string) {
  // keep it simple & safe
  return s.replace(/[\\/:*?"<>|]/g, '_').slice(0, 200);
}
