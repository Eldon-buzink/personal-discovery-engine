'use client'

// Report lab: sticky bar and closing panel options, per state.
// States: not started, in progress (before the lock), locked at 5, paid
// with Ring 1 unfinished, paid with Ring 1 finished. Button labels are the
// ones given; everything else new is [LAB COPY]. The paid-finished primary
// is the suggested branch (suggestNextBranch on the example, the same
// helper the report uses), with the report's own "Start …" wording.
//
// part=bar|panel shows one piece forced visible. part=demo is a short fake
// report page with the real show/hide rules: the bar appears once the first
// trait card has been seen, hides while the closing panel is in view, and
// hides while a picker, a dialog or the paywall is open (it never covers
// them).

import { useEffect, useRef, useState } from 'react'
import { type } from '@/lib/design/type'
import { suggestNextBranch } from '@/lib/known/branchSuggestion'
import { EXAMPLE_BANDS, EXAMPLE_CARDS } from '@/lib/known/exampleReport'
import { facetTraitWords } from '@/lib/known/scoring'
import { BRANCH_DISPLAY_NAMES } from '@/components/known/ReportSections'
import { LAB_PRACTICE_COUNT } from '@/lib/lab/filterLab'

import type { BarState } from '@/lib/lab/barStates'

const ink = '#262420'
const soft = '#56534D'
const line = '#E5E1D5'

function suggestedBranch(): { label: string; reason: string } {
  const entries = Object.keys(EXAMPLE_BANDS).map((facet) => ({ facet, traitWord: facetTraitWords(facet)![EXAMPLE_BANDS[facet]], scoreDirection: EXAMPLE_BANDS[facet], branch: 'ring1', content: EXAMPLE_CARDS[facet] }))
  const s = suggestNextBranch(entries, [])
  return s ? { label: BRANCH_DISPLAY_NAMES[s.branch], reason: s.reason } : { label: 'Your environment', reason: '' }
}

function copyFor(state: BarState) {
  const branch = suggestedBranch()
  switch (state) {
    case 'not-started': return {
      bar: '[LAB COPY] About 15 minutes. Your first traits appear as you answer.', primary: 'Start free', secondary: null,
      title: '[LAB COPY] See your first traits', body: '[LAB COPY] Answer a few statements at a time. Your first five traits are free.',
    }
    case 'in-progress': return {
      bar: '[LAB COPY] 3 of your 5 free traits so far.', primary: 'Continue', secondary: null,
      title: '[LAB COPY] Keep going', body: '[LAB COPY] Two more traits to go before your free report is complete.',
    }
    case 'locked': return {
      bar: '[LAB COPY] You have your 5 free traits.', primary: 'Unlock all 30 traits', secondary: 'Start your practice',
      title: '[LAB COPY] See the rest of your report', body: `[LAB COPY] All 30 traits, one payment. Or start practising with ${LAB_PRACTICE_COUNT} of them now.`,
    }
    case 'paid-unfinished': return {
      bar: '[LAB COPY] 12 of 30 traits so far.', primary: 'Continue', secondary: 'Practice',
      title: '[LAB COPY] Finish your first ring', body: '[LAB COPY] 18 traits to go. Your practice can start now with the ones you have.',
    }
    case 'paid-done': return {
      bar: branch.reason || '[LAB COPY] Your first ring is complete.', primary: `Start ${branch.label}`, secondary: 'Practice',
      title: '[LAB COPY] Your first ring is complete', body: branch.reason || '[LAB COPY] Pick what to look at next.',
    }
  }
}

function Primary({ children }: { children: React.ReactNode }) {
  return <button type="button" className="bf-primary">{children}</button>
}
function Secondary({ children }: { children: React.ReactNode }) {
  return <button type="button" className="bf-secondary">{children}</button>
}

