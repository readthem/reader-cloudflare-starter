import type { Env } from '../../_lib/env';
import { json, badRequest, unauthorized } from '../../_lib/responses';
import { requireUser } from '../../_lib/auth';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();
  const url = new URL(request.url);
  const bookId = url.searchParams.get('bookId') || '';
  if (!bookId) return badRequest('bookId required');

  const row = await env.DB.prepare(
    `SELECT percent, cfi FROM reading_progress WHERE user_id=? AND book_id=?`
  ).bind(user.id, bookId).first();

  return json(row || {});
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();
  const { bookId, percent, cfi } = await request.json().catch(()=>({}));

  if (!bookId || typeof percent !== 'number')
    return badRequest('bookId and percent required');

  await env.DB.prepare(
    `INSERT INTO reading_progress (user_id,book_id,cfi,percent,updated_at)
     VALUES (?,?,?,?,strftime('%s','now'))
     ON CONFLICT(user_id,book_id) DO UPDATE SET
       cfi=excluded.cfi, percent=excluded.percent, updated_at=strftime('%s','now')`
  ).bind(user.id, bookId, cfi ?? null, percent).run();

  return json({ ok:true });
};
