// functions/api/books/index.ts
// Routes:
//   GET  /api/books        → list books for the signed-in user
//   POST /api/books        → upload a new book (multipart/form-data)
//
// Notes:
// - Expects _lib helpers under functions/_lib/*
// - R2 bucket bound as env.R2
// - D1 database bound as env.DB
//
// Table (books) is assumed to contain at least:
//   id TEXT PRIMARY KEY
//   user_id TEXT NOT NULL
//   title TEXT
//   author TEXT
//   r2_key TEXT NOT NULL
//   bytes INTEGER
//   created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
//
// If your schema has extra columns, the INSERT ignores them.

import type { Env } from "../../_lib/env";
import { json, unauthorized } from "../../_lib/responses";
import { requireUser } from "../../_lib/auth";

// Small helper: safe string trim
const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");

// Infer a title/author from filename if user didn’t provide metadata.
// "Title - Author.ext" → { title: "Title", author: "Author" }
function inferMetaFromFilename(filename: string) {
  const name = filename.replace(/\.[a-z0-9]+$/i, "");
  const m = name.match(/^(.*?)\s*-\s*(.+)$/);
  if (m) {
    return { title: m[1].trim(), author: m[2].trim() };
  }
  return { title: name.trim(), author: "" };
}

// Shape returned to the UI
type BookItem = {
  id: string;
  title: string;
  author: string;
  r2Key: string;
  bytes: number | null;
  createdAt: number; // unix seconds
  filename?: string; // best-effort
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();

  // Return newest-first for a nicer UX
  const rows = await env.DB
    .prepare(
      `SELECT id, title, author, r2_key, bytes, created_at
         FROM books
        WHERE user_id = ?
        ORDER BY created_at DESC`
    )
    .bind(user.id)
    .all<{
      id: string;
      title: string | null;
      author: string | null;
      r2_key: string;
      bytes: number | null;
      created_at: number;
    }>();

  const items: BookItem[] = (rows.results || []).map((r) => ({
    id: r.id,
    title: (r.title || "").trim(),
    author: (r.author || "").trim(),
    r2Key: r.r2_key,
    bytes: r.bytes ?? null,
    createdAt: r.created_at,
    // filename: last path segment of r2_key, if present
    filename: r.r2_key.split("/").pop(),
  }));

  // Many UIs expect { items: [...] }
  return json({ items });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();

  // We support only multipart/form-data here for simplicity
  const ct = request.headers.get("content-type") || "";
  if (!/multipart\/form-data/i.test(ct)) {
    return json(
      { ok: false, error: "Use multipart/form-data with a 'file' field." },
      { status: 400 }
    );
  }

  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return json({ ok: false, error: "Missing 'file'." }, { status: 400 });
    }

    // Optional metadata from form fields
    let title = s(form.get("title"));
    let author = s(form.get("author"));

    // If not provided, infer from filename "Title - Author.ext"
    if (!title) {
      const inferred = inferMetaFromFilename(file.name || "untitled");
      title = inferred.title;
      if (!author) author = inferred.author;
    }

    // Generate IDs/keys
    const id = crypto.randomUUID();
    const userPrefix = `${user.id}/`;
    // R2 object key: user scoped + id + original filename (preserves extension)
    const r2Key = `${userPrefix}${id}--${(file.name || "upload").replace(
      /\s+/g,
      "_"
    )}`;

    // Upload to R2
    // Workers runtime supports streaming File/Blob directly to R2.put
    await env.R2.put(r2Key, file.stream(), {
      httpMetadata: {
        contentType: file.type || "application/octet-stream",
        contentDisposition: `attachment; filename="${encodeURIComponent(
          file.name || "upload"
        )}"`,
      },
    });

    // Persist record in D1
    const bytes = typeof file.size === "number" ? file.size : null;

    await env.DB.prepare(
      `INSERT INTO books (id, user_id, title, author, r2_key, bytes)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(id, user.id, title, author, r2Key, bytes)
      .run();

    // Return the created record in a UI-friendly envelope
    const createdAtRow = await env.DB
      .prepare(`SELECT created_at FROM books WHERE id = ? AND user_id = ?`)
      .bind(id, user.id)
      .first<{ created_at: number }>();

    const createdAt =
      (createdAtRow && createdAtRow.created_at) ||
      Math.floor(Date.now() / 1000);

    const item: BookItem = {
      id,
      title,
      author,
      r2Key,
      bytes,
      createdAt,
      filename: file.name || undefined,
    };

    return json({ ok: true, item });
  } catch (err: any) {
    // Best-effort: if DB insert failed after upload, you might want to delete the object.
    // (We avoid doing that automatically to not hide useful failure signals.)
    return json(
      { ok: false, error: String(err?.message || err || "Upload failed.") },
      { status: 500 }
    );
  }
};
