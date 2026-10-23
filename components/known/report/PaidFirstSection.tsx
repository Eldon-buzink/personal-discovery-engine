'use client'

// The redesigned first section for paid users (and the public example
// report), behind NEXT_PUBLIC_REPORT_PAID_V2 (lib/known/reportFlags.ts).
// No generated text: everything comes from the cards and the scores.
//
// - A "Showing" menu: Overview (the five most pronounced) and each cluster.
// - Overview, nothing selected: five equal blobs, a tie note, then "What
//   stands out" (the most pronounced pattern, its headline and paragraph).
// - A cluster, nothing selected: its blobs, a title, the lead sentence, what
//   the group is about, which traits lean (each a link) and which sit near
//   the middle, the pull-apart box when a pair fires, the evidence pill.
// - Tapping a blob moves it to the middle (the others breathe around it)
//   and shows its card. "Back to …", Esc and the browser Back button zoom
//   out; focus moves to Back on zoom in and back to the blob on zoom out.
// - URL: ?view=<cluster slug or overview>&trait=<trait word slug>; zooming
//   in pushes a history entry, switching trait while zoomed replaces it.
//
// Ties: strength, then the higher score, then the order traits were revealed.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { evidenceSentence, type FiredRelationship } from '@/lib/known/relationships'
import type { PatternContent } from '@/lib/known/types'
import { type } from '@/lib/design/type'
import { hslCss, type HSL } from '@/lib/known/blobColour'
import { AI_LINE, CLUSTER_ABOUT, CLUSTER_HOW_TO_READ, CLUSTER_LEAD, CLUSTER_SLUGS, CLUSTERS, clusterLabel, slugify } from '@/lib/known/clusters'
import { BlobCluster } from './BlobCluster'
import { ShowingMenu } from './ShowingMenu'
import { MultiEvidence, TraitEvidence } from './EvidencePanels'

export interface ReportTrait {
  facet: string
  word: string
  cluster: string
  score: number
  /** 0 … 2, how far from the middle. */
  strength: number
  revealIndex: number
  direction: 'low' | 'mid' | 'high'
  colour: HSL
  content: PatternContent | null
}

const ink = '#262420'
const soft = '#56534D'
const TOP = 5

export function mostPronounced<T extends Pick<ReportTrait, 'strength' | 'score' | 'revealIndex'>>(ts: T[]): T[] {
  return [...ts].sort((a, b) => b.strength - a.strength || b.score - a.score || a.revealIndex - b.revealIndex)
}

const viewLabel = (v: string) => (v === 'overview' ? 'Overview' : clusterLabel(v))
const viewSlug = (v: string) => (v === 'overview' ? 'overview' : CLUSTER_SLUGS[v] ?? v)
const slugView = (s: string | null) => (s === 'overview' ? 'overview' : Object.keys(CLUSTER_SLUGS).find((k) => CLUSTER_SLUGS[k] === s) ?? null)

