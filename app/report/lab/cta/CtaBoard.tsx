'use client'

// Report lab: where the closing panel (option A) sits on the real report,
// per state, with the sticky bar (option A). Labels come from reportCta(),
// the same function the report would use, so bar and panel always agree.
// Placement 1: the panel closes the page, after the "What's next" cards.
// Placement 2: the panel opens "What's next", right after the first section.
// Ring: the colourful border of the branch suggestion card, still or moving.

import { type } from '@/lib/design/type'
import { reportCta, type Cta, type CtaInput, type CtaState } from '@/lib/known/reportCta'
import { BRANCH_EXPLORE_LABELS } from '@/components/known/ReportSections'

const ink = '#262420'
const soft = '#56534D'
const line = '#E5E1D5'

export type Ring = 'still' | 'moving' | 'none'

const OTHERS = ['relationships', 'energy'] as const

export const STATES: { state: CtaState; input: Partial<CtaInput> }[] = [
  { state: 'not-started', input: { isSample: true } },
  { state: 'free-in-progress', input: { revealed: 3 } },
  { state: 'free-locked', input: { revealed: 5 } },
  { state: 'paid-in-progress', input: { isPaid: true, revealed: 30, ring1Complete: true, branchInProgress: 'working_style', suggestion: 'environment', otherBranches: [...OTHERS] } },
  { state: 'paid-suggestion', input: { isPaid: true, revealed: 30, ring1Complete: true, suggestion: 'environment', otherBranches: [...OTHERS] } },
  { state: 'paid-done', input: { isPaid: true, revealed: 30, ring1Complete: true } },
]

const BASE: CtaInput = { isSample: false, isPaid: false, revealed: 0, ring1Complete: false, branchInProgress: null, suggestion: null, exploreLabel: (b) => BRANCH_EXPLORE_LABELS[b] }

// Panel copy per state: one headline and one line. No pricing claims.
const PANEL: Record<CtaState, { title: string; line: string }> = {
  'not-started': { title: '[LAB COPY] Your own report starts here', line: '[LAB COPY] Answer a few statements at your own pace. Your traits come into view one by one, and the first five are free.' },
  'free-in-progress': { title: "[LAB COPY] There's more of you to find", line: '[LAB COPY] Every few answers bring another trait into view. The full picture then shows how they play out in how you connect, work and spend your energy.' },
  'free-locked': { title: '[LAB COPY] This is only the beginning', line: "[LAB COPY] Your first five traits are a start. The full picture adds the other 25, and five new parts of your life: your surroundings, how you connect, your energy, how you work and where you're headed." },
  'paid-in-progress': { title: '[LAB COPY] Your picture is still filling in', line: '[LAB COPY] Your answers are saved. Pick up where you left off, or start another part whenever you like.' },
  'paid-suggestion': { title: '[LAB COPY] Where to look next', line: "[LAB COPY] Take-charge and Analytical stand out in your answers. It's worth seeing how that shows up in the places you spend your days." },
  'paid-done': { title: "[LAB COPY] You've explored every part", line: '[LAB COPY] Your report keeps growing with you. Practice is where it turns into small changes, one day at a time.' },
}

const BAR_LINE: Record<CtaState, string> = {
  'not-started': '[LAB COPY] This is an example. Yours starts free, at your own pace.',
  'free-in-progress': '[LAB COPY] 3 traits so far. The next one is a few answers away.',
  'free-locked': "[LAB COPY] Five traits in, and there's so much more of you to see.",
  'paid-in-progress': '[LAB COPY] Your answers are saved. Carry on when you are ready.',
  'paid-suggestion': '[LAB COPY] Your answers point to your surroundings next.',
  'paid-done': '[LAB COPY] Every part explored. Keep it going in practice.',
}

const Btn = ({ primary, small, children }: { primary?: boolean; small?: boolean; children: React.ReactNode }) => (
  <button type="button" style={{ ...type.ui, minHeight: small ? 36 : 44, padding: small ? '0 14px' : '0 18px', borderRadius: 999, border: primary ? 0 : `1px solid ${line}`, background: primary ? ink : '#FFFFFF', color: primary ? '#F7F4ED' : ink, whiteSpace: 'nowrap', cursor: 'pointer' }}>{children}</button>
)

