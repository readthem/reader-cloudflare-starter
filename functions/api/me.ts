import type { Env } from '../_lib/env'
import { json } from '../_lib/responses'
import { requireUser } from '../_lib/auth'

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await requireUser(request, env)
  return json({ user: user || null })
}
