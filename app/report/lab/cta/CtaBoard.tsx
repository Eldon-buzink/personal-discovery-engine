'use client'

// Report lab: where the closing panel (option A) sits on the real report,
// per state, with the sticky bar (option A). Labels come from reportCta(),
// the same function the report would use, so bar and panel always agree.
// Placement 1: the panel closes the page, after the "What's next" cards.
// Placement 2: the panel opens "What's next", right after the first section;
// the remaining cards follow it.

import { type } from '@/lib/design/type'
import { reportCta, type Cta, type CtaInput, type CtaState } from '@/lib/known/reportCta'
import { BRANCH_EXPLORE_LABELS } from '@/components/known/ReportSections'

const ink = '#262420'
const soft = '#56534D'
const line = '#E5E1D5'

export const STATES: { state: CtaState; input: Partial<CtaInput> }[] = [
  { state: 'not-started', input: { isSample: true } },
  { state: 'free-in-progress', input: { revealed: 3 } },
  { state: 'free-locked', input: { revealed: 5 } },
  { state: 'paid-in-progress', input: { isPaid: true, revealed: 12 } },
  { state: 'paid-suggestion', input: { isPaid: true, revealed: 30, ring1Complete: true, suggestion: 'environment' } },
  { state: 'paid-done', input: { isPaid: true, revealed: 30, ring1Complete: true } },
]

const BASE: CtaInput = { isSample: false, isPaid: false, revealed: 0, ring1Complete: false, branchInProgress: null, suggestion: null, exploreLabel: (b) => BRANCH_EXPLORE_LABELS[b] }

// Panel copy per state: one headline and one line. No pricing claims.
const PANEL: Record<CtaState, { title: string; line: string }> = {
  'not-started': { title: '[LAB COPY] See your own report', line: '[LAB COPY] Answer a few statements at a time. Your first five traits are free.' },
  'free-in-progress': { title: '[LAB COPY] Keep going', line: '[LAB COPY] Each few answers can reveal another trait.' },
  'free-locked': { title: '[LAB COPY] See all 30 of your traits', line: '[LAB COPY] Your first five are here. The other 25 are one step away.' },
  'paid-in-progress': { title: '[LAB COPY] Pick up where you left off', line: '[LAB COPY] Your answers are saved. Carry on whenever you like.' },
  'paid-suggestion': { title: '[LAB COPY] Your first ring is complete', line: '[LAB COPY] Your answers point to what to look at next.' },
  'paid-done': { title: '[LAB COPY] Your report is complete', line: '[LAB COPY] Put what you found into practice, a moment each day.' },
}

const BAR_LINE: Record<CtaState, string> = {
  'not-started': '[LAB COPY] This is an example. Your own report starts free.',
  'free-in-progress': '[LAB COPY] More traits appear as you answer.',
  'free-locked': '[LAB COPY] You have your 5 free traits.',
  'paid-in-progress': '[LAB COPY] Your answers are saved.',
  'paid-suggestion': '[LAB COPY] Your answers point somewhere worth exploring.',
  'paid-done': '[LAB COPY] Everything is mapped.',
}

const Btn = ({ primary, children }: { primary?: boolean; children: React.ReactNode }) => (
  <button type="button" style={{ ...type.ui, minHeight: 44, padding: '0 18px', borderRadius: 999, border: primary ? 0 : `1px solid ${line}`, background: primary ? ink : '#FFFFFF', color: primary ? '#F7F4ED' : ink, whiteSpace: 'nowrap', cursor: 'pointer' }}>{children}</button>
)

function Panel({ cta }: { cta: Cta }) {
  const c = PANEL[cta.state]
  return (
    <section style={{ margin: '28px auto 0', padding: '28px 22px', borderRadius: 20, background: '#FFFFFF', boxShadow: '0 8px 24px rgba(38,36,32,0.06)', textAlign: 'center' }}>
      <h2 style={{ ...type.display3, color: ink, margin: '0 0 8px' }}>{c.title}</h2>
      <p style={{ ...type.body, color: soft, margin: '0 auto 18px', maxWidth: 420 }}>{c.line}</p>
      <Btn primary>{cta.primary.label}</Btn>
    </section>
  )
}

function Block({ label, h }: { label: string; h: number }) {
  return <div aria-hidden="true" style={{ height: h, borderRadius: 14, background: '#EFEBE2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8C8A83', fontSize: 13, marginTop: 12 }}>{label}</div>
}

export function Bar({ cta, mobile }: { cta: Cta; mobile: boolean }) {
  return (
    <div style={{ position: 'sticky', bottom: 0, marginTop: 24, background: 'rgba(247,244,237,0.96)', borderTop: `1px solid ${line}`, padding: '12px 16px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', gap: 12, flexDirection: mobile ? 'column' : 'row', alignItems: mobile ? 'stretch' : 'center' }}>
        <p style={{ ...type.meta, color: soft, margin: 0, flex: 1, textAlign: mobile ? 'center' : 'left' }}>{BAR_LINE[cta.state]}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {cta.secondary && <Btn>{cta.secondary.label}</Btn>}
          <Btn primary>{cta.primary.label}</Btn>
        </div>
      </div>
    </div>
  )
}

export default function CtaBoard({ state, placement, mobile }: { state: CtaState; placement: '1' | '2'; mobile: boolean }) {
  const s = STATES.find((x) => x.state === state) ?? STATES[2]
  const cta = reportCta({ ...BASE, ...s.input })
  return (
    <main style={{ minHeight: '100vh', background: '#F7F4ED', padding: '24px 16px 0' }}>
      <p style={{ ...type.meta, textAlign: 'center', margin: '0 0 12px' }}>Report lab · placement {placement}, {state}</p>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <Block label="Who you are (visual and card)" h={420} />
        {placement === '2' && <Panel cta={cta} />}
        <p style={{ ...type.meta, textAlign: 'center', margin: '28px 0 0' }}>What&apos;s next</p>
        <Block label="Practice card" h={120} />
        <Block label="Keep discovering / Fully mapped" h={100} />
        {placement === '1' && <Panel cta={cta} />}
        <Block label="Footer note" h={40} />
      </div>
      <Bar cta={cta} mobile={mobile} />
      <p style={{ ...type.meta, textAlign: 'center', margin: '8px 0 24px' }}>The bar is shown here for reference; on the page it hides while the panel is in view.</p>
    </main>
  )
}
