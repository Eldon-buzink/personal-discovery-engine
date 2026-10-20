'use client'

/**
 * Landing, last section: the closing call to action, taken as it is from
 * the old landing page (FinalCtaSection with its own finalCSS). The shared
 * .mk-* classes it uses are in V3Client's CSS. Same "Continue your
 * assessment" swap as the hero and nav.
 */

import { FinalCtaSection } from '@/app/(site)/LandingPageClient'
import { finalCSS } from '@/app/(site)/landing/sectionStyles'
import { useVisitor } from './visitor'

// On a phone: the small print keeps its last words together, and the sample-report link is a
// full 44px tap target. Nothing else of the original section changes.
const CLOSING_FIXES = `
  .final-card .mk-microcopy{display:block;text-wrap:pretty;}
  .final-link{display:inline-flex;align-items:center;min-height:44px;}
`

export default function Closing() {
  const { startedUnfinished } = useVisitor()
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: finalCSS + CLOSING_FIXES }} />
      <FinalCtaSection startedUnfinished={startedUnfinished} />
    </>
  )
}
