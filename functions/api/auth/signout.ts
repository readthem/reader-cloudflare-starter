import type { Env } from '../../_lib/env'
import { clearSession } from '../../_lib/auth'

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const headers = await clearSession(env, request)
  return new Response('signed out', { status: 200, headers })
}
