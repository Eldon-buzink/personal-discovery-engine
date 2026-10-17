'use client'

/**
 * Landing v3, step 6: the closing call to action, taken as it is from the
 * live landing page: FinalCtaSection with its own CSS (finalCSS), plus the
 * three shared classes it uses from the live page's landingCSS (.mk-eyebrow,
 * .mk-microcopy, .mk-btn), copied here unchanged so the rest of
 * landingCSS stays off this page.
 */

import { FinalCtaSection } from '@/app/(site)/LandingPageClient'
import { finalCSS } from '@/app/(site)/landing/sectionStyles'
import { mkCharcoal, mkCream } from '@/app/start/startLandingShared'
import { css } from '@/lib/design/type'

const sharedCSS = `
  .mk-eyebrow{${css.meta}margin-bottom:14px;}
  .mk-microcopy{${css.meta}}
  .mk-btn{${css.ui}background:${mkCharcoal};color:${mkCream};border:none;border-radius:999px;padding:11px 20px;min-height:44px;cursor:pointer;}
`

export default function Closing() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: finalCSS + sharedCSS }} />
      <FinalCtaSection startedUnfinished={false} />
    </>
  )
}
