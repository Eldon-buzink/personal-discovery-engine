'use client'

// The report's next step (NEXT_PUBLIC_REPORT_CTA): a closing panel at the end
// of "What's next", framed by the branch card's colourful ring, and a sticky
// bar. Both take their buttons from reportCta(), so an action has one label
// everywhere on the page.
//
// The bar appears once the first section has been seen, and hides while the
// panel is on screen or anything is open over the page: a dialog, a menu or
// an evidence panel (anything with aria-modal, role="dialog" or an expanded
// aria-haspopup control), or the paywall (passed in, as it has no dialog role).

import { useEffect, useState, type RefObject } from 'react'
import { type } from '@/lib/design/type'
import type { Cta, CtaAction } from '@/lib/known/reportCta'
import type { CtaCopy } from '@/lib/known/reportCtaCopy'

const ink = '#262420'
const soft = '#56534D'
const cream = '#F7F4ED'
const line = '#E5E1D5'

const css = `
  .rcta-ring{padding:2px;border-radius:20px;background:linear-gradient(135deg,hsl(175,65%,55%),hsl(205,65%,60%),hsl(235,60%,65%),hsl(290,55%,60%),hsl(8,65%,60%),hsl(35,70%,58%));background-size:300% 300%;animation:gradientRotate 4s ease infinite;box-shadow:0 0 20px 2px hsla(175,65%,55%,0.25),0 0 40px 4px hsla(205,65%,60%,0.15)}
  .rcta-bar{position:fixed;left:0;right:0;bottom:0;z-index:40;background:${cream};border-top:1px solid ${line};padding:12px 16px calc(12px + env(safe-area-inset-bottom));transition:transform var(--dur-ui) var(--ease),opacity var(--dur-ui) var(--ease)}
  .rcta-bar[data-hidden="true"]{transform:translateY(100%);opacity:0;pointer-events:none;visibility:hidden}
  .rcta-btn{font:inherit;min-height:44px;border-radius:999px;cursor:pointer;white-space:nowrap;padding:0 18px}
  .rcta-btn:focus-visible{outline:2px solid ${ink};outline-offset:2px}
  @media (max-width:699px){.rcta-bar-row{flex-direction:column;align-items:stretch}.rcta-bar-line{text-align:center}.rcta-bar .rcta-btn{flex:1 1 0;min-width:0;white-space:normal;padding:6px 12px}}
  @media (prefers-reduced-motion: reduce){.rcta-ring{animation:none;background-size:100% 100%}.rcta-bar{transition:none}}
`

function Btn({ a, primary, small, onAction }: { a: CtaAction; primary?: boolean; small?: boolean; onAction: (a: CtaAction) => void }) {
  return (
    <button
      type="button"
      className="rcta-btn"
      onClick={() => onAction(a)}
      style={{ ...type.ui, minHeight: small ? 36 : 44, padding: small ? '0 14px' : undefined, border: primary ? 0 : `1px solid ${line}`, background: primary ? ink : '#FFFFFF', color: primary ? cream : ink }}
    >
      {a.label}
    </button>
  )
}

export function ReportCtaPanel({ cta, copy, onAction, panelRef }: { cta: Cta; copy: CtaCopy; onAction: (a: CtaAction) => void; panelRef?: RefObject<HTMLElement> }) {
  // Free users who are still answering get the upgrade as a quiet link here;
  // it is a button on the bar.
  const link = cta.state === 'free-in-progress' ? cta.secondary : null
  return (
    <section ref={panelRef} style={{ marginTop: 28 }}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="rcta-ring">
        <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '28px 22px', textAlign: 'center' }}>
          <h2 style={{ ...type.display3, color: ink, margin: '0 0 8px' }}>{copy.title}</h2>
          <p style={{ ...type.body, color: soft, margin: '0 auto 18px', maxWidth: 440 }}>{copy.line}</p>
          <Btn a={cta.primary} primary onAction={onAction} />
          {link && (
            <p style={{ margin: '4px 0 0' }}>
              <button type="button" className="rcta-btn" onClick={() => onAction(link)} style={{ ...type.ui, background: 'none', border: 0, color: ink, textDecoration: 'underline', textUnderlineOffset: 3 }}>{link.label}</button>
            </p>
          )}
          {cta.choices.length > 0 && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${line}` }}>
              <p style={{ ...type.meta, margin: '0 0 10px' }}>Or choose another</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {cta.choices.map((a) => <Btn key={a.label} a={a} small onAction={onAction} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export function ReportCtaBar({ cta, copy, onAction, hidden }: { cta: Cta; copy: CtaCopy; onAction: (a: CtaAction) => void; hidden: boolean }) {
  return (
    <div className="rcta-bar" data-hidden={hidden} aria-hidden={hidden}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="rcta-bar-row" style={{ maxWidth: 760, margin: '0 auto', display: 'flex', gap: 12, alignItems: 'center' }}>
        <p className="rcta-bar-line" style={{ ...type.meta, color: soft, margin: 0, flex: 1 }}>{copy.barLine}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {cta.secondary && <Btn a={cta.secondary} onAction={onAction} />}
          <Btn a={cta.primary} primary onAction={onAction} />
        </div>
      </div>
    </div>
  )
}

const OVERLAY = '[aria-modal="true"], [role="dialog"], [aria-haspopup][aria-expanded="true"]'

/** Whether the sticky bar should be hidden right now. */
export function useCtaBarHidden(firstRef: RefObject<HTMLElement>, panelRef: RefObject<HTMLElement>, blocked: boolean): boolean {
  const [seen, setSeen] = useState(false)
  const [panelInView, setPanelInView] = useState(false)
  const [overlay, setOverlay] = useState(false)

  useEffect(() => {
    const first = firstRef.current, panel = panelRef.current
    const io1 = new IntersectionObserver(([e]) => { if (e.boundingClientRect.top < 0 || e.intersectionRatio > 0.4) setSeen(true) }, { threshold: [0, 0.4] })
    const io2 = new IntersectionObserver(([e]) => setPanelInView(e.isIntersecting), { threshold: 0.15 })
    if (first) io1.observe(first)
    if (panel) io2.observe(panel)
    return () => { io1.disconnect(); io2.disconnect() }
  })

  useEffect(() => {
    const check = () => setOverlay(!!document.querySelector(OVERLAY))
    check()
    const mo = new MutationObserver(check)
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-expanded', 'aria-modal', 'role'] })
    return () => mo.disconnect()
  }, [])

  return !seen || panelInView || overlay || blocked
}
