import { getCookie, makeCookie } from './cookies';
import { json, unauthorized, badRequest } from './responses';
import { newId } from './ids';
import { hmacSign } from './crypto';
import type { Env } from './env';

const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days

export async function upsertUser(DB: D1Database, email: string){
  const id = crypto.randomUUID();
  const existing = await DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing && (existing as any).id) return (existing as any).id as string;
  await DB.prepare('INSERT INTO users (id, email) VALUES (?, ?)').bind(id, email).run();
  return id;
}

export async function createSession(DB: D1Database, userId: string){
  const sid = newId();
  const exp = Math.floor(Date.now()/1000) + SESSION_TTL;
  await DB.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').bind(sid, userId, exp).run();
  return { sid, exp };
}

export async function getUserFromSession(DB: D1Database, sid: string){
  const row = await DB.prepare('SELECT s.user_id, s.expires_at, u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?').bind(sid).first();
  if(!row) return null;
  const { user_id, expires_at, email } = row as any;
  if (expires_at < Math.floor(Date.now()/1000)) return null;
  return { id: user_id as string, email: email as string };
}

export async function requireUser(request: Request, env: Env){
  const sid = getCookie(request, 'sid');
  if(!sid) return null;
  const user = await getUserFromSession(env.DB, sid);
  return user;
}

// Magic link tokens: userId.exp.nonce.signature
export async function makeMagicToken(secret: string, userId: string, ttlSec: number){
  const exp = Math.floor(Date.now()/1000) + ttlSec;
  const nonce = crypto.randomUUID();
  const data = `${userId}.${exp}.${nonce}`;
  const sig = await hmacSign(secret, data);
  return `${userId}.${exp}.${nonce}.${sig}`;
}

export async function verifyMagicToken(secret: string, token: string){
  const parts = token.split('.');
  if (parts.length !== 4) return null;
  const [userId, expStr, nonce, sig] = parts;
  const exp = parseInt(expStr, 10);
  if (!userId || !exp || !nonce || !sig) return null;
  if (exp < Math.floor(Date.now()/1000)) return null;
  const data = `${userId}.${exp}.${nonce}`;
  const expect = await hmacSign(secret, data);
  if (sig !== expect) return null;
  return { userId, exp };
}

export function sessionCookie(sid: string, exp: number){
  const maxAge = Math.max(0, exp - Math.floor(Date.now()/1000));
  return makeCookie('sid', sid, maxAge, { path: '/' });
}
