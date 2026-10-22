'use client'

// Report lab: one state of the filter concept, rendered at the width it's
// opened at. The board (../page.tsx) shows these side by side at 390 and
// 1280. Fixed settings come from the query (f, c, z, s, k, hue); the filter
// and the zoomed trait are live state mirrored into the URL (view, trait):
// zooming in pushes a history entry, so browser Back zooms out; changing the
// filter replaces the entry.

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { UnlockedContent } from '@/components/known/ReportVisuals'
import EvidenceDialog from '@/components/known/EvidenceDialog'
import { TraitCarousel, patternSubtitle } from '@/components/known/TraitCarousel'
import { evidencePanelData } from '@/lib/known/evidencePanel'
import { exampleResponses } from '@/lib/known/exampleReport'
import { evidenceSentence } from '@/lib/known/relationships'
import { type } from '@/lib/design/type'
import { DUR_UI, EASE } from '@/lib/design/motion'
import {
  bandOf, cardFor, clusterTraits, CLUSTERS, familyLabel, FAMILY_HUES, filterTraits, freeTraits,
  relationshipsFor, topTieCount, topTraits, type FilterTrait,
} from '@/lib/lab/filterLab'
import { ReportCluster, type ZoomStyle } from '../ReportCluster'
import ReferenceAPlus from '../reference/ReferenceAPlus'

export interface FrameQuery {
  f?: string     // ctl | free | sum | conn | ref
  c?: string     // control: a | b | c
  z?: string     // zoom: a (satellites) | b (dots)
  s?: string     // summary treatment: a | b
  k?: string     // free: carousel | cluster
  hue?: string   // free: cluster | trait
  view?: string  // top | summary | <cluster>
  trait?: string // zoomed facet
  menu?: string  // control b: 1 = menu open
}

const ink = '#262420'
const soft = '#56534D'
const line = '#E5E1D5'
const coral = '#D85A30'

const TOP_LABEL = 'Most pronounced'
const SUMMARY_LABEL = '[LAB COPY] Summary'
const viewLabel = (v: string) => (v === 'top' ? TOP_LABEL : v === 'summary' ? SUMMARY_LABEL : familyLabel(v))

// ── Live state, mirrored into the URL ──────────────────────────────────────

function readUrl(): { view: string; trait: string | null } {
  const p = new URLSearchParams(window.location.search)
  return { view: p.get('view') ?? 'top', trait: p.get('trait') }
}

function useZoomState(initialView: string, initialTrait: string | null) {
  const [state, setState] = useState({ view: initialView, trait: initialTrait })
  const pushedRef = useRef(false)
  useEffect(() => {
    const onPop = () => { pushedRef.current = false; setState(readUrl()) }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const write = (view: string, trait: string | null, push: boolean) => {
    const p = new URLSearchParams(window.location.search)
    p.set('view', view)
    if (trait) p.set('trait', trait); else p.delete('trait')
    const url = `${window.location.pathname}?${p.toString()}`
    if (push) window.history.pushState({ lab: true }, '', url); else window.history.replaceState(window.history.state, '', url)
  }
  const zoomIn = (trait: string) => {
    const push = !state.trait
    write(state.view, trait, push)
    if (push) pushedRef.current = true
    setState({ view: state.view, trait })
  }
  const zoomOut = () => {
    if (pushedRef.current) { window.history.back(); return }
    write(state.view, null, false)
    setState({ view: state.view, trait: null })
  }
  const setView = (view: string) => {
    write(view, null, false)
    pushedRef.current = false
    setState({ view, trait: null })
  }
  return { ...state, zoomIn, zoomOut, setView }
}

// ── Radio row (arrow keys, roving tab index) ───────────────────────────────

function RadioRow({ label, options, value, onChange, className, render }: {
  label: string
  options: string[]
  value: string
  onChange: (v: string) => void
  className: string
  render: (v: string, checked: boolean) => ReactNode
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})
  const onKey = (e: KeyboardEvent) => {
    const i = options.indexOf(value)
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = options[(i + step + options.length) % options.length]
    onChange(next)
    refs.current[next]?.focus()
  }
  return (
    <div role="radiogroup" aria-label={label} className={className} onKeyDown={onKey}>
      {options.map((o) => (
        <button key={o} ref={(el) => { refs.current[o] = el }} type="button" role="radio" aria-checked={o === value}
          tabIndex={o === value ? 0 : -1} onClick={() => onChange(o)} data-v={o}>
          {render(o, o === value)}
        </button>
      ))}
    </div>
  )
}

const Dot = ({ cluster }: { cluster: string }) => (
  <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 999, background: `hsl(${FAMILY_HUES[cluster]},70%,60%)`, flexShrink: 0 }} />
)

