'use client'

/**
 * Landing v3, step 6: the closing call to action, back from the live page
 * ("You already sense there's more to know."), in the hero's style: the
 * same eight blobs behind centred copy, the grey second line in place of
 * the live page's italic tail (italics are for trait words only).
 */

import Link from 'next/link'
import { useEnterOnce } from '@/lib/design/motion'
import { css } from '@/lib/design/type'
import { HeroBlobs } from './V3Client'

export const closingCSS = `
  .vc{position:relative;padding:120px 24px 160px;text-align:center;overflow:hidden;}
  .vc .v3-blobs{top:50%;opacity:0.42;}
  .vc-copy{position:relative;max-width:820px;margin:0 auto;}
  .vc h2{font-family:var(--font-display);font-weight:400;font-size:clamp(38px,4.8vw,64px);line-height:1.06;letter-spacing:-0.03em;margin:0;color:#262420;text-wrap:balance;}
  .vc h2 span{display:block;color:#7d7a72;}
  .vc-link{${css.ui}font-size:15px;display:inline-flex;align-items:center;min-height:52px;padding:0 8px;color:#262420;text-decoration:underline;text-underline-offset:4px;text-decoration-color:rgba(38,36,32,0.35);}
  .vc-link:hover{text-decoration-color:#262420;}
  .vc .v3-ctas{gap:16px;flex-wrap:wrap;}
  @media(max-width:640px){ .vc{padding:88px 16px 112px;} }
`

const arrow = <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9.5M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
const tick = <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7.4l2.6 2.6L11 4.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>

export default function Closing() {
  const ref = useEnterOnce<HTMLDivElement>()
  const d = (ms: number) => ({ ['--d' as string]: `${ms}ms` })
  return (
    <section className="vc">
      <style dangerouslySetInnerHTML={{ __html: closingCSS }} />
      <HeroBlobs />
      <div ref={ref} className="vc-copy">
        <h2 className="v3-in">You already sense<span>there’s more to know.</span></h2>
        <p className="v3-sub v3-in" style={d(100)}>
          Understanding yourself can take years. Bearing gives you a clear starting point in about 15 minutes.
        </p>
        <div className="v3-ctas v3-in" style={d(200)}>
          <Link href="/onboarding" className="v3-btn">Start the assessment {arrow}</Link>
          <Link href="/report/sample" className="vc-link">See a sample report</Link>
        </div>
        <ul className="v3-note v3-in" style={d(260)} aria-label="Before you start">
          {['First 5 patterns free', 'No account to start', 'No credit card'].map((n) => <li key={n}>{tick}{n}</li>)}
        </ul>
      </div>
    </section>
  )
}
