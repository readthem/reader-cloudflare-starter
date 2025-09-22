// functions/api/books/[id]/index.ts
import type { Env } from "../../_lib/env";
import { json, unauthorized, notFound } from "../..//_lib/responses"; // ← NOTE: path fix in next line if needed
import { requireUser } from "../../_lib/auth";

// ⚠️ If your editor auto-inserted a wrong path, ensure it's exactly "../../_lib/..."
// From this file's folder (functions/api/books/[id]/) to _lib (functions/_lib/) is two levels up.

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();

  const id = String(params?.id || "").trim();
  if (!id) return notFound("book not found");

  // Find the R2 key so we can delete the object too
  const row = await env.DB
    .prepare(`SELECT r2_key FROM books WHERE id = ? AND user_id = ?`)
    .bind(id, user.id)
    .first<{ r2_key?: string }>();

  if (!row || !row.r2_key) return notFound("book not found");

  // Delete child rows first
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM reading_progress WHERE user_id = ? AND book_id = ?`).bind(user.id, id),
    env.DB.prepare(`DELETE FROM annotations      WHERE user_id = ? AND book_id = ?`).bind(user.id, id),
    env.DB.prepare(`DELETE FROM books            WHERE id = ? AND user_id = ?`).bind(id, user.id),
  ]);

  // Best-effort R2 delete
  try { await env.R2.delete(String(row.r2_key)); } catch {}

  return json({ ok: true });
};