export function Bar({ option, state, mobile }: { option: 'A' | 'B'; state: BarState; mobile: boolean }) {
  const c = copyFor(state)
  if (option === 'A') {
    // A: a full-width bar on the bottom edge, text on the left, buttons right (stacked on a phone).
    return (
      <div className="bf-bar-a" role="region" aria-label="[LAB COPY] Next step">
        <div className="bf-bar-a-inner" style={{ flexDirection: mobile ? 'column' : 'row', alignItems: mobile ? 'stretch' : 'center' }}>
          <p style={{ ...type.meta, color: soft, margin: 0, textAlign: mobile ? 'center' : 'left', flex: 1 }}>{c.bar}</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
            {c.secondary && <Secondary>{c.secondary}</Secondary>}
            <Primary>{c.primary}</Primary>
          </div>
        </div>
      </div>
    )
  }
  // B: a compact floating pill, centred, buttons only.
  return (
    <div className="bf-bar-b" role="region" aria-label="[LAB COPY] Next step">
      <Primary>{c.primary}</Primary>
      {c.secondary && <Secondary>{c.secondary}</Secondary>}
    </div>
  )
}

export function Panel({ option, state }: { option: 'A' | 'B'; state: BarState }) {
  const c = copyFor(state)
  const inner = (
    <>
      <h2 style={{ ...type.display3, color: ink, margin: '0 0 8px' }}>{c.title}</h2>
      <p style={{ ...type.body, color: soft, margin: '0 auto 18px', maxWidth: 420 }}>{c.body}</p>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <Primary>{c.primary}</Primary>
        {c.secondary && <Secondary>{c.secondary}</Secondary>}
      </div>
    </>
  )
  // A: a contained card. B: an open section under a hairline, no box.
  return option === 'A'
    ? <section className="bf-panel-a" data-closing-panel>{inner}</section>
    : <section className="bf-panel-b" data-closing-panel>{inner}</section>
}

export default function BarFrame({ option, state, part }: { option: 'A' | 'B'; state: BarState; part: string }) {
  const [mobile, setMobile] = useState(false)
  useEffect(() => { const m = () => setMobile(window.innerWidth < 700); m(); window.addEventListener('resize', m); return () => window.removeEventListener('resize', m) }, [])
  return (
    <main className="bf">
      <style dangerouslySetInnerHTML={{ __html: BF_CSS }} />
      <p style={{ ...type.meta, textAlign: 'center', margin: '0 0 18px' }}>Report lab · {part === 'panel' ? 'Closing panel' : part === 'demo' ? 'Behaviour demo' : 'Sticky bar'} {option}, {state}</p>
      {part === 'bar' && (
        <>
          <div className="bf-fake" aria-hidden="true">[report content]</div>
          <Bar option={option} state={state} mobile={mobile} />
        </>
      )}
      {part === 'panel' && <Panel option={option} state={state} />}
      {part === 'demo' && <Demo option={option} state={state} mobile={mobile} />}
    </main>
  )
}

