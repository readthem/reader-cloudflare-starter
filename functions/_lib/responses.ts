export const json = (data: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json', ...(init.headers||{}) } })

export const badRequest = (msg = 'Bad Request') =>
  new Response(msg, { status: 400 })

export const unauthorized = (msg = 'Unauthorized') =>
  new Response(msg, { status: 401 })

export const notFound = (msg = 'Not found') =>
  new Response(msg, { status: 404 })