// The same border as BranchSuggestionCard: a 2px gradient ring and a soft glow.
function RingFrame({ ring, children }: { ring: Ring; children: React.ReactNode }) {
  if (ring === 'none') return <div style={{ borderRadius: 20, background: '#FFFFFF', boxShadow: '0 8px 24px rgba(38,36,32,0.06)' }}>{children}</div>
  return (
    <div className={ring === 'moving' ? 'cta-ring-moving' : undefined} style={{
      padding: 2, borderRadius: 20,
      background: 'linear-gradient(135deg, hsl(175,65%,55%), hsl(205,65%,60%), hsl(235,60%,65%), hsl(290,55%,60%), hsl(8,65%,60%), hsl(35,70%,58%))',
      backgroundSize: ring === 'moving' ? '300% 300%' : '100% 100%',
      boxShadow: '0 0 20px 2px hsla(175,65%,55%,0.25), 0 0 40px 4px hsla(205,65%,60%,0.15)',
    }}>
      <div style={{ background: '#FFFFFF', borderRadius: 18 }}>{children}</div>
    </div>
  )
}

function Panel({ cta, ring }: { cta: Cta; ring: Ring }) {
  const c = PANEL[cta.state]
  return (
    <section style={{ marginTop: 28 }}>
      <RingFrame ring={ring}>
        <div style={{ padding: '28px 22px', textAlign: 'center' }}>
          <h2 style={{ ...type.display3, color: ink, margin: '0 0 8px' }}>{c.title}</h2>
          <p style={{ ...type.body, color: soft, margin: '0 auto 18px', maxWidth: 440 }}>{c.line}</p>
          <Btn primary>{cta.primary.label}</Btn>
          {cta.state === 'free-in-progress' && cta.secondary && (
            <p style={{ margin: '4px 0 0' }}><button type="button" style={{ ...type.ui, background: 'none', border: 0, color: ink, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer', minHeight: 44 }}>{cta.secondary.label}</button></p>
          )}
          {cta.choices.length > 0 && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${line}` }}>
              <p style={{ ...type.meta, margin: '0 0 10px' }}>Or choose another</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {cta.choices.map((a) => <Btn key={a.label} small>{a.label}</Btn>)}
              </div>
            </div>
          )}
        </div>
      </RingFrame>
    </section>
  )
}

function Block({ label, h }: { label: string; h: number }) {
  return <div aria-hidden="true" style={{ height: h, borderRadius: 14, background: '#EFEBE2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8C8A83', fontSize: 13, marginTop: 12 }}>{label}</div>
}

export function Bar({ cta, mobile }: { cta: Cta; mobile: boolean }) {
  return (
    <div style={{ marginTop: 24, background: 'rgba(247,244,237,0.96)', borderTop: `1px solid ${line}`, padding: '12px 16px' }}>
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

export default function CtaBoard({ state, placement, ring, mobile }: { state: CtaState; placement: '1' | '2'; ring: Ring; mobile: boolean }) {
  const s = STATES.find((x) => x.state === state) ?? STATES[2]
  const cta = reportCta({ ...BASE, ...s.input })
  return (
    <main style={{ minHeight: '100vh', background: '#F7F4ED', padding: '24px 16px 0' }}>
      <style>{`.cta-ring-moving{animation:gradientRotate 4s ease infinite}@media (prefers-reduced-motion: reduce){.cta-ring-moving{animation:none}}`}</style>
      <p style={{ ...type.meta, textAlign: 'center', margin: '0 0 12px' }}>Report lab · placement {placement}, ring {ring}, {state}</p>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <Block label="Who you are (visual and card)" h={420} />
        {placement === '2' && <Panel cta={cta} ring={ring} />}
        <p style={{ ...type.meta, textAlign: 'center', margin: '28px 0 0' }}>What&apos;s next</p>
        <Block label="Practice card" h={120} />
        <Block label="Keep discovering / Fully mapped" h={100} />
        {placement === '1' && <Panel cta={cta} ring={ring} />}
        <Block label="Footer note" h={40} />
      </div>
      <Bar cta={cta} mobile={mobile} />
      <p style={{ ...type.meta, textAlign: 'center', margin: '8px 0 24px' }}>The sticky bar, shown at the end for reference. On the page it sits at the bottom of the screen and hides while the panel is in view.</p>
    </main>
  )
}
