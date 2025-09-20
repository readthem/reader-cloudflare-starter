import type { Env } from '../../_lib/env';
import { json, unauthorized } from '../../_lib/responses';
import { requireUser } from '../../_lib/auth';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();
  const rows = await env.DB.prepare('SELECT id, title, author, r2_key, type, created_at FROM books WHERE user_id = ? ORDER BY created_at DESC')
    .bind(user.id).all();
  const items = (rows.results || []).map((r: any) => ({
    id: r.id, title: r.title, author: r.author, r2_key: r.r2_key, type: r.type, created_at: r.created_at
  }));
  return json({ items });
};
