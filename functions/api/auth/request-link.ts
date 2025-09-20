import type { Env } from '../../_lib/env';
import { json, badRequest } from '../../_lib/responses';
import { upsertUser, makeMagicToken } from '../../_lib/auth';
import { sendMailWithMailChannels } from '../../_lib/mail';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // Read email safely
  let email: string | undefined;
  try {
    const body = await request.json() as any;
    if (typeof body?.email === 'string') email = body.email.trim().toLowerCase();
  } catch {}
  if (!email) return badRequest('email required');

  // Make (or find) user and mint a short-lived token
  const userId = await upsertUser(env.DB, email);
  const token = await makeMagicToken(env.AUTH_SECRET, userId, 10 * 60);

  // Build the link using THIS deployment’s origin (works for Preview & Prod)
  const origin = new URL(request.url).origin;
  const base = env.APP_ORIGIN?.startsWith('http') ? env.APP_ORIGIN : origin;
  const link = `${base}/api/auth/exchange?t=${encodeURIComponent(token)}`;

  // Try to send email, but never fail the request
  try {
    const html = `<p>Sign in to Reader:</p><p><a href="${link}">${link}</a></p><p>This link expires in 10 minutes.</p>`;
    await sendMailWithMailChannels(env, email, 'Your sign-in link', html);
  } catch (err) {
    // Fine during setup (no SPF/DMARC yet)
    console.log('Mail send failed (ok during setup):', err);
  }

  // Always return the link for inline sign-in
  return json({ ok: true, link });
};
