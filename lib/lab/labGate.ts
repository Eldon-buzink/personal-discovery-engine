import 'server-only'

// Report lab: who may run lab generation. Lab only, but it spends money on
// the model, so it is gated like the real thing:
// 1. LAB_CONTENT_GENERATION=1 must be set on the server (never in production
//    unless someone sets it on purpose).
// 2. Paid check: the signed-in user must have users.is_paid, the same
//    isPaidUser lookup generateRelationshipInsight uses.
//    Local escape hatch: LAB_CONTENT_ALLOW_UNPAID=1 skips the paid check,
//    and only when NODE_ENV is not 'production', so the lab can be run
//    without signing in as a paid account on a dev machine.

import { getSessionUser } from '@/lib/supabase/server'
import { isPaidUser } from '@/lib/server/entitlement'

export type LabGate = { ok: true; userId: string | null } | { ok: false; reason: 'disabled' | 'payment required' }

export async function labGenerationGate(): Promise<LabGate> {
  if (process.env.LAB_CONTENT_GENERATION !== '1') return { ok: false, reason: 'disabled' }
  const user = await getSessionUser().catch(() => null)
  if (user && (await isPaidUser(user.id))) return { ok: true, userId: user.id }
  if (process.env.NODE_ENV !== 'production' && process.env.LAB_CONTENT_ALLOW_UNPAID === '1') return { ok: true, userId: user?.id ?? null }
  return { ok: false, reason: 'payment required' }
}