export function PaidFirstSection({ traits, responses, relationships, insightFor, renderPending }: {
  /** Revealed Ring 1 traits. */
  traits: ReportTrait[]
  responses: Map<number, number>
  /** Fired relationships (same-cluster pairs). */
  relationships: FiredRelationship[]
  /** The cached insight text for a relationship, when there is one. */
  insightFor: (r: FiredRelationship) => string | undefined
  /** What to show while a trait's card is still being written. */
  renderPending: (t: ReportTrait) => ReactNode
}) {
  const [mobile, setMobile] = useState(false)
  useEffect(() => { const m = () => setMobile(window.innerWidth < 700); m(); window.addEventListener('resize', m); return () => window.removeEventListener('resize', m) }, [])

  const byFacet = useMemo(() => new Map(traits.map((t) => [t.facet, t])), [traits])
  const top = useMemo(() => mostPronounced(traits).slice(0, TOP), [traits])
  const clusterTraits = useCallback((c: string) => mostPronounced(traits.filter((t) => t.cluster === c)), [traits])
  const options = useMemo(() => ['overview', ...CLUSTERS.filter((c) => traits.some((t) => t.cluster === c))], [traits])
  const setFor = useCallback((v: string) => (v === 'overview' ? top : clusterTraits(v)), [top, clusterTraits])

  const parse = useCallback((search: string) => {
    const p = new URLSearchParams(search)
    const v = slugView(p.get('view'))
    const view = v && options.includes(v) ? v : 'overview'
    const slug = p.get('trait')
    const facet = slug ? traits.find((t) => slugify(t.word) === slug)?.facet ?? null : null
    return { view, selected: facet && setFor(view).some((t) => t.facet === facet) ? facet : null }
  }, [options, traits, setFor])

  const [view, setViewState] = useState('overview')
  const [selected, setSelected] = useState<string | null>(null)
  const [order, setOrder] = useState<string[]>([])
  const pushed = useRef(false)
  const ready = useRef(false)

  // Read the URL once traits are in (they arrive after the first render).
  useEffect(() => {
    if (ready.current || traits.length === 0) return
    ready.current = true
    const s = parse(window.location.search)
    const base = setFor(s.view).map((t) => t.facet)
    setViewState(s.view); setSelected(s.selected)
    setOrder(s.selected ? [s.selected, ...base.filter((f) => f !== s.selected)] : base)
  }, [traits, parse, setFor])
  // More traits revealed: keep the view, refresh what it shows.
  useEffect(() => {
    if (!ready.current) return
    const base = setFor(view).map((t) => t.facet)
    setOrder((o) => {
      const kept = o.filter((f) => base.includes(f))
      return [...kept, ...base.filter((f) => !kept.includes(f))]
    })
  }, [traits]) // eslint-disable-line react-hooks/exhaustive-deps

  const write = useCallback((v: string, facet: string | null, mode: 'push' | 'replace') => {
    const p = new URLSearchParams(window.location.search)
    p.set('view', viewSlug(v))
    const w = facet ? byFacet.get(facet)?.word : null
    if (w) p.set('trait', slugify(w)); else p.delete('trait')
    const url = `${window.location.pathname}?${p.toString()}`
    if (mode === 'push') window.history.pushState({ report: true }, '', url); else window.history.replaceState(window.history.state, '', url)
  }, [byFacet])

  useEffect(() => {
    const onPop = () => {
      pushed.current = false
      const s = parse(window.location.search)
      const base = setFor(s.view).map((t) => t.facet)
      setViewState(s.view); setSelected(s.selected)
      setOrder(s.selected ? [s.selected, ...base.filter((f) => f !== s.selected)] : base)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [parse, setFor])

  const select = (facet: string) => {
    if (!setFor(view).some((t) => t.facet === facet)) {
      // A trait outside this view (from a link or the evidence panel): open it in its own cluster.
      const t = byFacet.get(facet); if (!t) return
      const base = setFor(t.cluster).map((x) => x.facet)
      setViewState(t.cluster); setSelected(facet); setOrder([facet, ...base.filter((f) => f !== facet)])
      write(t.cluster, facet, 'push'); pushed.current = true
      return
    }
    if (selected) {
      const next = [...order]; const i = next.indexOf(facet)
      ;[next[0], next[i]] = [next[i], next[0]]
      setOrder(next); setSelected(facet); write(view, facet, 'replace')
    } else {
      const base = setFor(view).map((t) => t.facet)
      setOrder([facet, ...base.filter((f) => f !== facet)]); setSelected(facet)
      write(view, facet, 'push'); pushed.current = true
    }
  }
  const zoomOut = useCallback(() => {
    if (pushed.current) { window.history.back(); return }
    setSelected(null); setOrder(setFor(view).map((t) => t.facet)); write(view, null, 'replace')
  }, [view, setFor, write])
  const setView = (v: string) => {
    setViewState(v); setSelected(null); setOrder(setFor(v).map((t) => t.facet)); write(v, null, 'replace'); pushed.current = false
  }

  const backRef = useRef<HTMLButtonElement>(null)
  const btns = useRef<Record<string, HTMLButtonElement | null>>({})
  const last = useRef<string | null>(null)
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    if (selected) { backRef.current?.focus(); last.current = selected }
    else if (last.current) btns.current[last.current]?.focus()
  }, [selected])
  useEffect(() => {
    if (!selected) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('.ev-backdrop')) zoomOut() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, zoomOut])
  const register = useCallback((f: string, el: HTMLButtonElement | null) => { btns.current[f] = el }, [])

  const href = (f: string) => { const t = byFacet.get(f); return t ? `?view=${viewSlug(t.cluster)}&trait=${slugify(t.word)}` : '#' }
  const TraitLink = ({ t }: { t: ReportTrait }) => (
    <a href={href(t.facet)} className="pf-inline" onClick={(e) => { e.preventDefault(); select(t.facet) }}>{t.word}</a>
  )
  const list = (ts: ReportTrait[]) => ts.map((t, i) => <span key={t.facet}>{i > 0 && (i === ts.length - 1 ? ' and ' : ', ')}<TraitLink t={t} /></span>)
  const hueOf = (t: ReportTrait) => t.colour
  const relFor = (facet: string) => relationships.find((r) => r.signals.some((s) => s.facet === facet))

  // ── content ──────────────────────────────────────────────────────────────
  const ties = (() => { const s = top[0]?.strength; return s === undefined ? 0 : traits.filter((t) => t.strength === s).length })()

  const whatStandsOut = () => {
    const first = mostPronounced(traits)[0]
    if (!first) return null
    const c = first.content
    return (
      <div className="pf-text">
        <h2 style={{ ...type.traitWord, color: ink, margin: '0 0 2px' }}>What stands out</h2>
        <p style={{ ...type.meta, margin: '0 0 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 999, background: hslCss(first.colour) }} /> Your most pronounced pattern: {first.word}
        </p>
        {c ? (
          <>
            <p style={{ ...type.display4, color: soft, margin: '0 auto 20px', maxWidth: 420 }}>{c.trait_quote}</p>
            {(c.shows_up ?? c.body ?? c.where_it_shows_up) && <p style={{ ...type.body, color: soft, margin: '0 auto', maxWidth: 420 }}>{c.shows_up ?? c.body ?? c.where_it_shows_up}</p>}
          </>
        ) : renderPending(first)}
        <button type="button" className="pf-pill" onClick={() => select(first.facet)}>Open {first.word}</button>
        {traits.length < 30 && <p style={{ ...type.meta, margin: '14px 0 0' }}>[LAB COPY] Based on the {traits.length} traits you have so far.</p>}
      </div>
    )
  }

  const clusterBlock = (cl: string) => {
    const ts = clusterTraits(cl)
    const lean = ts.filter((t) => t.direction !== 'mid')
    const mid = ts.filter((t) => t.direction === 'mid')
    const tension = relationships.find((r) => r.signals.every((s) => ts.some((t) => t.facet === s.facet)))
    const tensionText = tension ? insightFor(tension) : undefined
    return (
      <div className="pf-text">
        <h2 style={{ ...type.traitWord, color: ink, margin: '0 0 2px' }}>{clusterLabel(cl)}</h2>
        <p style={{ ...type.meta, margin: '0 0 18px' }}>[LAB COPY] {ts.length} of your traits</p>
        <p style={{ ...type.display4, color: soft, margin: '0 auto 20px', maxWidth: 420 }}>{CLUSTER_LEAD[cl]}</p>
        <p style={{ ...type.body, color: soft, margin: '0 auto 12px', maxWidth: 420 }}>{CLUSTER_ABOUT[cl]}</p>
        <p style={{ ...type.body, color: soft, margin: '0 auto', maxWidth: 420 }}>
          {lean.length > 0 && <>[LAB COPY] In this group your answers lean most clearly toward {list(lean)}. </>}
          {mid.length > 0 && <>{lean.length === 0 ? '[LAB COPY] All of these sit near the middle for you: ' : ''}{list(mid)}{lean.length > 0 ? (mid.length === 1 ? ' sits' : ' sit') + ' near the middle.' : '.'} </>}
          {CLUSTER_HOW_TO_READ}
        </p>
        {tension && tensionText && (
          <div className="pf-tension">
            <p style={{ ...type.ui, color: ink, margin: '0 0 4px' }}>[LAB COPY] Where two of these pull apart</p>
            <p style={{ ...type.body, color: soft, margin: 0 }}>{tensionText}</p>
            <p style={{ ...type.meta, margin: '4px 0 0' }}>{evidenceSentence(tension)}</p>
          </div>
        )}
        <MultiEvidence traits={lean.filter((t) => t.facet !== 'Depression')} hueOf={hueOf} onSeeTrait={select} />
      </div>
    )
  }

  const traitCard = (t: ReportTrait) => {
    const c = t.content
    const rel = relFor(t.facet)
    const relText = rel ? insightFor(rel) : undefined
    return (
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ ...type.traitWord, color: ink, margin: '0 0 2px' }}>{t.word}</h2>
        <p style={{ margin: '0 0 18px' }}>
          <button type="button" className="pf-inline pf-cluster-link" onClick={() => setView(t.cluster)}>This trait is part of {clusterLabel(t.cluster)}</button>
        </p>
        {c ? (
          <>
            <p style={{ ...type.display4, color: soft, maxWidth: 420, margin: '0 auto 24px' }}>{c.trait_quote}</p>
            {c.shows_up ? (
              <>
                <p style={{ ...type.body, color: soft, maxWidth: 420, margin: '0 auto 8px' }}>{c.shows_up}</p>
                {c.tradeoff && <p style={{ ...type.body, color: soft, maxWidth: 420, margin: '14px auto 8px' }}>{c.tradeoff}</p>}
              </>
            ) : (c.body ?? c.where_it_shows_up) && <p style={{ ...type.body, color: soft, maxWidth: 420, margin: '0 auto 8px' }}>{c.body ?? c.where_it_shows_up}</p>}
            {rel && relText && <p style={{ ...type.body, color: '#8C8A83', maxWidth: 420, margin: '14px auto 0' }}>{relText} {evidenceSentence(rel)}</p>}
            <TraitEvidence key={t.facet} t={t} hue={t.colour} responses={responses} hasAnswers={!!(c.body || c.shows_up)} footer={<p style={{ ...type.meta, margin: '8px 0 0' }}>{AI_LINE}</p>} />
          </>
        ) : renderPending(t)}
      </div>
    )
  }

  const shown = order.map((f) => byFacet.get(f)!).filter(Boolean)
  const selectedTrait = selected ? byFacet.get(selected) : undefined
  let under: ReactNode
  if (selectedTrait) under = traitCard(selectedTrait)
  else if (view === 'overview') under = whatStandsOut()
  else under = clusterBlock(view)

  if (traits.length === 0) return null
  return (
    <div className="pf">
      <style dangerouslySetInnerHTML={{ __html: PF_CSS }} />
      <div className="pf-control">
        <ShowingMenu view={view} options={options} labelOf={viewLabel} onChange={setView} mobile={mobile} startOpen={false} />
      </div>
      <div className="pf-backrow">
        {selectedTrait && <button ref={backRef} type="button" className="pf-back" onClick={zoomOut}>← Back to {viewLabel(view)}</button>}
      </div>
      <div className="pf-col">
        <BlobCluster traits={shown} hueOf={hueOf} onSelect={select} overview={!selectedTrait} registerButton={register} satellites="breathe" labelsInside readability="light" />
      </div>
      {view === 'overview' && !selectedTrait && ties > TOP && (
        <p style={{ ...type.meta, textAlign: 'center', margin: '8px 0 0' }}>[LAB COPY] {ties} traits tie as most pronounced. Showing five: the ones you unlocked first.</p>
      )}
      <div className="pf-under">{under}</div>
    </div>
  )
}

