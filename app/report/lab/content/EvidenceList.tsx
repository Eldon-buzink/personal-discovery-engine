'use client'

// Report lab: "See what this draws on" for a Summary or a cluster reading.
// One row per trait in the (validated) draws_on list: the trait word and its
// direction sentence from evidencePanelData. No answers are repeated here
// (each trait's own card has those), and excluded facets never appear,
// because validateDrawsOn rejects them before anything is shown.

import { useEffect, useRef } from 'react'
import { evidencePanelData } from '@/lib/known/evidencePanel'
import { type } from '@/lib/design/type'
import type { FilterTrait } from '@/lib/lab/filterLab'
import { bandOf } from '@/lib/lab/filterLab'

export function EvidenceList({ open, onClose, title, traits, responses, onPick }: {
  open: boolean
  onClose: () => void
  title: string
  traits: FilterTrait[]
  responses: Map<number, number>
  onPick: (facet: string) => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const returnRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (!open) return
    returnRef.current = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); returnRef.current?.focus() }
  }, [open, onClose])
  if (!open) return null
  return (
    <>
      <div className="evl-backdrop" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="evl-title" className="evl-panel">
        <style dangerouslySetInnerHTML={{ __html: EV_CSS }} />
        <p id="evl-title" style={{ ...type.display4, color: '#262420', margin: '0 0 6px' }}>{title}</p>
        <p style={{ ...type.meta, margin: '0 0 16px' }}>[LAB COPY] The traits this was written from. Tap one to read its card.</p>
        <ul className="evl-list">
          {traits.map((t) => {
            const data = evidencePanelData(t.facet, bandOf(t.facet), responses, false)
            return (
              <li key={t.facet}>
                <button type="button" className="evl-row" onClick={() => { onPick(t.facet); onClose() }}>
                  <span style={{ ...type.traitWord, fontSize: 18, color: '#262420' }}>{t.word}</span>
                  <span style={{ ...type.meta }}>{data?.sentence}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <button ref={closeRef} type="button" className="evl-close" onClick={onClose}>[LAB COPY] Close</button>
      </div>
    </>
  )
}

const EV_CSS = `
  .evl-backdrop{position:fixed;inset:0;z-index:29;background:rgba(38,36,32,0.25);}
  .evl-panel{position:fixed;z-index:30;left:50%;top:50%;transform:translate(-50%,-50%);width:min(440px,calc(100vw - 32px));max-height:calc(100vh - 64px);overflow:auto;
    background:#FFFFFF;border-radius:20px;padding:24px;text-align:center;box-shadow:0 12px 32px rgba(38,36,32,0.14);}
  .evl-list{list-style:none;margin:0 0 16px;padding:0;display:flex;flex-direction:column;gap:4px;}
  .evl-row{width:100%;min-height:44px;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 12px;border:0;border-radius:12px;background:#F7F4ED;cursor:pointer;}
  .evl-close{min-height:44px;white-space:nowrap;padding:0 18px;border-radius:999px;border:1px solid #E5E1D5;background:#FFFFFF;color:#262420;cursor:pointer;font-family:var(--font-body);font-size:var(--text-ui);font-weight:500;}
  .evl-row:focus-visible,.evl-close:focus-visible{outline:2px solid #D85A30;outline-offset:2px;}
`
