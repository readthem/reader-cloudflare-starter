// Lightweight JSON helpers for Pages Functions

type JsonInit = ResponseInit & { headers?: HeadersInit };

export function json(data: unknown, init: JsonInit = {}): Response {
  const headers: HeadersInit = {
    "content-type": "application/json; charset=utf-8",
    ...init.headers,
  };
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function badRequest(message = "bad request"): Response {
  return json({ ok: false, error: message }, { status: 400 });
}

export function unauthorized(message = "unauthorized"): Response {
  return json({ ok: false, error: message }, { status: 401 });
}

export function forbidden(message = "forbidden"): Response {
  return json({ ok: false, error: message }, { status: 403 });
}

export function notFound(message = "not found"): Response {
  return json({ ok: false, error: message }, { status: 404 });
}

export function serverError(message = "internal error"): Response {
  return json({ ok: false, error: message }, { status: 500 });
}
