// Route: DELETE /api/books/:id
import type { Env } from "../../_lib/env";
import { json, unauthorized, notFound } from "../../_lib/responses";
import { requireUser } from "../../_lib/auth";

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();

  const id = String(params?.id || "").trim();
  if (!id) return notFound("book not found");

  // Look up the book to get the r2_key for deletion
  const row = await env.DB
    .prepare(`SELECT r2_key FROM books WHERE id = ? AND user_id = ?`)
    .bind(id, user.id)
    .first<{ r2_key?: string }>();

  if (!row || !row.r2_key) return notFound("book not found");

  // Delete dependents first, then the book
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM reading_progress WHERE user_id = ? AND book_id = ?`).bind(user.id, id),
    env.DB.prepare(`DELETE FROM annotations      WHERE user_id = ? AND book_id = ?`).bind(user.id, id),
    env.DB.prepare(`DELETE FROM books            WHERE id = ? AND user_id = ?`).bind(id, user.id),
  ]);

  // Best-effort: remove the object from R2
  try { await env.R2.delete(String(row.r2_key)); } catch { /* ignore */ }

  return json({ ok: true });
};
