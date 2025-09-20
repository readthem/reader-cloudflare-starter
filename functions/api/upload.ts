// Simple upload endpoint: stream body to R2 and register book row
import type { Env } from '../_lib/env';
import { json, badRequest, unauthorized } from '../_lib/responses';
import { requireUser } from '../_lib/auth';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const bookId = url.searchParams.get('bookId') || crypto.randomUUID();
  const ext = (url.searchParams.get('ext') || '').toLowerCase();
  const filename = url.searchParams.get('filename') || 'upload';

  if (!ext || !['epub','pdf'].includes(ext)) return badRequest('ext must be epub or pdf');

  const key = `user/${user.id}/books/${bookId}.${ext}`;
  // Stream body into R2
  await env.R2.put(key, request.body, { httpMetadata: { contentType: request.headers.get('content-type') || 'application/octet-stream' } });

  // For now, minimal metadata; title = filename without ext
  const title = filename.replace(/\.[^.]+$/, '');
  const type = ext === 'pdf' ? 'pdf' : 'epub';

  await env.DB.prepare('INSERT INTO books (id, user_id, title, author, r2_key, type) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(bookId, user.id, title, null, key, type).run();

  return json({ ok: true, id: bookId, key });
};
