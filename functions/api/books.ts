// functions/api/books.ts
import type { Env } from '../_lib/env';
import { json, unauthorized } from '../_lib/responses';
import { requireUser } from '../_lib/auth';

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();

  const rows = await env.DB
    .prepare(`SELECT id, title, author, type, r2_key AS key
              FROM books
              WHERE user_id = ?
              ORDER BY created_at DESC`)
    .bind(user.id)
    .all<{ id: string; title: string; author: string | null; type: 'epub'|'pdf'; key: string }>();

  return json({ books: rows.results ?? [] });
};
