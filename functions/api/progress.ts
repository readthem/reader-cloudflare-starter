import type { Env } from '../_lib/env'
import { json, unauthorized, badRequest } from '../_lib/responses'
import { requireUser } from '../_lib/auth'

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await requireUser(request, env)
  if (!user) return unauthorized()
  const { bookId, percent, cfi } = await request.json().catch(()=>({}))
  if (!bookId || typeof percent !== 'number') return badRequest('missing')

  await env.DB.prepare(
    `INSERT INTO reading_progress (user_id, book_id, cfi, percent, updated_at)
     VALUES (?, ?, ?, ?, strftime('%s','now'))
     ON CONFLICT(user_id,book_id)
     DO UPDATE SET cfi=excluded.cfi, percent=excluded.percent, updated_at=excluded.updated_at`
  ).bind(user.id, bookId, cfi||null, percent).run()

  return json({ ok: true })
}