const PF_CSS = `
  .pf{text-align:center;}
  .pf-col{max-width:520px;margin:0 auto;}
  .pf-control{max-width:760px;margin:0 auto 4px;}
  .pf-backrow{height:52px;display:flex;align-items:center;justify-content:center;}
  .pf-under{max-width:520px;margin:20px auto 0;}
  .pf-text{max-width:480px;margin:0 auto;}
  .pf button:focus-visible,.pf a:focus-visible{outline:2px solid #D85A30;outline-offset:2px;}
  .pf-back,.pf-pill{min-height:44px;padding:0 16px;border-radius:999px;border:1px solid #E5E1D5;background:#FFFFFF;color:${ink};cursor:pointer;font-family:var(--font-body);font-size:var(--text-ui);font-weight:500;}
  .pf-pill{margin-top:16px;}
  .pf-inline{display:inline;padding:0;border:0;background:none;cursor:pointer;color:${ink};font:inherit;text-decoration:underline;text-underline-offset:3px;text-decoration-color:rgba(38,36,32,0.4);}
  .pf-cluster-link{font-family:var(--font-body);font-size:var(--text-meta);color:${soft};min-height:44px;padding:0 4px;}
  .pf-tension{margin-top:24px;padding:16px;border-radius:14px;background:#FFFFFF;}
`
