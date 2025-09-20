export const json = (obj: any, init: ResponseInit = {}) =>
  new Response(JSON.stringify(obj), { headers: { 'content-type': 'application/json' }, ...init });

export const badRequest = (msg = 'Bad Request') => new Response(msg, { status: 400 });
export const unauthorized = (msg = 'Unauthorized') => new Response(msg, { status: 401 });
export const notFound = (msg = 'Not Found') => new Response(msg, { status: 404 });
