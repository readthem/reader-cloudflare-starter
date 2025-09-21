// functions/api/books/index.ts
import type { Env } from '../../_lib/env';
import { json, unauthorized } from '../../_lib/responses';
import { requireUser } from '../../_lib/auth';

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();

  const res = await env.DB
    .prepare(`SELECT id, title, author, type, r2_key FROM books
              WHERE user_id = ? ORDER BY created_at DESC, id DESC`)
    .bind(user.id)
    .all<{ id: string; title: string | null; author: string | null; type: string; r2_key: string }>();

  const rows = res.results || [];
  return json({
    books: rows.map(r => ({
      id: r.id,
      title: r.title || '',
      author: r.author || '',
      type: (r.type === 'pdf' ? 'pdf' : 'epub') as 'pdf'|'epub',
      r2_key: r.r2_key
    }))
  });
};
