import type { Env } from '../../_lib/env';
import { json, badRequest, unauthorized, notFound } from '../../_lib/responses';
import { requireUser } from '../../_lib/auth';

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();
  const bookId = params?.bookId as string;
  const row = await env.DB.prepare('SELECT last_percent, pins_json FROM reading_state WHERE user_id = ? AND book_id = ?')
    .bind(user.id, bookId).first();
  if (!row) return json({ last_percent: 0, pins: [] });
  return json({ last_percent: (row as any).last_percent || 0, pins: JSON.parse((row as any).pins_json || '[]') });
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();
  const bookId = params?.bookId as string;
  const body = await request.json() as any;
  const p = typeof body.last_percent === 'number' ? body.last_percent : 0;
  const pins = Array.isArray(body.pins) ? body.pins : [];

  await env.DB.prepare(`INSERT INTO reading_state (id, user_id, book_id, last_percent, pins_json, updated_at)
                        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                        ON CONFLICT(user_id, book_id) DO UPDATE SET last_percent=excluded.last_percent, pins_json=excluded.pins_json, updated_at=CURRENT_TIMESTAMP`)
    .bind(crypto.randomUUID(), user.id, bookId, p, JSON.stringify(pins)).run();
  return json({ ok: true });
};
