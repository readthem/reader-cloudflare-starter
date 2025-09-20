cat > functions/api/upload.ts <<'TS'
// functions/api/upload.ts
import type { Env } from '../_lib/env';
import { json, badRequest, unauthorized } from '../_lib/responses';
import { requireUser } from '../_lib/auth';

function inferExtFromType(t?: string | null) {
  t = (t || '').toLowerCase();
  if (t.includes('pdf')) return 'pdf';
  if (t.includes('epub')) return 'epub'; // application/epub+zip
  return '';
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();

  const ct = request.headers.get('content-type') || '';
  let file: File | null = null;
  let filename = 'upload';
  let ext = '';

  if (ct.includes('multipart/form-data')) {
    const form = await request.formData();
    const f = form.get('files') || form.get('file');
    if (!(f instanceof File)) return badRequest('missing "files" or "file" form field');
    file = f;
    filename = (f as any).name || filename;
    ext = (filename.split('.').pop() || '').toLowerCase();
    if (!['pdf', 'epub'].includes(ext)) {
      ext = inferExtFromType(f.type) || ext;
    }
  } else {
    const url = new URL(request.url);
    filename = url.searchParams.get('filename') || filename;
    ext = (url.searchParams.get('ext') || '').toLowerCase();
    if (!ext) ext = inferExtFromType(ct);
  }

  if (!['pdf', 'epub'].includes(ext)) {
    return badRequest('ext must be epub or pdf');
  }

  const bookId = crypto.randomUUID();
  const key = `user/${user.id}/books/${bookId}.${ext}`;
  const contentType = ext === 'pdf' ? 'application/pdf' : 'application/epub+zip';

  if (file) {
    await env.R2.put(key, file.stream(), { httpMetadata: { contentType } });
  } else {
    await env.R2.put(key, request.body, { httpMetadata: { contentType } });
  }

  const title = filename.replace(/\.[^.]+$/, '');
  const type = ext === 'pdf' ? 'pdf' : 'epub';

  await env.DB.prepare(
    'INSERT INTO books (id, user_id, title, author, r2_key, type) VALUES (?, ?, ?, ?, ?, ?)'
  )
    .bind(bookId, user.id, title, null, key, type)
    .run();

  return json({ ok: true, id: bookId, key, type, title });
};
TS
