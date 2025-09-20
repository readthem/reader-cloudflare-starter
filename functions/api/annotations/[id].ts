import type { Env } from '../../_lib/env';
import { json, unauthorized, badRequest, notFound } from '../../_lib/responses';
import { requireUser } from '../../_lib/auth';

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();
  const id = params?.id as string;
  const body = await request.json() as any;
  const updates: string[] = [];
  const binds: any[] = [];
  if ('kind' in body){ updates.push('kind = ?'); binds.push(body.kind); }
  if ('color' in body){ updates.push('color = ?'); binds.push(body.color); }
  if ('chapter_src' in body){ updates.push('chapter_src = ?'); binds.push(body.chapter_src); }
  if ('anchor' in body){ updates.push('anchor_json = ?'); binds.push(JSON.stringify(body.anchor)); }
  if ('payload' in body){ updates.push('payload_json = ?'); binds.push(JSON.stringify(body.payload)); }
  if (updates.length === 0) return badRequest('No updates');
  binds.push(id, user.id);
  const res = await env.DB.prepare(`UPDATE annotations SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`).bind(...binds).run();
  return json({ ok: true });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();
  const id = params?.id as string;
  await env.DB.prepare('DELETE FROM annotations WHERE id = ? AND user_id = ?').bind(id, user.id).run();
  return json({ ok: true });
};
