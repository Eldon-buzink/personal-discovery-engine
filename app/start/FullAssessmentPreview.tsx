import Link from 'next/link'
import { mkPeriwinkle, mkRose } from './startLandingShared'

// "Free preview" closing section for the /start/{facet} pages: the home
// page's dark final-CTA card (finalCSS), pointed at the full assessment
// rather than the quick check. Same on every mini page. Copy only restates
// what the home page already says (120 statements, IPIP-NEO-120, 30
// traits with written explanations, first 5 free, no account needed).
export default function FullAssessmentPreview() {
  return (
    <section className="final-outer">
      <div className="final-card">
        <div className="final-glow" style={{ width: 280, height: 280, background: mkPeriwinkle, top: -80, left: -80 }} />
        <div className="final-glow" style={{ width: 260, height: 260, background: mkRose, bottom: -90, right: -70 }} />
        <div className="final-content">
          <div className="mk-eyebrow" style={{ justifyContent: 'center', display: 'flex' }}>Free preview · about 15 minutes</div>
          <h2>One trait is a start.<em>The full assessment maps all 30.</em></h2>
          <p>
            Rate 120 short statements from the IPIP-NEO-120, a public-domain Big Five inventory. Every trait gets its own
            word and a written explanation, so you see the whole pattern, not just one part of it.
          </p>
          <div className="final-cta-row">
            <Link href="/onboarding">
              <button className="mk-btn">Start the full assessment</button>
            </Link>
            <Link href="/report/sample" className="final-link">
              See a sample report
            </Link>
          </div>
          <span className="mk-microcopy">Your first 5 patterns are free · No account needed to start</span>
        </div>
      </div>
    </section>
  )
}
