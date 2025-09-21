import type { Env } from '../../_lib/env';
import { json, badRequest, unauthorized } from '../../_lib/responses';
import { requireUser } from '../../_lib/auth';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();

  const body = await request.json().catch(()=>null);
  if (!body || !body.id || !body.bookId) return badRequest('id and bookId required');

  const id = String(body.id);
  const bookId = String(body.bookId);
  const kind = String(body.kind || 'hl');  // 'hl' | 'gloss'
  const color = kind === 'hl' ? (body.color || null) : null;

  const payload = body.payload || {};
  const section = payload.section || null;
  const percent = (typeof payload.percent === 'number') ? payload.percent : null;
  const snippet = (payload.snippet || '').toString().slice(0, 2000);

  const tags = JSON.stringify({ kind, section, percent });

  await env.DB.prepare(
    `INSERT INTO annotations (id, user_id, book_id, cfi_range, note, color, tags, created_at, updated_at)
     VALUES (?, ?, ?, NULL, ?, ?, ?, strftime('%s','now'), strftime('%s','now'))
     ON CONFLICT(id) DO UPDATE SET
       note=excluded.note, color=excluded.color, tags=excluded.tags, updated_at=strftime('%s','now')`
  ).bind(id, user.id, bookId, snippet, color, tags).run();

  return json({ ok:true });
};
