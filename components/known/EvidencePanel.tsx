'use client'

import { useEffect, useId, useRef, useState } from 'react'
import BandSpectrum from '@/components/known/BandSpectrum'
import { answersHeading, itemCountLine, type EvidencePanelData } from '@/lib/known/evidencePanel'
import { type } from '@/lib/design/type'
import { DUR_UI, prefersReducedMotion } from '@/lib/design/motion'

// "See what this is based on": an inline, collapsed-by-default panel on a
// Ring 1 trait card. A real <button> (Enter and Space toggle natively) with
// aria-expanded / aria-controls; focus stays on the button. The panel grows
// with height and opacity at the UI duration; reduced motion makes it
// instant (global rule in app/globals.css).
export default function EvidencePanel({ data }: { data: EvidencePanelData }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  // After opening, bring the panel into view only if it ended up below the
  // fold ("nearest", so nothing jumps when it already fits).
  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => {
      const el = panelRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      if (r.bottom > window.innerHeight || r.top < 0) {
        el.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
      }
    }, prefersReducedMotion() ? 0 : DUR_UI)
    return () => window.clearTimeout(t)
  }, [open])

  const answers = data.answers
  const textBlock = { maxWidth: '62ch', margin: '0 auto', textAlign: 'left' as const }

  return (
    <div style={{ marginTop: 18 }}>
      <button
        type="button"
        className="evidence-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        style={{
          ...type.ui, color: '#262420', background: 'transparent',
          display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '0 14px',
          border: '1px solid #DAD3C3', borderRadius: 999, cursor: 'pointer',
        }}
      >
        <span style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>
          {open ? 'Hide what this is based on' : 'See what this is based on'}
        </span>
        <svg
          width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"
          style={{ transition: 'transform var(--dur-ui) var(--ease)', transform: open ? 'rotate(180deg)' : 'none' }}
        >
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div
        id={panelId}
        ref={panelRef}
        role="region"
        aria-label="What this is based on"
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          opacity: open ? 1 : 0,
          visibility: open ? 'visible' : 'hidden',
          transition: `grid-template-rows var(--dur-ui) var(--ease), opacity var(--dur-ui) var(--ease), visibility 0s linear ${open ? '0s' : 'var(--dur-ui)'}`,
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div style={{ ...textBlock, padding: '18px 2px 4px' }}>
            <h3 style={{ ...type.ui, color: '#262420', margin: '0 0 12px' }}>Where you landed</h3>
            {/* 11px side padding: the spectrum centres its end dots on 0% and
                100%, so without it they'd hang half outside the panel. */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', padding: '0 11px', boxSizing: 'border-box' }}>
              <BandSpectrum band={data.direction} labels={data.words} />
            </div>
            <p style={{ ...type.body, color: '#56534D', margin: '12px 0 0' }}>{data.sentence}</p>

            {answers && answers.length > 0 && (
              <>
                <h3 style={{ ...type.ui, color: '#262420', margin: '22px 0 10px' }}>{answersHeading(answers.length)}</h3>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {answers.map((a) => (
                    <li key={a.text} style={{ padding: '12px 14px', borderRadius: 10, background: '#FFFFFF', border: '1px solid #E5E1D5' }}>
                      <p style={{ ...type.body, color: '#262420', margin: 0 }}>&ldquo;{a.text}&rdquo;</p>
                      <p style={{ ...type.ui, color: '#56534D', margin: '4px 0 0' }}>{a.answer}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <p style={{ ...type.meta, margin: '18px 0 0' }}>{itemCountLine(data.itemCount)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
