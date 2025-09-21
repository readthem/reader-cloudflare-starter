// functions/api/annotations/index.ts
import type { Env } from '../../_lib/env';
import { badRequest, json, unauthorized } from '../../_lib/responses';
import { requireUser } from '../../_lib/auth';

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();

  const bookId = new URL(request.url).searchParams.get('bookId');
  if (!bookId) return badRequest('bookId required');

  const res = await env.DB
    .prepare(`SELECT id, cfi_range, note, color, tags, updated_at
              FROM annotations WHERE user_id = ? AND book_id = ?
              ORDER BY updated_at DESC`)
    .bind(user.id, bookId)
    .all<{ id: string; cfi_range: string | null; note: string | null; color: string | null; tags: string | null; updated_at: number }>();

  return json({ items: res.results ?? [] });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();

  const { id, bookId, cfi_range, note, color, tags } = await request.json().catch(() => ({}));
  if (!bookId) return badRequest('bookId required');

  const annId = id || crypto.randomUUID();

  await env.DB
    .prepare(`INSERT INTO annotations (id, user_id, book_id, cfi_range, note, color, tags, created_at, updated_at)
              VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, strftime('%s','now'), strftime('%s','now'))
              ON CONFLICT(id) DO UPDATE SET
                cfi_range=excluded.cfi_range,
                note=excluded.note,
                color=excluded.color,
                tags=excluded.tags,
                updated_at=strftime('%s','now')`)
    .bind(annId, user.id, bookId, cfi_range ?? null, note ?? null, color ?? null, tags ?? null)
    .run();

  return json({ ok: true, id: annId });
};
