import type { Env } from './env'

function cookie(name:string, value:string, opts:Record<string,string|number|boolean>){
  const parts = [`${name}=${value}`]
  if (opts['Max-Age']!==undefined) parts.push(`Max-Age=${opts['Max-Age']}`)
  if (opts['Path']) parts.push(`Path=${opts['Path']}`)
  if (opts['SameSite']) parts.push(`SameSite=${opts['SameSite']}`)
  if (opts['Secure']) parts.push(`Secure`)
  if (opts['HttpOnly']) parts.push(`HttpOnly`)
  return parts.join('; ')
}

export async function requireUser(request: Request, env: Env){
  const sid = (request.headers.get('Cookie')||'').split(/;\s*/).map(s=>s.trim()).find(s=>s.startsWith('sid='))?.slice(4)
  if (!sid) return null
  const row = await env.DB.prepare(
    `SELECT sessions.user_id, users.email, sessions.expires_at
     FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.id=?`
  ).bind(sid).first<{user_id:string,email:string,expires_at:number}>()
  if (!row) return null
  if (row.expires_at < Math.floor(Date.now()/1000)) return null
  return { id: row.user_id, email: row.email }
}

export async function setSession(userId: string, env: Env){
  const sid = crypto.randomUUID().replace(/-/g,'')
  const ttl = 60*60*24*30 // 30 days
  const now = Math.floor(Date.now()/1000)
  await env.DB.prepare(`INSERT INTO sessions (id,user_id,created_at,expires_at) VALUES (?,?,?,?)`)
    .bind(sid, userId, now, now+ttl).run()
  const headers = new Headers()
  headers.append('Set-Cookie', cookie('sid', sid, {
    'Path': '/', 'Max-Age': ttl, 'HttpOnly': true, 'Secure': true, 'SameSite': 'Lax'
  }))
  return headers
}

export async function clearSession(env: Env, request: Request){
  const sid = (request.headers.get('Cookie')||'').split(/;\s*/).map(s=>s.trim()).find(s=>s.startsWith('sid='))?.slice(4)
  if (sid) await env.DB.prepare('DELETE FROM sessions WHERE id=?').bind(sid).run()
  const headers = new Headers()
  headers.append('Set-Cookie', cookie('sid','', {'Path':'/','Max-Age':0,'HttpOnly':true,'Secure':true,'SameSite':'Lax'}))
  return headers
}
