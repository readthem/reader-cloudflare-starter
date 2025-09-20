import type { Env } from '../../_lib/env';
import { json, badRequest } from '../../_lib/responses';
import { upsertUser, makeMagicToken } from '../../_lib/auth';
import { sendMailWithMailChannels } from '../../_lib/mail';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let email: string | undefined;
  try {
    const body = await request.json() as any;
    email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : undefined;
  } catch {}
  if (!email) return badRequest('email required');

  const userId = await upsertUser(env.DB, email);
  const token = await makeMagicToken(env.AUTH_SECRET, userId, 10 * 60); // 10 min

  // Use the current deployment’s origin by default (works for Preview & Production)
  const origin = new URL(request.url).origin;
  const base = env.APP_ORIGIN?.startsWith('http') ? env.APP_ORIGIN : origin;

  const link = `${base}/api/auth/exchange?t=${encodeURIComponent(token)}`;
  const html = `<p>Sign in to Reader:</p><p><a href="${link}">${link}</a></p><p>This link expires in 10 minutes.</p>`;

  // Try to send email; if it fails (e.g., no SPF/DMARC yet), still return the link
  try {
    await sendMailWithMailChannels(env, email, 'Your sign-in link', html);
  } catch (err) {
    console.log('Mail send failed (ok in early setup):', err);
  }

  return json({ ok: true, link });
};
