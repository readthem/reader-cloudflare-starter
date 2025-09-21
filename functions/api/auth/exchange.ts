import type { Env } from '../../_lib/env'
import { json, badRequest } from '../../_lib/responses'
import { setSession } from '../../_lib/auth'

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const t = new URL(request.url).searchParams.get('t') || ''
  if (!/^[a-f0-9]+$/i.test(t)) return badRequest('bad token')
  const row = await env.DB.prepare('SELECT user_id, expires_at FROM sessions WHERE id=?').bind('tkn_'+t).first<{user_id:string,expires_at:number}>()
  if (!row || row.expires_at < Math.floor(Date.now()/1000)) return badRequest('invalid or expired token')

  // consume token
  await env.DB.prepare('DELETE FROM sessions WHERE id=?').bind('tkn_'+t).run()

  // set real session
  const headers = await setSession(row.user_id, env)

  // redirect back to app (library)
  headers.set('Location', '/app.html')
  return new Response(null, { status: 302, headers })
}
