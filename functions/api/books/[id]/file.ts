// functions/api/books/[id]/file.ts
import type { Env } from '../../../_lib/env';
import { unauthorized, notFound } from '../../../_lib/responses';
import { requireUser } from '../../../_lib/auth';

export const onRequestGet: PagesFunction<Env> = async ({ env, params, request }) => {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();

  const id = String(params?.id || '');
  if (!id) return notFound('missing id');

  const row = await env.DB
    .prepare('SELECT r2_key, type FROM books WHERE id = ? AND user_id = ?')
    .bind(id, user.id)
    .first<{ r2_key: string; type: string }>();

  if (!row) return notFound('book not found');

  const obj = await env.R2.get(row.r2_key);
  if (!obj || !obj.body) return notFound('file missing');

  const ct = (row.type === 'pdf') ? 'application/pdf' : 'application/epub+zip';
  return new Response(obj.body, {
    headers: {
      'content-type': ct,
      // Serve inline so PDFs open in-browser and EPUBs can be fetched by your viewer
      'content-disposition': 'inline',
      'cache-control': 'private, no-store'
    }
  });
};
