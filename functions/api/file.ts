// functions/api/file.ts
import type { Env } from '../_lib/env';
import { badRequest, notFound, unauthorized } from '../_lib/responses';
import { requireUser } from '../_lib/auth';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return badRequest('missing id');

  const row = await env.DB
    .prepare(`SELECT r2_key, type FROM books WHERE id = ? AND user_id = ?`)
    .bind(id, user.id)
    .first<{ r2_key: string; type: string }>();
  if (!row) return notFound('book not found');

  const obj = await env.R2.get(row.r2_key);
  if (!obj) return notFound('object not found');

  const headers = new Headers();
  headers.set('content-type', row.type === 'pdf' ? 'application/pdf' : 'application/epub+zip');
  return new Response(obj.body, { headers });
};