function chip(v: string) {
  return <>{v !== 'top' && v !== 'summary' && <Dot cluster={v} />}<span>{viewLabel(v)}</span></>
}

// (a) Segmented control + cluster chips.
function ControlA({ view, setView }: { view: string; setView: (v: string) => void }) {
  const mode = view === 'top' ? 'top' : 'groups'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <RadioRow label="Show" options={['top', 'groups']} value={mode} className="ff-seg"
        onChange={(m) => setView(m === 'top' ? 'top' : view === 'top' ? CLUSTERS[0] : view)}
        render={(o) => <span>{o === 'top' ? TOP_LABEL : '[LAB COPY] By group'}</span>} />
      {mode === 'groups' && (
        <RadioRow label="Group" options={CLUSTERS} value={view} onChange={setView} className="ff-chips ff-wrap" render={(o) => chip(o)} />
      )}
    </div>
  )
}

// (b) One "Showing: …" button with a menu (popover on desktop, sheet on phone).
function ControlB({ view, setView, mobile, startOpen, options }: { view: string; setView: (v: string) => void; mobile: boolean; startOpen: boolean; options: string[] }) {
  const [open, setOpen] = useState(startOpen)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (open) (menuRef.current?.querySelector('[aria-checked="true"]') as HTMLElement | null)?.focus()
  }, [open])
  const close = () => { setOpen(false); btnRef.current?.focus() }
  const pick = (v: string) => { setView(v); close() }
  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
      <button ref={btnRef} type="button" className="ff-showing" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span style={{ color: '#8C8A83' }}>[LAB COPY] Showing:</span> {view !== 'top' && view !== 'summary' && <Dot cluster={view} />}<span>{viewLabel(view)}</span>
        <span aria-hidden="true" style={{ marginLeft: 2 }}>⌄</span>
      </button>
      {open && (
        <>
          {mobile && <div className="ff-backdrop" onClick={close} />}
          <div ref={menuRef} className={mobile ? 'ff-sheet' : 'ff-pop'} onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); close() } }}>
            <RadioRow label="Show" options={options} value={view} onChange={pick} className="ff-menu" render={(o) => chip(o)} />
          </div>
        </>
      )}
    </div>
  )
}

// (c) One horizontally scrolling chip row.
function ControlC({ view, setView, options }: { view: string; setView: (v: string) => void; options: string[] }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const row = wrapRef.current?.querySelector('.ff-chips') as HTMLElement | null
    const el = row?.querySelector(`[data-v="${view}"]`) as HTMLElement | null
    if (row && el) row.scrollTo({ left: el.offsetLeft - row.clientWidth / 2 + el.offsetWidth / 2, behavior: 'auto' })
  }, [view])
  return (
    <div ref={wrapRef} className="ff-scrollwrap">
      <RadioRow label="Show" options={options} value={view} onChange={setView} className="ff-chips ff-scroll" render={(o) => chip(o)} />
    </div>
  )
}

// ── Text under the visual ──────────────────────────────────────────────────

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

function LabText({ heading, body }: { heading?: string; body: string }) {
  return (
    <div className="ff-text">
      {heading && <p style={{ ...type.display4, color: ink, margin: '0 0 8px' }}>{heading}</p>}
      <p style={{ ...type.body, color: soft, margin: 0 }}>{body}</p>
    </div>
  )
}

