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

export default function Closing() {
  const { startedUnfinished } = useVisitor()
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: finalCSS }} />
      <FinalCtaSection startedUnfinished={startedUnfinished} />
    </>
  )
}
