import type { Env } from '../../../_lib/env';
import { unauthorized } from '../../../_lib/responses';
import { requireUser } from '../../../_lib/auth';

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();
  const id = String(params?.id || '');

  const row = await env.DB.prepare(
    `SELECT r2_key, type, title FROM books WHERE user_id=? AND id=?`
  ).bind(user.id, id).first();

  if (!row || !row.r2_key) return new Response('Not found', { status: 404 });

  const obj = await env.R2.get(String(row.r2_key));
  if (!obj) return new Response('Not found', { status: 404 });

  const ct = obj.httpMetadata?.contentType || (row.type === 'pdf' ? 'application/pdf' : 'application/epub+zip');
  return new Response(obj.body, {
    headers: {
      'content-type': ct,
      'cache-control': 'no-store',
      // let the browser open inline
      'content-disposition': `inline; filename="${encodeURIComponent((row.title||id) + (row.type==='pdf'?'.pdf':'.epub'))}"`
    }
  });
};
