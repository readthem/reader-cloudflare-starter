import type { Env } from '../../_lib/env'
import { json, badRequest } from '../../_lib/responses'

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { email } = await request.json().catch(()=>({})) as { email?: string }
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) return badRequest('invalid email')

  // create user if not exists
  let user = await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(email).first<{id:string}>()
  if (!user) {
    const id = crypto.randomUUID()
    await env.DB.prepare('INSERT INTO users (id,email) VALUES (?,?)').bind(id, email).run()
    user = { id }
  }

  // one-time token (short TTL) stored in D1 using sessions table with special prefix
  const token = crypto.randomUUID().replace(/-/g,'')
  const now = Math.floor(Date.now()/1000)
  const ttl = 60 * 10
  await env.DB.prepare(
    'INSERT INTO sessions (id,user_id,created_at,expires_at) VALUES (?,?,?,?)'
  ).bind('tkn_'+token, user.id, now, now+ttl).run()

  const link = `${env.APP_ORIGIN}/api/auth/exchange?t=${token}`

  // For now we return the link so you can click it; wiring an email sender is optional.
  return json({ ok: true, link })
}
