import type { Env } from './env';

export async function sendMailWithMailChannels(env: Env, toEmail: string, subject: string, html: string){
  const payload = {
    personalizations: [{ to: [{ email: toEmail }] }],
    from: { email: env.EMAIL_FROM, name: 'Reader Login' },
    subject,
    content: [{ type: 'text/html', value: html }],
  };
  const res = await fetch('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error('Mail send failed: ' + res.status + ' ' + t);
  }
}
