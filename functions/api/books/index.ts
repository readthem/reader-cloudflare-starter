import type { Env } from '../../_lib/env'
import { json, unauthorized } from '../../_lib/responses'
import { requireUser } from '../../_lib/auth'

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await requireUser(request, env)
  if (!user) return unauthorized()

  const rows = await env.DB.prepare(
    `SELECT b.id, b.title, b.author, b.type,
            IFNULL(p.percent, 0) AS percent,
            IFNULL(p.updated_at, 0) AS progress_updated_at
     FROM books b
     LEFT JOIN reading_progress p ON p.book_id=b.id AND p.user_id=?
     WHERE b.user_id=?
     ORDER BY b.created_at DESC`
  ).bind(user.id, user.id).all()

  return json({ books: rows.results || [] })
}
