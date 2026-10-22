'use client'

// Report lab: one state of the filter concept, rendered at the width it's
// opened at. The board (../page.tsx) shows these side by side at 390 and
// 1280. Fixed settings come from the query (f, hue, menu); the filter and
// the centre trait are live state mirrored into the URL (view, trait) with
// replaceState, so a state can be linked. No zoom, so no history entries.

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { UnlockedContent } from '@/components/known/ReportVisuals'
import EvidenceDialog from '@/components/known/EvidenceDialog'
import { patternSubtitle } from '@/components/known/TraitCarousel'
import { evidencePanelData } from '@/lib/known/evidencePanel'
import { exampleResponses } from '@/lib/known/exampleReport'
import { type } from '@/lib/design/type'
import { DUR_UI, EASE } from '@/lib/design/motion'
import {
  bandOf, cardFor, clusterTraits, CLUSTERS, familyLabel, FAMILY_HUES, filterTraits, freeTraits, topTraits, type FilterTrait,
} from '@/lib/lab/filterLab'
import { ReportCluster } from '../ReportCluster'
import ReferenceAPlus from '../reference/ReferenceAPlus'

export interface FrameQuery {
  f?: string     // paid | free | ref
  hue?: string   // free: trait (default, as live) | cluster
  tone?: string  // paid, inside a cluster: hue | intensity | both | flat
  view?: string  // top | <cluster>
  trait?: string // the centre trait
  menu?: string  // 1 = menu open
}

const ink = '#262420'
const soft = '#56534D'
const line = '#E5E1D5'
const coral = '#D85A30'

const TOP_LABEL = 'Most pronounced'
const viewLabel = (v: string) => (v === 'top' ? TOP_LABEL : familyLabel(v))
const OPTIONS = ['top', ...CLUSTERS]

function writeUrl(view: string, trait: string) {
  const p = new URLSearchParams(window.location.search)
  p.set('view', view)
  p.set('trait', trait)
  window.history.replaceState(window.history.state, '', `${window.location.pathname}?${p.toString()}`)
}

/** Place order for a set: strongest first (the centre), or `trait` first when given. */
function initialOrder(traits: FilterTrait[], trait?: string | null): string[] {
  const order = traits.map((t) => t.facet)
  const i = trait ? order.indexOf(trait) : -1
  if (i > 0) [order[0], order[i]] = [order[i], order[0]]
  return order
}

// ── Radio row (arrow keys, roving tab index) ───────────────────────────────

// In the menu, arrows only move focus (Enter or a tap chooses), so moving
// through the list doesn't close it.
function RadioRow({ label, options, value, onChange, className, render, focusOnly }: {
  focusOnly?: boolean
  label: string
  options: string[]
  value: string
  onChange: (v: string) => void
  className: string
  render: (v: string) => ReactNode
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})
  const onKey = (e: KeyboardEvent) => {
    const current = (document.activeElement as HTMLElement | null)?.dataset.v
    const i = options.indexOf(focusOnly && current ? current : value)
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = options[(i + step + options.length) % options.length]
    if (!focusOnly) onChange(next)
    refs.current[next]?.focus()
  }
  return (
    <div role="radiogroup" aria-label={label} className={className} onKeyDown={onKey}>
      {options.map((o) => (
        <button key={o} ref={(el) => { refs.current[o] = el }} type="button" role="radio" aria-checked={o === value}
          tabIndex={o === value ? 0 : -1} onClick={() => onChange(o)} data-v={o}>
          {render(o)}
        </button>
      ))}
    </div>
  )
}

const Dot = ({ cluster }: { cluster: string }) => (
  <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 999, background: `hsl(${FAMILY_HUES[cluster]},70%,60%)`, flexShrink: 0 }} />
)

const chip = (v: string) => <>{v !== 'top' && <Dot cluster={v} />}<span>{viewLabel(v)}</span></>

// One "Showing: …" button with a menu (popover on desktop, sheet on phone).
// Choosing an option closes the menu; focus goes back to the button.
function ShowingMenu({ view, setView, mobile, startOpen }: { view: string; setView: (v: string) => void; mobile: boolean; startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (open) (menuRef.current?.querySelector('[aria-checked="true"]') as HTMLElement | null)?.focus()
  }, [open])
  const close = () => { setOpen(false); btnRef.current?.focus() }
  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
      <button ref={btnRef} type="button" className="ff-showing" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span style={{ color: '#8C8A83' }}>[LAB COPY] Showing:</span> {view !== 'top' && <Dot cluster={view} />}<span>{viewLabel(view)}</span>
        <span aria-hidden="true" style={{ marginLeft: 2 }}>⌄</span>
      </button>
      {open && (
        <>
          {mobile && <div className="ff-backdrop" onClick={close} />}
          <div ref={menuRef} className={mobile ? 'ff-sheet' : 'ff-pop'} onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); close() } }}>
            <RadioRow label="Show" options={OPTIONS} value={view} onChange={(v) => { setView(v); close() }} className="ff-menu" render={chip} focusOnly />
          </div>
        </>
      )}
    </div>
  )
}

// The trait card under the visual, for the centre trait. Placeholder: what
// goes here is still open.
function TraitDetail({ t, hue, responses }: { t: FilterTrait; hue: number; responses: Map<number, number> }) {
  return (
    <UnlockedContent
      traitWord={t.word}
      content={cardFor(t.facet)}
      hue={hue}
      subtitle={patternSubtitle(t.revealIndex)}
      source={null}
      variant="ring1"
      evidence={<EvidenceDialog key={t.facet} data={evidencePanelData(t.facet, bandOf(t.facet), responses, true)} />}
    />
  )
}

