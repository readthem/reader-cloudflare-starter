// functions/api/books.ts
import type { Env } from '../_lib/env';
import { json, unauthorized } from '../_lib/responses';
import { requireUser } from '../_lib/auth';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();

  const res = await env.DB.prepare(
    `SELECT
        id,
        title,
        author,
        type,
        r2_key   AS r2Key,
        created_at AS createdAt
     FROM books
     WHERE user_id = ?
     ORDER BY created_at DESC`
  ).bind(user.id).all();

  return json({ items: res.results ?? [] });
};
