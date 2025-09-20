import type { Env } from '../../_lib/env';
import { verifyMagicToken, createSession, sessionCookie } from '../../_lib/auth';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const t = url.searchParams.get('t') || '';
  const verified = await verifyMagicToken(env.AUTH_SECRET, t);
  if (!verified) return new Response('Invalid or expired link', { status: 400 });
  const { userId } = verified;
  const { sid, exp } = await createSession(env.DB, userId);
  const headers = new Headers({ Location: `${env.APP_ORIGIN}/` });
  headers.append('Set-Cookie', sessionCookie(sid, exp));
  return new Response(null, { status: 302, headers });
};
