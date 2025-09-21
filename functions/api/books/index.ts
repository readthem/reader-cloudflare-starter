import type { Env } from '../../_lib/env';
import { json, unauthorized } from '../../_lib/responses';
import { requireUser } from '../../_lib/auth';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();

  const { results } = await env.DB.prepare(
    `SELECT b.id, b.title, b.author, b.r2_key, b.type,
            rp.percent
       FROM books b
  LEFT JOIN reading_progress rp
         ON rp.user_id = b.user_id AND rp.book_id = b.id
      WHERE b.user_id = ?`
  ).bind(user.id).all();

  return json(results || []);
};
