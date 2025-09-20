// functions/api/upload.ts
import type { Env } from '../_lib/env';
import { json, badRequest, unauthorized } from '../_lib/responses';
import { requireUser } from '../_lib/auth';

function inferExtFromType(t?: string | null) {
  const s = (t || '').toLowerCase();
  if (s.includes('pdf')) return 'pdf';
  if (s.includes('epub')) return 'epub'; // application/epub+zip
  return null;
}
function stripExt(name: string) {
  return name.replace(/\.[^.]+$/, '');
}
function contentTypeFor(ext: 'pdf' | 'epub') {
  return ext === 'pdf' ? 'application/pdf' : 'application/epub+zip';
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();

  const ctype = request.headers.get('content-type') || '';

  // --- Path 1: multipart/form-data (recommended from the UI) ---
  if (ctype.toLowerCase().includes('multipart/form-data')) {
    const form = await request.formData();

    // Accept either "files" (multiple) or "file" (single)
    const files: File[] = [];
    for (const [k, v] of form.entries()) {
      if ((k === 'files' || k === 'file') && v instanceof File) files.push(v);
    }
    if (!files.length) return badRequest('no files found (use form field "files" or "file")');

    const results: Array<{ id: string; key: string; title: string }> = [];

    for (const file of files) {
      const originalName = (file as any).name || 'upload';
      let ext = (originalName.split('.').pop() || '').toLowerCase();
      if (ext !== 'pdf' && ext !== 'epub') {
        const byType = inferExtFromType(file.type);
        if (byType) ext = byType;
      }
      if (ext !== 'pdf' && ext !== 'epub') {
        return badRequest('ext must be epub or pdf');
      }

      const bookId = crypto.randomUUID();
      const key = `user/${user.id}/books/${bookId}.${ext as 'pdf' | 'epub'}`;
      await env.R2.put(key, file.stream(), {
        httpMetadata: { contentType: contentTypeFor(ext as 'pdf' | 'epub') },
      });

      const title = stripExt(originalName);
      const type = ext === 'pdf' ? 'pdf' : 'epub';
      await env.DB
        .prepare('INSERT INTO books (id, user_id, title, author, r2_key, type) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(bookId, user.id, title, null, key, type)
        .run();

      results.push({ id: bookId, key, title });
    }

    return json({ ok: true, uploaded: results });
  }

  // --- Path 2: raw body with ?ext=&filename=&bookId= (backwards-compatible) ---
  const url = new URL(request.url);
  const bookId = url.searchParams.get('bookId') || crypto.randomUUID();
  let ext = (url.searchParams.get('ext') || '').toLowerCase() as '' | 'pdf' | 'epub';
  const filename = url.searchParams.get('filename') || 'upload';

  if (ext !== 'pdf' && ext !== 'epub') {
    const byType = inferExtFromType(request.headers.get('content-type'));
    if (byType) ext = byType as 'pdf' | 'epub';
  }
  if (ext !== 'pdf' && ext !== 'epub') return badRequest('ext must be epub or pdf');

  const key = `user/${user.id}/books/${bookId}.${ext}`;
  await env.R2.put(key, request.body, {
    httpMetadata: { contentType: contentTypeFor(ext) },
  });

  const title = stripExt(filename);
  const type = ext === 'pdf' ? 'pdf' : 'epub';
  await env.DB
    .prepare('INSERT INTO books (id, user_id, title, author, r2_key, type) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(bookId, user.id, title, null, key, type)
    .run();

  return json({ ok: true, id: bookId, key, title });
};