function Demo({ option, state, mobile }: { option: 'A' | 'B'; state: BarState; mobile: boolean }) {
  const firstRef = useRef<HTMLDivElement>(null)
  const [seen, setSeen] = useState(false)
  const [panelInView, setPanelInView] = useState(false)
  const [overlay, setOverlay] = useState<null | 'picker' | 'dialog' | 'paywall'>(null)
  useEffect(() => {
    const first = firstRef.current
    const panel = document.querySelector('[data-closing-panel]')
    if (!first || !panel) return
    const io1 = new IntersectionObserver(([e]) => { if (e.isIntersecting) setSeen(true) }, { threshold: 0.4 })
    const io2 = new IntersectionObserver(([e]) => setPanelInView(e.isIntersecting), { threshold: 0.01 })
    io1.observe(first); io2.observe(panel)
    return () => { io1.disconnect(); io2.disconnect() }
  }, [])
  const visible = seen && !panelInView && !overlay
  return (
    <>
      <div className="bf-hero" aria-hidden="true">[blobs]</div>
      <div ref={firstRef} className="bf-card" data-first-trait>
        <p style={{ ...type.traitWord, margin: '0 0 6px' }}>Take-charge</p>
        <p style={{ ...type.body, color: soft, margin: 0 }}>When a group needs direction, you naturally step in and shape where things go.</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14 }}>
          <button type="button" className="bf-secondary" onClick={() => setOverlay('picker')}>[demo] Open the picker</button>
          <button type="button" className="bf-secondary" onClick={() => setOverlay('dialog')}>[demo] Open a dialog</button>
          <button type="button" className="bf-secondary" onClick={() => setOverlay('paywall')}>[demo] Open the paywall</button>
        </div>
      </div>
      <div className="bf-fake tall" aria-hidden="true">[more of the report]</div>
      <Panel option={option} state={state} />
      <div style={{ height: 120 }} />
      {visible && <Bar option={option} state={state} mobile={mobile} />}
      {overlay && (
        <div className="bf-overlay" role="dialog" aria-modal="true" aria-label={`[demo] ${overlay}`} data-overlay={overlay}>
          <div className="bf-overlay-box">
            <p style={{ ...type.ui, margin: '0 0 12px' }}>[demo] {overlay === 'picker' ? 'Showing menu' : overlay === 'dialog' ? 'What this is based on' : 'Paywall'}</p>
            <button type="button" className="bf-primary" onClick={() => setOverlay(null)}>[demo] Close</button>
          </div>
        </div>
      )}
      <p id="bf-state" style={{ display: 'none' }}>{JSON.stringify({ seen, panelInView, overlay, visible })}</p>
    </>
  )
}

const BF_CSS = `
  body{background:#F7F4ED;}
  .bf{min-height:100vh;background:#F7F4ED;color:${ink};padding:28px 16px 140px;text-align:center;}
  .bf-fake{max-width:520px;margin:0 auto;height:420px;border-radius:16px;background:#EFEBE2;display:flex;align-items:center;justify-content:center;color:#8C8A83;font-family:var(--font-body);font-size:13px;}
  .bf-fake.tall{height:900px;margin-top:24px;}
  .bf-hero{max-width:520px;margin:0 auto 24px;height:880px;border-radius:16px;background:#EFEBE2;display:flex;align-items:center;justify-content:center;color:#8C8A83;font-family:var(--font-body);font-size:13px;}
  .bf-card{max-width:520px;margin:0 auto;}
  .bf-primary{min-height:44px;padding:0 20px;border-radius:999px;border:0;background:${ink};color:#F7F4ED;cursor:pointer;font-family:var(--font-body);font-size:var(--text-ui);font-weight:500;white-space:nowrap;}
  .bf-secondary{min-height:44px;padding:0 14px;border-radius:999px;border:1px solid ${line};background:#FFFFFF;color:${ink};cursor:pointer;font-family:var(--font-body);font-size:var(--text-ui);font-weight:500;white-space:nowrap;}
  .bf-primary:focus-visible,.bf-secondary:focus-visible{outline:2px solid #D85A30;outline-offset:2px;}
  .bf-bar-a{position:fixed;left:0;right:0;bottom:0;z-index:40;background:rgba(247,244,237,0.96);border-top:1px solid ${line};padding:12px 16px calc(12px + env(safe-area-inset-bottom));}
  .bf-bar-a-inner{max-width:760px;margin:0 auto;display:flex;gap:12px;}
  .bf-bar-b{position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:40;display:flex;gap:8px;align-items:center;padding:6px;border-radius:999px;background:#FFFFFF;box-shadow:0 8px 24px rgba(38,36,32,0.14);max-width:calc(100vw - 32px);}
  .bf-panel-a{max-width:560px;margin:40px auto 0;padding:28px 22px;border-radius:20px;background:#FFFFFF;box-shadow:0 8px 24px rgba(38,36,32,0.06);}
  .bf-panel-b{max-width:560px;margin:40px auto 0;padding:32px 0 0;border-top:1px solid ${line};}
  .bf-overlay{position:fixed;inset:0;z-index:60;background:rgba(38,36,32,0.35);display:flex;align-items:flex-end;justify-content:center;}
  .bf-overlay-box{width:100%;max-width:560px;background:#F7F4ED;border-radius:18px 18px 0 0;padding:24px;}
`
