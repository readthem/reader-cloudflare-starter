// Cookie-based session lookup. Assumes a `sessions` table in D1.
//
// Minimal contract used by API routes: return `{ id: string }` for the user,
// or `null` if not authenticated.

import type { Env } from "./env";

export type User = {
  id: string;
  email?: string | null;
};

function parseCookie(cookieHeader: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (!k) continue;
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

export async function requireUser(request: Request, env: Env): Promise<User | null> {
  // Look for a session cookie named "sid"
  const cookies = parseCookie(request.headers.get("cookie"));
  const sid = (cookies["sid"] || "").trim();
  if (!sid) return null;

  // Find session → user
  // Expected schema:
  //   sessions(id TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER)
  //   users(id TEXT PRIMARY KEY, email TEXT)
  try {
    const sess = await env.DB
      .prepare(`SELECT user_id, expires_at FROM sessions WHERE id = ?`)
      .bind(sid)
      .first<{ user_id: string; expires_at: number | null }>();

    if (!sess || !sess.user_id) return null;

    // Check expiry if present (unix seconds)
    if (sess.expires_at && Date.now() / 1000 > Number(sess.expires_at)) {
      return null;
    }

    // Optional: join to users for email (non-fatal if users table doesn't exist)
    try {
      const u = await env.DB
        .prepare(`SELECT id, email FROM users WHERE id = ?`)
        .bind(sess.user_id)
        .first<{ id: string; email: string | null }>();
      if (u && u.id) return { id: u.id, email: u.email };
    } catch {
      // If there's no users table, just return the id from session
    }

    return { id: sess.user_id };
  } catch {
    // If the sessions table isn't there yet, treat as unauthenticated
    return null;
  }
}
