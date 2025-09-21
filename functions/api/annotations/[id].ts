// functions/api/annotations/[id].ts
import type { Env } from '../../_lib/env';
import { json, unauthorized } from '../../_lib/responses';
import { requireUser } from '../../_lib/auth';

export const onRequestDelete: PagesFunction<Env> = async ({ env, params, request }) => {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();

  const id = String(params?.id || '');
  if (!id) return json({ ok: false, error: 'missing id' }, 400);

  await env.DB
    .prepare('DELETE FROM annotations WHERE id = ? AND user_id = ?')
    .bind(id, user.id)
    .run();

  return json({ ok: true });
};
