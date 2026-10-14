import { NextResponse } from 'next/server'
import { writeSignedCookie } from '@/lib/server/signedCookie'
import { REVEAL_CAP } from '@/lib/known/paywall'
import { INSIGHT_FIXTURES } from '../fixtures'

// Development only: gives this browser the free-reveal cookie for a fixture's
// traits (as if they'd been revealed for free), then hands over to the seed
// page, which fills known_session and opens /report. 404 in production.
export function GET(_request: Request, { params }: { params: { fixture: string } }) {
  if (process.env.NODE_ENV !== 'development') return new NextResponse('Not found', { status: 404 })
  const fixture = INSIGHT_FIXTURES[params.fixture]
  if (!fixture) return new NextResponse('Unknown fixture', { status: 404 })
  writeSignedCookie('bearing_free_reveals', 'free-reveals', JSON.stringify(fixture.traits.map(([facet]) => facet).slice(0, REVEAL_CAP)))
  // Relative redirect, so it stays on whichever host the page was opened on
  // (the cookie is set for that host).
  return new NextResponse(null, { status: 307, headers: { Location: `/dev/insights/seed?f=${encodeURIComponent(params.fixture)}` } })
}