const RING1_SUMMARY = { heading: '[LAB COPY] Your first ring', body: '[LAB COPY] Ring 1 summary: two or three sentences on how your most pronounced traits show up together. New generated content.' }
const clusterSummary = (c: string) => ({ heading: `[LAB COPY] ${familyLabel(c).replace('[LAB COPY] ', '')}`, body: '[LAB COPY] Cluster summary: one or two sentences on how the six traits in this group show up for you. New generated content.' })

// ── The frame ──────────────────────────────────────────────────────────────

export default function FilterFrame({ q }: { q: FrameQuery }) {
  const f = q.f ?? 'ctl'
  const [mobile, setMobile] = useState(false)
  useEffect(() => { const m = () => setMobile(window.innerWidth < 700); m(); window.addEventListener('resize', m); return () => window.removeEventListener('resize', m) }, [])
  const all = useMemo(filterTraits, [])
  const responses = useMemo(exampleResponses, [])

  if (f === 'ref') {
    return <Shell caption="Reference: the A+ mock from commit a138942 (branch report-options), as it was"><ReferenceAPlus /></Shell>
  }
  if (f === 'free') return <FreeFrame q={q} all={all} responses={responses} mobile={mobile} />
  return <PaidFrame q={q} all={all} responses={responses} mobile={mobile} />
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

function FreeFrame({ q, all, responses, mobile }: { q: FrameQuery; all: FilterTrait[]; responses: Map<number, number>; mobile: boolean }) {
  const free = useMemo(() => freeTraits(all), [all])
  const hueMode = q.hue === 'trait' ? 'trait' : 'cluster'
  const hueOf = (t: FilterTrait) => (hueMode === 'trait' ? t.traitHue : t.clusterHue)
  const [idx, setIdx] = useState(0)
  const zs = useZoomState('top', q.trait ?? null)
  const hueText = hueMode === 'trait' ? 'per-trait hues (as live)' : 'cluster hues'
  if (q.k === 'cluster') {
    const zt = free.find((t) => t.facet === zs.trait)
    return (
      <Shell caption={`Free, 5 traits, new composition, ${hueText}, no filter`}>
        <ZoomedView zs={zs} traits={free} hueOf={hueOf} style="satellites" mobile={mobile} backLabel="[LAB COPY] Back to your traits" />
        <div className="ff-under">{zt && <TraitDetail t={zt} hue={hueOf(zt)} responses={responses} />}</div>
      </Shell>
    )
  }
  const t = free[idx]
  return (
    <Shell caption={`Free, 5 traits, today's carousel, ${hueText}, no filter`}>
      <div className="ff-col ff-carousel">
        <TraitCarousel traits={free.map((x) => ({ key: x.facet, traitWord: x.word, hue: hueOf(x), domain: null }))} activeIdx={idx} onSelect={setIdx}>
          <div style={{ marginTop: 12 }}><TraitDetail t={t} hue={hueOf(t)} responses={responses} /></div>
        </TraitCarousel>
      </div>
    </Shell>
  )
}

// Back button + cluster; focus moves to Back on zoom in, and back to the
// chosen blob on zoom out. Esc zooms out.
function ZoomedView({ zs, traits, hueOf, style, mobile, backLabel, connector }: {
  zs: ReturnType<typeof useZoomState>
  traits: FilterTrait[]
  hueOf: (t: FilterTrait) => number
  style: ZoomStyle
  mobile: boolean
  backLabel: string
  connector?: Parameters<typeof ReportCluster>[0]['connector']
}) {
  const backRef = useRef<HTMLButtonElement>(null)
  const btns = useRef<Record<string, HTMLButtonElement | null>>({})
  const lastZoom = useRef<string | null>(zs.trait)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    if (zs.trait) backRef.current?.focus()
    else if (lastZoom.current) btns.current[lastZoom.current]?.focus()
    if (zs.trait) lastZoom.current = zs.trait
  }, [zs.trait])
  const { zoomOut } = zs
  useEffect(() => {
    if (!zs.trait) return
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') zoomOut() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zs.trait, zoomOut])
  const register = useCallback((facet: string, el: HTMLButtonElement | null) => { btns.current[facet] = el }, [])
  return (
    <div className="ff-col">
      <div className="ff-backrow">
        {zs.trait && <button ref={backRef} type="button" className="ff-back" onClick={zs.zoomOut}>← {backLabel}</button>}
      </div>
      <ReportCluster traits={traits} hueOf={hueOf} zoom={zs.trait} zoomStyle={style} onSelect={zs.zoomIn}
        registerButton={register} connector={connector} labelPx={mobile ? 15 : 18} />
    </div>
  )
}

function PaidFrame({ q, all, responses, mobile }: { q: FrameQuery; all: FilterTrait[]; responses: Map<number, number>; mobile: boolean }) {
  const f = q.f ?? 'ctl'
  const summaryChip = f === 'sum' && q.s === 'b'
  const zs = useZoomState(q.view ?? (summaryChip ? 'summary' : 'top'), q.trait ?? null)
  const control = f === 'sum' || f === 'conn' ? 'c' : q.c ?? 'a'
  const zoomStyle: ZoomStyle = q.z === 'b' ? 'dots' : 'satellites'
  const options = summaryChip ? ['summary', 'top', ...CLUSTERS] : ['top', ...CLUSTERS]
  const traits = zs.view === 'top' || zs.view === 'summary' ? topTraits(all) : clusterTraits(all, zs.view)
  const zt = traits.find((t) => t.facet === zs.trait)
  const hueOf = (t: FilterTrait) => t.clusterHue
  const ties = topTieCount(all)
  const [connOpen, setConnOpen] = useState(false)
  const rel = f === 'conn' ? relationshipsFor(all).find((r) => r.signals.every((s) => traits.some((t) => t.facet === s.facet))) : undefined
  const connector = rel ? {
    a: rel.signals[0].facet, b: rel.signals[1].facet,
    label: `[LAB COPY] How ${rel.signals[0].traitWord} and ${rel.signals[1].traitWord} connect`,
    open: connOpen, onToggle: () => setConnOpen(!connOpen),
  } : undefined

  const setView = (v: string) => { setConnOpen(false); zs.setView(v) }
  const caption = [
    f === 'ctl' ? `Control ${control}` : f === 'sum' ? `Summary ${q.s ?? 'a'}` : 'Extra: one quiet connector',
    `zoom ${q.z === 'b' ? 'b (dots)' : 'a (satellites)'}`,
    viewLabel(zs.view),
    zt ? `${zt.word} zoomed` : null,
  ].filter(Boolean).join(', ')

  let under: ReactNode = null
  if (zt) under = <TraitDetail t={zt} hue={hueOf(zt)} responses={responses} />
  else if (f === 'sum' && q.s !== 'b') under = zs.view === 'top' ? <LabText {...RING1_SUMMARY} /> : <LabText {...clusterSummary(zs.view)} />
  else if (summaryChip) under = zs.view === 'summary'
    ? <LabText {...RING1_SUMMARY} />
    : <LabText body={`[LAB COPY] ${traits.map((t) => t.word).join(', ')}. Tap one to read about it.`} />
  else if (f === 'conn' && rel && connOpen) under = (
    <div className="ff-text">
      <p style={{ ...type.body, color: soft, margin: '0 0 6px' }}>[LAB COPY] Relationship insight: the cached generated text for this pair (two or three sentences and one question).</p>
      <p style={{ ...type.meta, margin: 0 }}>{evidenceSentence(rel)}</p>
    </div>
  )
  else if (zs.view === 'top' && ties > 5) under = <p style={{ ...type.meta, textAlign: 'center', margin: 0 }}>[LAB COPY] {ties} of your traits are equally pronounced. These are the 5 you unlocked first.</p>

  return (
    <Shell caption={caption}>
      <div className="ff-control">
        {control === 'a' && <ControlA view={zs.view} setView={setView} />}
        {control === 'b' && <ControlB view={zs.view} setView={setView} mobile={mobile} startOpen={q.menu === '1'} options={options} />}
        {control === 'c' && <ControlC view={zs.view} setView={setView} options={options} />}
      </div>
      <ZoomedView zs={zs} traits={traits} hueOf={hueOf} style={zoomStyle} mobile={mobile}
        backLabel={`Back to ${viewLabel(zs.view).replace('[LAB COPY] ', '')}`} connector={connector} />
      <div className="ff-under">{under}</div>
    </Shell>
  )
}

const FF_CSS = `
  body{background:#F7F4ED;}
  .ff{min-height:100vh;background:#F7F4ED;color:${ink};padding:28px 16px 64px;text-align:center;}
  .ff-col{max-width:520px;margin:0 auto;}
  .ff-carousel{padding:0 6px;}
  .ff-control{max-width:760px;margin:0 auto 8px;}
  .ff-under{max-width:520px;margin:16px auto 0;}
  .ff-text{max-width:460px;margin:0 auto;}
  .ff-backrow{height:48px;display:flex;align-items:center;justify-content:center;}
  .ff-back{${'font-family:var(--font-body);font-size:var(--text-ui);font-weight:500;'}min-height:44px;padding:0 16px;border-radius:999px;border:1px solid ${line};background:#FFFFFF;color:${ink};cursor:pointer;}
  .ff button:focus-visible{outline:2px solid ${coral};outline-offset:2px;}
  .ff-seg{display:inline-flex;padding:3px;border-radius:999px;background:#EDE9DF;gap:2px;}
  .ff-seg button{min-height:44px;padding:0 18px;border:0;border-radius:999px;background:transparent;color:${soft};cursor:pointer;
    font-family:var(--font-body);font-size:var(--text-ui);font-weight:500;transition:background ${DUR_UI}ms ${EASE},color ${DUR_UI}ms ${EASE};}
  .ff-seg button[aria-checked="true"]{background:#FFFFFF;color:${ink};box-shadow:0 1px 2px rgba(38,36,32,0.08);}
  .ff-chips{display:flex;gap:8px;}
  .ff-chips button,.ff-menu button{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 14px;border-radius:999px;border:1px solid ${line};
    background:#FFFFFF;color:${soft};cursor:pointer;white-space:nowrap;font-family:var(--font-body);font-size:var(--text-ui);font-weight:500;
    transition:background ${DUR_UI}ms ${EASE},color ${DUR_UI}ms ${EASE},border-color ${DUR_UI}ms ${EASE};}
  .ff-chips button[aria-checked="true"]{background:${ink};border-color:${ink};color:#F7F4ED;}
  .ff-wrap{flex-wrap:wrap;justify-content:center;}
  .ff-scrollwrap{margin:0 -16px;}
  .ff-scroll{overflow-x:auto;scrollbar-width:none;padding:2px 16px;scroll-padding:0 16px;
    -webkit-mask-image:linear-gradient(90deg,transparent 0,#000 16px,#000 calc(100% - 16px),transparent 100%);
            mask-image:linear-gradient(90deg,transparent 0,#000 16px,#000 calc(100% - 16px),transparent 100%);}
  .ff-scroll::-webkit-scrollbar{display:none;}
  @media(min-width:900px){.ff-scroll{flex-wrap:wrap;justify-content:center;overflow:visible;-webkit-mask-image:none;mask-image:none;}}
  .ff-showing{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border-radius:999px;border:1px solid ${line};background:#FFFFFF;color:${ink};cursor:pointer;
    font-family:var(--font-body);font-size:var(--text-ui);font-weight:500;}
  .ff-pop{position:absolute;top:52px;left:50%;transform:translateX(-50%);z-index:20;background:#FFFFFF;border:1px solid ${line};border-radius:16px;padding:8px;
    box-shadow:0 8px 24px rgba(38,36,32,0.10);}
  .ff-sheet{position:fixed;left:0;right:0;bottom:0;z-index:20;background:#FFFFFF;border-radius:20px 20px 0 0;padding:16px 16px 28px;box-shadow:0 -8px 24px rgba(38,36,32,0.10);}
  .ff-backdrop{position:fixed;inset:0;z-index:19;background:rgba(38,36,32,0.25);}
  .ff-menu{display:flex;flex-direction:column;gap:4px;align-items:stretch;}
  .ff-menu button{border:0;justify-content:flex-start;border-radius:12px;}
  .ff-menu button[aria-checked="true"]{background:#F2EEE5;color:${ink};}
`
