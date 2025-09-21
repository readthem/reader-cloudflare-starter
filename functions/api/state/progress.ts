// functions/api/state/progress.ts
import type { Env } from '../../_lib/env';
import { badRequest, json, unauthorized } from '../../_lib/responses';
import { requireUser } from '../../_lib/auth';

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const bookId = url.searchParams.get('bookId');
  if (!bookId) return badRequest('bookId required');

  const row = await env.DB
    .prepare('SELECT cfi, percent FROM reading_progress WHERE user_id = ? AND book_id = ?')
    .bind(user.id, bookId)
    .first<{ cfi: string | null; percent: number | null }>();

  return json({ bookId, cfi: row?.cfi || null, percent: row?.percent ?? null });
};

export const onRequestPut: PagesFunction<Env> = async ({ env, request }) => {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();

  const { bookId, cfi, percent } = await request.json().catch(() => ({}));
  if (!bookId) return badRequest('bookId required');

  await env.DB
    .prepare(`INSERT INTO reading_progress (user_id, book_id, cfi, percent, updated_at)
              VALUES (?1, ?2, ?3, ?4, strftime('%s','now'))
              ON CONFLICT(user_id, book_id) DO UPDATE SET
                cfi=excluded.cfi, percent=excluded.percent, updated_at=excluded.updated_at`)
    .bind(user.id, bookId, cfi ?? null, percent ?? null)
    .run();

  return json({ ok: true });
};
