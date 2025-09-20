import type { Env } from '../../_lib/env';
import { json, badRequest } from '../../_lib/responses';
import { upsertUser, makeMagicToken } from '../../_lib/auth';
import { sendMailWithMailChannels } from '../../_lib/mail';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { email } = await request.json() as any;
  if (!email || typeof email !== 'string') return badRequest('email required');
  const norm = email.trim().toLowerCase();
  const userId = await upsertUser(env.DB, norm);
  const token = await makeMagicToken(env.AUTH_SECRET, userId, 10 * 60); // 10 min
  const link = `${env.APP_ORIGIN}/api/auth/exchange?t=${encodeURIComponent(token)}`;
  const html = `<p>Sign in to Reader:</p><p><a href="${link}">${link}</a></p><p>This link expires in 10 minutes.</p>`;

  // Try to send email, but don't fail the request if it doesn't send (dev-friendly)
  try {
    await sendMailWithMailChannels(env, norm, 'Your sign-in link', html);
  } catch (err) {
    console.log('Mail send failed (dev OK):', err);
  }

  // Always return the link so you can click it directly in dev
  return json({ ok: true, link });
};
