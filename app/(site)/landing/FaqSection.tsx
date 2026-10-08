import FaqAccordion, { type FaqAccordionItem } from '../FaqAccordion'

// The FAQ (questions + section), shared by the home page and the
// /start/{facet} mini-assessment landing pages. CSS: faqCSS in
// ./sectionStyles.ts (plus .problem-heading / .mk-eyebrow from each page).

// ─── FAQ ──────────────────────────────────────────────────────────────────────
export const FAQ_ITEMS: FaqAccordionItem[] = [
  {
    question: 'Why should I trust this?',
    answer: 'Bearing is built on the IPIP-NEO-120, a public-domain Big Five inventory published in peer-reviewed research (Johnson, 2014). Everyone answers the same 120 statements, and your scores are calculated directly from your answers. Like any self-report questionnaire, it reflects how you answer, so it describes patterns rather than diagnosing you.',
  },
  {
    question: 'How long does it take?',
    answer: 'About 15 minutes for the 120 statements. Your first patterns usually appear before the halfway point, and you can stop at any time.',
  },
  {
    question: 'What does it cost?',
    answer: 'Your first 5 patterns are free. Unlocking all 30 facets plus five deeper assessments is a one-time payment of EUR 49. There is no subscription.',
  },
  {
    question: 'Is it just AI telling me what I want to hear?',
    answer: "No. Your scores come from the same fixed questionnaire for everyone. AI only writes the explanation of each pattern from your results, and it can't change your scores.",
  },
  {
    question: 'Do I need an account?',
    answer: 'No. Your first 5 patterns need no account. You can optionally save your progress with your email, and an account is needed when you unlock the full report.',
  },
  {
    question: 'Is this therapy or a diagnosis?',
    answer: "No. Bearing describes patterns in how you answered a questionnaire. It isn't therapy, a diagnosis or a substitute for professional support.",
  },
]

// ── FAQ ──────────────────────────────────────────────────────────────────────
// Two columns on desktop, one column (heading above list) at
// <=860px — see .faq-cols. Left column reuses .problem-heading
// as-is (left-aligned 34px serif, same as the Problem section)
// plus a left-aligned "FAQ" eyebrow — no centering inline style
// this time, unlike every other section's eyebrow, since this
// column isn't centered. FAQ items live in FAQ_ITEMS just above
// the component, not inline here, so FaqAccordion's items prop
// stays a plain array reference rather than a new array literal
// on every render.
export default function FaqSection() {
  return (
    <section className="faq-section">
      <div className="wrap">
        <div className="faq-cols">
          <div>
            <div className="mk-eyebrow">FAQ</div>
            <h2 className="problem-heading">Common questions</h2>
          </div>
          <FaqAccordion items={FAQ_ITEMS} />
        </div>
      </div>
    </section>
  )
}
