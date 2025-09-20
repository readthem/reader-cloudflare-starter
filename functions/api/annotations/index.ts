import type { Env } from '../../_lib/env';
import { json, unauthorized, badRequest } from '../../_lib/responses';
import { requireUser } from '../../_lib/auth';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();
  const url = new URL(request.url);
  const bookId = url.searchParams.get('bookId');
  const chapter = url.searchParams.get('chapter');
  if (!bookId) return badRequest('bookId required');
  let q = 'SELECT id, kind, color, chapter_src, anchor_json, payload_json, group_id FROM annotations WHERE user_id = ? AND book_id = ?';
  const binds: any[] = [user.id, bookId];
  if (chapter) { q += ' AND chapter_src = ?'; binds.push(chapter); }
  q += ' ORDER BY created_at ASC';
  const rows = await env.DB.prepare(q).bind(...binds).all();
  const items = (rows.results || []).map((r: any) => ({
    id: r.id, kind: r.kind, color: r.color, chapter_src: r.chapter_src,
    anchor: JSON.parse(r.anchor_json), payload: r.payload_json ? JSON.parse(r.payload_json) : null, group_id: r.group_id
  }));
  return json({ items });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();
  const body = await request.json() as any;
  const id = crypto.randomUUID();
  const { book_id, kind, color, chapter_src, anchor, payload, group_id } = body || {};
  if (!book_id || !kind || !anchor) return badRequest('book_id, kind, anchor required');
  await env.DB.prepare('INSERT INTO annotations (id, user_id, book_id, kind, color, chapter_src, anchor_json, payload_json, group_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, user.id, book_id, kind, color || null, chapter_src || null, JSON.stringify(anchor), payload ? JSON.stringify(payload) : null, group_id || null)
    .run();
  return json({ ok: true, id });
};
