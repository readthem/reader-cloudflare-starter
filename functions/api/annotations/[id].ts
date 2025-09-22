import type { Env } from '../../_lib/env';
import { json, badRequest, unauthorized, notFound } from '../../_lib/responses';
import { requireUser } from '../../_lib/auth';

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();

  const id = (params?.id || '').toString().trim();
  if (!id) return badRequest('id required');

  const { success, meta } = await env.DB
    .prepare('DELETE FROM annotations WHERE id = ? AND user_id = ?')
    .bind(id, user.id)
    .run();

  // If nothing was deleted, return 404 so the UI can decide to ignore
  if (!meta || meta.changes === 0) return notFound('annotation not found');
  return json({ ok: true });
};