// ── The frame ──────────────────────────────────────────────────────────────

export default function FilterFrame({ q }: { q: FrameQuery }) {
  const f = q.f ?? 'paid'
  const [mobile, setMobile] = useState(false)
  useEffect(() => { const m = () => setMobile(window.innerWidth < 700); m(); window.addEventListener('resize', m); return () => window.removeEventListener('resize', m) }, [])
  const all = useMemo(filterTraits, [])
  const responses = useMemo(exampleResponses, [])
  // Free users keep the live per-trait hues (no clusters for them). Paid:
  // hue = cluster; inside one cluster the six blobs can vary by a small hue
  // step within the family and/or by intensity (how pronounced).
  const hueMode = f === 'free' && q.hue !== 'cluster' ? 'trait' : 'cluster'
  const tone = q.tone ?? 'both'

  const [view, setViewState] = useState(f === 'free' ? 'top' : q.view ?? 'top')
  const setOf = (v: string) => (f === 'free' ? freeTraits(all) : v === 'top' ? topTraits(all) : clusterTraits(all, v))
  const [order, setOrder] = useState(() => initialOrder(setOf(view), q.trait))
  const byFacet = new Map(all.map((t) => [t.facet, t]))
  const traits = order.map((k) => byFacet.get(k)!)
  const centre = traits[0]
  const inCluster = f !== 'free' && view !== 'top'
  const rank = new Map(setOf(view).map((t, i) => [t.facet, i]))
  const HUE_STEPS = [0, 10, -10, 18, -18, 5]
  const hueOf = (t: FilterTrait) => {
    if (hueMode === 'trait') return t.traitHue
    if (inCluster && (tone === 'hue' || tone === 'both')) return (t.clusterHue + HUE_STEPS[rank.get(t.facet) ?? 0] + 360) % 360
    return t.clusterHue
  }
  const opacityOf = inCluster && (tone === 'intensity' || tone === 'both')
    ? (t: FilterTrait) => 0.45 + 0.55 * Math.sqrt(t.strength / 2)
    : undefined

  const select = (facet: string) => {
    const next = [...order]
    const i = next.indexOf(facet)
    ;[next[0], next[i]] = [next[i], next[0]]
    setOrder(next)
    if (f !== 'free') writeUrl(view, facet)
  }
  const setView = (v: string) => {
    const next = initialOrder(setOf(v))
    setViewState(v)
    setOrder(next)
    writeUrl(v, next[0])
  }

  if (f === 'ref') return <Shell caption="Reference: the A+ mock from commit a138942 (branch report-options), as it was"><ReferenceAPlus /></Shell>

  const caption = f === 'free'
    ? `Free, 5 traits, ${hueMode === 'trait' ? 'per-trait hues (as live)' : 'cluster hues'}, no filter`
    : `Paid, ${viewLabel(view)}, ${centre.word} in the centre${inCluster ? `, colour: ${tone}` : ''}`

  return (
    <Shell caption={caption}>
      {f !== 'free' && (
        <div className="ff-control">
          <ShowingMenu view={view} setView={setView} mobile={mobile} startOpen={q.menu === '1'} />
        </div>
      )}
      <div className="ff-col">
        <ReportCluster traits={traits} hueOf={hueOf} opacityOf={opacityOf} onSelect={select} />
      </div>
      <div className="ff-under"><TraitDetail t={centre} hue={hueOf(centre)} responses={responses} /></div>
    </Shell>
  )
}

function Shell({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <main className="ff">
      <style dangerouslySetInnerHTML={{ __html: FF_CSS }} />
      <p style={{ ...type.meta, textAlign: 'center', margin: '0 0 20px' }}>Report lab · {caption}</p>
      {children}
    </main>
  )
}

const FF_CSS = `
  body{background:#F7F4ED;}
  .ff{min-height:100vh;background:#F7F4ED;color:${ink};padding:28px 16px 64px;text-align:center;}
  .ff-col{max-width:520px;margin:0 auto;}
  .ff-control{max-width:760px;margin:0 auto 16px;}
  .ff-under{max-width:520px;margin:24px auto 0;}
  .ff button:focus-visible{outline:2px solid ${coral};outline-offset:2px;}
  .ff-showing{display:inline-flex;align-items:center;gap:8px;min-height:44px;white-space:nowrap;max-width:100%;padding:0 18px;border-radius:999px;border:1px solid ${line};background:#FFFFFF;color:${ink};cursor:pointer;
    font-family:var(--font-body);font-size:var(--text-ui);font-weight:500;}
  .ff-pop{position:absolute;top:52px;left:50%;transform:translateX(-50%);z-index:20;background:#FFFFFF;border:1px solid ${line};border-radius:16px;padding:8px;
    box-shadow:0 8px 24px rgba(38,36,32,0.10);}
  .ff-sheet{position:fixed;left:0;right:0;bottom:0;z-index:20;background:#FFFFFF;border-radius:20px 20px 0 0;padding:16px 16px 28px;box-shadow:0 -8px 24px rgba(38,36,32,0.10);}
  .ff-backdrop{position:fixed;inset:0;z-index:19;background:rgba(38,36,32,0.25);}
  .ff-menu{display:flex;flex-direction:column;gap:4px;align-items:stretch;}
  .ff-menu button{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 14px;border:0;border-radius:12px;background:#FFFFFF;color:${soft};cursor:pointer;
    white-space:nowrap;justify-content:flex-start;font-family:var(--font-body);font-size:var(--text-ui);font-weight:500;transition:background ${DUR_UI}ms ${EASE},color ${DUR_UI}ms ${EASE};}
  .ff-menu button[aria-checked="true"]{background:#F2EEE5;color:${ink};}
`
