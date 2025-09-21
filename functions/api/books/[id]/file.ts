import type { Env } from '../../../_lib/env'
import { unauthorized, notFound } from '../../../_lib/responses'
import { requireUser } from '../../../_lib/auth'

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const user = await requireUser(request, env)
  if (!user) return unauthorized()
  const id = String(params?.id||'')
  const row = await env.DB.prepare('SELECT r2_key, type FROM books WHERE id=? AND user_id=?')
    .bind(id, user.id).first<{r2_key:string,type:string}>()
  if (!row) return notFound()

  const obj = await env.R2.get(row.r2_key)
  if (!obj) return notFound()

  const headers = new Headers()
  headers.set('content-type', row.type==='pdf' ? 'application/pdf' : 'application/epub+zip')
  headers.set('cache-control', 'private, no-store')
  return new Response(obj.body, { status: 200, headers })
}
