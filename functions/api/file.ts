// Stream a user's book file from R2
import type { Env } from '../_lib/env';
import { requireUser } from '../_lib/auth';
import { badRequest, notFound, unauthorized } from '../_lib/responses';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const me = await requireUser(request, env);
  if (!me) return unauthorized();

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return badRequest('missing id');

  type Row = { id: string; user_id: string; title: string | null; type: string; r2_key: string };
  const row = await env.DB
    .prepare('SELECT id, user_id, title, type, r2_key FROM books WHERE id = ?')
    .bind(id)
    .first<Row>();

  if (!row || row.user_id !== me.id) return notFound('book');

  const obj = await env.R2.get(row.r2_key);
  if (!obj) return notFound('file');

  const ctype = row.type === 'pdf' ? 'application/pdf' : 'application/epub+zip';
  const fname = `${(row.title || row.id).replace(/["]/g, '')}.${row.type}`;

  return new Response(obj.body, {
    headers: {
      'content-type': ctype,
      ...(obj.size ? { 'content-length': String(obj.size) } : {}),
      'content-disposition': `inline; filename="${encodeURIComponent(fname)}"`,
      'cache-control': 'private, max-age=0, must-revalidate'
    }
  });
};
