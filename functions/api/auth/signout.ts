import type { Env } from '../../_lib/env';
import { json } from '../../_lib/responses';
import { getCookie, makeCookie } from '../../_lib/cookies';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // Best-effort: remove from DB
  const sid = getCookie(request, 'sid');
  if (sid) {
    await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sid).run();
  }
  // expire cookie
  const headers = new Headers();
  headers.append('Set-Cookie', makeCookie('sid', '', 0, { path: '/' }));
  return new Response('{}', { headers });
};
