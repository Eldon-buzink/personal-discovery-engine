// "Why it's different": the two-card comparison (other tools vs Bearing,
// four numbered rows). Shared by the home page and the /start/{facet}
// mini-assessment landing pages, so its copy is the same everywhere. CSS:
// compareCSS in ./sectionStyles.ts.

export default function WhyDifferentSection() {
  return (
    <>
      {/* ── WHY IT'S DIFFERENT ──────────────────────────────────── */}
      {/* Sits right under "Sound familiar?". Same two-card comparison
          layout as before (.compare subgrid, now four rows); copy matches
          the four points of the landing preview's version. */}
      <section className="usp-section">
        <div className="wrap">
          <div className="section-head">
            <div className="mk-eyebrow" style={{ justifyContent:'center', display:'flex' }}>Why it&apos;s different</div>
            <h2>Not just an insight. A way to work with it.</h2>
          </div>

          <div className="compare">
            <div className="compare-card muted">
              <div className="compare-item">
                <div className="compare-head"><span className="compare-num" aria-hidden="true">1</span><div className="mk-eyebrow">Type tests</div></div>
                <p>Sort you into one of a fixed set of four-letter labels.</p>
              </div>
              <div className="compare-item">
                <div className="compare-head"><span className="compare-num" aria-hidden="true">2</span><div className="mk-eyebrow">Most tools</div></div>
                <p>Stop once you&apos;ve seen your results.</p>
              </div>
              <div className="compare-item">
                <div className="compare-head"><span className="compare-num" aria-hidden="true">3</span><div className="mk-eyebrow">Professional assessments</div></div>
                <p>Often need a certified coach to explain what the results mean.</p>
              </div>
              <div className="compare-item">
                <div className="compare-head"><span className="compare-num" aria-hidden="true">4</span><div className="mk-eyebrow">AI chat</div></div>
                <p>Builds on what you tell it.</p>
              </div>
            </div>
            <div className="compare-vs">vs</div>
            <div className="compare-card highlight">
              <div className="compare-item">
                <div className="compare-head"><span className="compare-num" aria-hidden="true">1</span><div className="mk-eyebrow">Patterns, not labels</div></div>
                <p>30 specific patterns, each with its own word, so you see how you actually lean.</p>
              </div>
              <div className="compare-item">
                <div className="compare-head"><span className="compare-num" aria-hidden="true">2</span><div className="mk-eyebrow">Guidance, not just a report</div></div>
                <p>Evening check-ins, recaps, and deeper assessments Bearing suggests, so you keep working with your patterns.</p>
              </div>
              <div className="compare-item">
                <div className="compare-head"><span className="compare-num" aria-hidden="true">3</span><div className="mk-eyebrow">No coach needed</div></div>
                <p>Every pattern comes with its own written explanation, ready to read at your own pace.</p>
              </div>
              <div className="compare-item">
                <div className="compare-head"><span className="compare-num" aria-hidden="true">4</span><div className="mk-eyebrow">Not another AI echo</div></div>
                <p>120 fixed statements from a published Big Five inventory, the same for everyone. AI only explains your scores afterwards and can&apos;t change them.</p>
              </div>
            </div>
          </div>

          <p className="mk-microcopy" style={{ textAlign:'center', marginTop:22 }}>
            Still self-report: Bearing describes patterns, not a diagnosis.
          </p>
        </div>
      </section>
    </>
  )
}
