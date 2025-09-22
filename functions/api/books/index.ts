import type { Env } from '../../../_lib/env';
import { json, unauthorized, notFound } from '../../../_lib/responses';
import { requireUser } from '../../../_lib/auth';

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();

  const id = String(params?.id || '').trim();
  if (!id) return notFound('book not found');

  // 1) Look up the book so we can remove from R2 too
  const row = await env.DB
    .prepare(`SELECT r2_key FROM books WHERE id = ? AND user_id = ?`)
    .bind(id, user.id)
    .first<{ r2_key?: string }>();

  if (!row || !row.r2_key) return notFound('book not found');

  // 2) Delete dependent rows first (reading progress, annotations), then the book
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM reading_progress WHERE user_id = ? AND book_id = ?`).bind(user.id, id),
    env.DB.prepare(`DELETE FROM annotations      WHERE user_id = ? AND book_id = ?`).bind(user.id, id),
    env.DB.prepare(`DELETE FROM books            WHERE id = ? AND user_id = ?`).bind(id, user.id),
  ]);

  // 3) Delete the object from R2 (best-effort)
  try { await env.R2.delete(String(row.r2_key)); } catch {}

  return json({ ok: true });
};
