import 'server-only'

// Report lab: who may run lab generation. Lab only, but it spends money on
// the model, so it is gated like the real thing:
// 0. Lab routes must be enabled (lib/lab/labRoutes.ts): never on any Vercel
//    deployment. Server actions run even when a page's layout would 404, so
//    the action checks this itself.
// 1. LAB_CONTENT_GENERATION=1 must be set on the server.
// 2. Paid check: the signed-in user must have users.is_paid, the same
//    isPaidUser lookup generateRelationshipInsight uses.
//    Local escape hatch: LAB_CONTENT_ALLOW_UNPAID=1 skips the paid check,
//    only where lab routes are enabled (a developer's machine), so the lab
//    can run without signing in as a paid account.

import { getSessionUser } from '@/lib/supabase/server'
import { isPaidUser } from '@/lib/server/entitlement'
import { labRoutesEnabled } from './labRoutes'

export type LabGate = { ok: true; userId: string | null } | { ok: false; reason: 'disabled' | 'payment required' }

export async function labGenerationGate(): Promise<LabGate> {
  if (!labRoutesEnabled() || process.env.LAB_CONTENT_GENERATION !== '1') return { ok: false, reason: 'disabled' }
  const user = await getSessionUser().catch(() => null)
  if (user && (await isPaidUser(user.id))) return { ok: true, userId: user.id }
  if (process.env.LAB_CONTENT_ALLOW_UNPAID === '1') return { ok: true, userId: user?.id ?? null }
  return { ok: false, reason: 'payment required' }
}
