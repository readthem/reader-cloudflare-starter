// functions/api/books.ts
// Lists the signed-in user's books.

import type { Env } from '../_lib/env';
import { requireUser } from '../_lib/auth';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  // auth
  const user = await requireUser(request, env);
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Minimal, stable columns. created_at is TEXT (CURRENT_TIMESTAMP) so it sorts fine.
    const stmt = env.DB.prepare(
      `SELECT
         id,
         title,
         type,
         r2_key   AS r2Key,
         created_at AS createdAt
       FROM books
       WHERE user_id = ?1
       ORDER BY created_at DESC, id DESC`
    ).bind(user.id);

    const { results } = await stmt.all();

    return new Response(JSON.stringify({ items: results ?? [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err: any) {
    // Always return JSON so the UI can surface the message.
    return new Response(JSON.stringify({ items: [], error: String(err?.message ?? err) }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};
