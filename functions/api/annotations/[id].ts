import type { Env } from '../../_lib/env';
import { json, unauthorized } from '../../_lib/responses';
import { requireUser } from '../../_lib/auth';

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();
  const id = String(params?.id || '');
  if (!id) return new Response('Bad Request', {status:400});
  await env.DB.prepare(`DELETE FROM annotations WHERE id=? AND user_id=?`).bind(id, user.id).run();
  return json({ ok:true });
};
