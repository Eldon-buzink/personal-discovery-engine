'use server'

import { createHash } from 'node:crypto'

// Fire-and-forget Pinterest Conversions API "lead" event for the Ring-1
// assessment start. Server-side only — PINTEREST_CONVERSIONS_TOKEN must
// never reach the browser. No email exists this early in the funnel, so the
// caller passes an anonymous id (persisted client-side) instead.
export async function trackPinterestLead(anonId: string): Promise<void> {
  const adAccountId = process.env.PINTEREST_AD_ACCOUNT_ID
  const token = process.env.PINTEREST_CONVERSIONS_TOKEN
  if (!adAccountId || !token) return

  const hashedId = createHash('sha256').update(anonId.trim().toLowerCase()).digest('hex')

  try {
    const res = await fetch(`https://api.pinterest.com/v5/ad_accounts/${adAccountId}/events`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [{
          event_name: 'lead',
          action_source: 'web',
          event_time: Math.floor(Date.now() / 1000),
          event_id: anonId,
          user_data: { external_id: [hashedId] },
        }],
      }),
    })
    if (!res.ok) console.error('[trackPinterestLead] failed:', res.status, await res.text())
  } catch (err) {
    console.error('[trackPinterestLead] request failed:', err)
  }
}
