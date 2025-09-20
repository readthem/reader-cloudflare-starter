
export function getCookie(req: Request, name: string) {
  const cookie = req.headers.get('cookie') || '';
  // Escape regex metacharacters in the cookie name
  const escaped = name.replace(/([.*+?^${}()|[\]\\])/g, '\\$1');
  const match = cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export function makeCookie(name: string, value: string, maxAgeSec: number, opts: Partial<{ path: string }> = {}) {
  const attrs = [
    `${name}=${encodeURIComponent(value)}`,
    `Max-Age=${maxAgeSec}`,
    'Path=' + (opts.path || '/'),
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ];
  return attrs.join('; ');
}

