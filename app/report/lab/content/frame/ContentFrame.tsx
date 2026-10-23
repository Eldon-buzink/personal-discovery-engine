'use client'

// Report lab: the report's first section, built from the picks.
//
// Paid: a "Showing" menu with Overview (the five most pronounced) and the
// five clusters. In a view nothing is selected: equal blobs, and the text
// underneath is the Summary (Overview) or the cluster reading. Tapping a
// blob moves it to the middle with the others around it and shows its
// card. "Back to …", Esc and the browser Back button zoom out (zooming in
// pushes a history entry; switching trait while zoomed replaces it). URL:
// ?view=<neutral slug>&trait=<trait word slug>.
// Free: five blobs in per-trait hues, the first in the middle with its
// card, no menu, no cluster language, no Summary.
//
// Fixed query settings: f paid|free, n revealed traits (paid, default 30),
// st ready|loading|failed (forces a state), gen 1 (live generation through
// the lab server action; needs LAB_CONTENT_GENERATION=1), menu 1, ev 1.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { patternSubtitle } from '@/components/known/TraitCarousel'
import { exampleResponses } from '@/lib/known/exampleReport'
import { evidenceSentence, type FiredRelationship } from '@/lib/known/relationships'
import { type } from '@/lib/design/type'
import {
  bandOf, cardFor, clusterTraits, CLUSTERS, familyLabel, filterTraits, freeTraits, mostPronounced, relationshipsFor, topTieCount, topTraits, type FilterTrait,
} from '@/lib/lab/filterLab'
import { AI_LINE, CLUSTER_ABOUT, CLUSTER_DESCRIPTIONS, CLUSTER_HOW_TO_READ, clusterReadingEligible, sendable, summaryEligible, SUMMARY_MIN_TRAITS, validateDrawsOn } from '@/lib/lab/contentLab'
import { browserContentCache, contentKey, MAX_CONTENT_ATTEMPTS } from '@/lib/lab/contentCache'
import { slugToFacet, slugToView, traitToSlug, viewToSlug } from '@/lib/lab/slugs'
import type { ContentTension, ContentTrait } from '@/lib/lab/contentGeneration'
import { ReportCluster } from '../../filter/ReportCluster'
import { hslCss, toHsl, type Colour } from '@/lib/lab/colours'
import { ShowingMenu } from '../../filter/ShowingMenu'
import { MultiEvidence, TraitEvidence } from '../MultiEvidence'
import { generateLabClusterReading, generateLabSummary, type LabContentResult } from '../actions'

export interface ContentQuery { f?: string; n?: string; st?: string; gen?: string; menu?: string; view?: string; trait?: string; ev?: string; alt?: string; sl?: string; sat?: string; lab?: string }

const ink = '#262420'
const soft = '#56534D'

const GENERATION_ON = false

const viewLabel = (v: string) => (v === 'overview' ? 'Overview' : familyLabel(v))

// ── Small pieces ───────────────────────────────────────────────────────────

const Ai = () => <p style={{ ...type.meta, margin: '8px 0 0' }}>{AI_LINE}</p>

/** Fallback when there's no generated text: each trait's own headline sentence, plain. */
function Headlines({ traits, onPick }: { traits: FilterTrait[]; onPick: (f: string) => void }) {
  return (
    <ul className="cf-heads">
      {traits.map((t) => (
        <li key={t.facet}>
          <button type="button" className="cf-head" onClick={() => onPick(t.facet)}>
            <span style={{ ...type.traitWord, fontSize: 17, color: ink }}>{t.word}</span>{' '}
            <span style={{ ...type.body, color: soft }}>{cardFor(t.facet).trait_quote}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

/** A paragraph with one phrase turned into an inline link (the relationship pointer). */
function WithPointer({ text, pointer, onPick, href }: { text: string; pointer: { facet: string; phrase: string } | null; onPick: (f: string) => void; href: (f: string) => string }) {
  if (!pointer || !text.includes(pointer.phrase)) return <>{text}</>
  const i = text.indexOf(pointer.phrase)
  return (
    <>
      {text.slice(0, i)}
      <a href={href(pointer.facet)} className="cf-inline" onClick={(e) => { e.preventDefault(); onPick(pointer.facet) }}>{pointer.phrase}</a>
      {text.slice(i + pointer.phrase.length)}
    </>
  )
}

// The trait card, as the report's Ring 1 card without the tags, with the
// cluster link (paid) under the subtitle and the AI line under the pill.
function TraitCard({ t, hue, paid, responses, insight, onCluster }: {
  t: FilterTrait; hue: Colour; paid: boolean; responses: Map<number, number>; insight?: string; onCluster: () => void
}) {
  const content = cardFor(t.facet)
  return (
    <div style={{ textAlign: 'center' }}>
      <h2 style={{ ...type.traitWord, color: ink, margin: '0 0 2px' }}>{t.word}</h2>
      {/* The reveal order only matters to free users; paid users see the cluster link instead. */}
      {!paid && <p style={{ ...type.meta, margin: '0 0 22px' }}>{patternSubtitle(t.revealIndex)}</p>}
      {paid && (
        <p style={{ margin: '0 0 18px' }}>
          <button type="button" className="cf-inline cf-cluster-link" onClick={onCluster}>
            This trait is part of {familyLabel(t.cluster)}
          </button>
        </p>
      )}
      <p style={{ ...type.display4, color: soft, maxWidth: 420, margin: '0 auto 24px' }}>{content.trait_quote}</p>
      {content.shows_up ? (
        // Split format: two short paragraphs, no headings.
        <>
          <p style={{ ...type.body, color: soft, maxWidth: 420, margin: '0 auto 8px' }}>{content.shows_up}</p>
          {content.tradeoff && <p style={{ ...type.body, color: soft, maxWidth: 420, margin: '14px auto 8px' }}>{content.tradeoff}</p>}
        </>
      ) : content.body && <p style={{ ...type.body, color: soft, maxWidth: 420, margin: '0 auto 8px' }}>{content.body}</p>}
      {insight && <p style={{ ...type.body, color: '#8C8A83', maxWidth: 420, margin: '14px auto 0' }}>{insight}</p>}
      <TraitEvidence key={t.facet} t={t} hue={hue} responses={responses} footer={<Ai />} />
      {paid && <button type="button" className="cf-track">[LAB COPY] Track this</button>}
    </div>
  )
}

// ── Generation (lab flag) with the browser cache ───────────────────────────

type Ready = Extract<LabContentResult, { status: 'ok' }>
type GenState = { status: 'idle' } | { status: 'loading' } | { status: 'failed' } | (Omit<Ready, 'status'> & { status: 'ready' })

function useGenerated(enabled: boolean, key: string, run: () => Promise<LabContentResult>): GenState {
  const [state, setState] = useState<GenState>({ status: 'idle' })
  const runRef = useRef(run)
  runRef.current = run
  useEffect(() => {
    if (!enabled) { setState({ status: 'idle' }); return }
    const cache = browserContentCache()
    const hit = cache.get(key)
    if (hit) { setState({ status: 'ready', headline: hit.headline, text: hit.text, sentences: hit.sentences ?? [], pointer: hit.pointer ?? null, drawsOn: hit.drawsOn }); return }
    if (cache.attempts(key) >= MAX_CONTENT_ATTEMPTS) { setState({ status: 'failed' }); return }
    let live = true
    setState({ status: 'loading' })
    cache.recordAttempt(key)
    runRef.current().then((r) => {
      if (!live) return
      if (r.status === 'ok') {
        cache.set({ key, kind: key.includes('|summary|') ? 'summary' : 'cluster', text: r.text, headline: r.headline, pointer: r.pointer, sentences: r.sentences, drawsOn: r.drawsOn, createdAt: new Date().toISOString() })
        setState({ status: 'ready', headline: r.headline, text: r.text, sentences: r.sentences, pointer: r.pointer, drawsOn: r.drawsOn })
      } else setState({ status: 'failed' })
    }).catch(() => { if (live) setState({ status: 'failed' }) })
    return () => { live = false }
  }, [enabled, key])
  return state
}

const toInput = (t: FilterTrait): ContentTrait => ({ facet: t.facet, word: t.word, direction: bandOf(t.facet), cluster: t.cluster, headline: cardFor(t.facet).trait_quote })
const toTension = (r: FiredRelationship): ContentTension => ({ facets: [r.signals[0].facet, r.signals[1].facet], words: [r.signals[0].traitWord, r.signals[1].traitWord] })

// ── The frame ──────────────────────────────────────────────────────────────

export default function ContentFrame({ q }: { q: ContentQuery }) {
  const paid = q.f !== 'free'
  const forced = q.st && q.st !== 'ready' ? q.st : null
  // Generation for the Summary and cluster content stays in the code but is off.
  const live = GENERATION_ON && q.gen === '1' && !forced
  const [mobile, setMobile] = useState(false)
  useEffect(() => { const m = () => setMobile(window.innerWidth < 700); m(); window.addEventListener('resize', m); return () => window.removeEventListener('resize', m) }, [])
  const all = useMemo(filterTraits, [])
  const responses = useMemo(exampleResponses, [])
  const n = paid ? Math.max(1, Math.min(30, Number(q.n ?? 30))) : 5
  const revealed = useMemo(() => (paid ? all.filter((t) => t.revealIndex < n) : freeTraits(all)), [all, paid, n])
  const rels = useMemo(() => relationshipsFor(revealed), [revealed])
  const options = useMemo(() => ['overview', ...CLUSTERS.filter((c) => revealed.some((t) => t.cluster === c))], [revealed])
  const byFacet = useMemo(() => new Map(all.map((t) => [t.facet, t])), [all])

  const setFor = useCallback((v: string): FilterTrait[] => (!paid ? revealed : v === 'overview' ? topTraits(revealed) : clusterTraits(revealed, v)), [paid, revealed])
  const parse = useCallback((search: string) => {
    const p = new URLSearchParams(search)
    const v = slugToView(p.get('view'))
    const view = v && options.includes(v) ? v : 'overview'
    const facet = slugToFacet(p.get('trait'), revealed)
    return { view, selected: facet && setFor(view).some((t) => t.facet === facet) ? facet : null }
  }, [options, revealed, setFor])

  const [initial] = useState(() => (paid ? parse(`?view=${q.view ?? 'overview'}&trait=${q.trait ?? ''}`) : { view: 'overview', selected: null as string | null }))
  const [view, setViewState] = useState(initial.view)
  const [selected, setSelected] = useState<string | null>(initial.selected)
  const [order, setOrder] = useState<string[]>(() => {
    const base = setFor(initial.view).map((t) => t.facet)
    const first = paid ? initial.selected : base[0]
    return first ? [first, ...base.filter((f) => f !== first)] : base
  })
  const pushed = useRef(false)

  const write = useCallback((v: string, facet: string | null, mode: 'push' | 'replace') => {
    const p = new URLSearchParams(window.location.search)
    p.set('view', viewToSlug(v))
    const w = facet ? byFacet.get(facet)?.word : null
    if (w) p.set('trait', traitToSlug(w)); else p.delete('trait')
    const url = `${window.location.pathname}?${p.toString()}`
    if (mode === 'push') window.history.pushState({ lab: true }, '', url); else window.history.replaceState(window.history.state, '', url)
  }, [byFacet])

  useEffect(() => {
    if (!paid) return
    const onPop = () => {
      pushed.current = false
      const s = parse(window.location.search)
      const base = setFor(s.view).map((t) => t.facet)
      setViewState(s.view)
      setSelected(s.selected)
      setOrder(s.selected ? [s.selected, ...base.filter((f) => f !== s.selected)] : base)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [paid, parse, setFor])

  const select = (facet: string) => {
    if (!paid) {
      const next = [...order]; const i = next.indexOf(facet)
      if (i > 0) { [next[0], next[i]] = [next[i], next[0]]; setOrder(next) }
      return
    }
    if (!setFor(view).some((t) => t.facet === facet)) {
      // A trait outside this view (from the evidence panel): open it in its own cluster.
      const t = byFacet.get(facet)!
      const base = setFor(t.cluster).map((x) => x.facet)
      setViewState(t.cluster); setSelected(facet); setOrder([facet, ...base.filter((f) => f !== facet)])
      write(t.cluster, facet, 'push'); pushed.current = true
      return
    }
    if (selected) {
      // Switching while zoomed: swap with the centre, the others keep their place.
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

  // Esc zooms out; focus: Back on zoom in, the chosen blob on zoom out.
  const backRef = useRef<HTMLButtonElement>(null)
  const btns = useRef<Record<string, HTMLButtonElement | null>>({})
  const last = useRef<string | null>(selected)
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    if (selected) { backRef.current?.focus(); last.current = selected }
    else if (last.current) btns.current[last.current]?.focus()
  }, [selected])
  useEffect(() => {
    if (!paid || !selected) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('.ev-backdrop')) zoomOut() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [paid, selected, zoomOut])
  const register = useCallback((f: string, el: HTMLButtonElement | null) => { btns.current[f] = el }, [])

  // ── content ──────────────────────────────────────────────────────────────
  const top = topTraits(revealed)
  const summaryInput = sendable(revealed)
  const tensions = rels.map(toTension)
  const summaryKey = contentKey('summary', summaryInput.map((t) => ({ facet: t.facet, word: t.word, direction: bandOf(t.facet) })), { relationshipIds: rels.map((r) => r.id) })
  const summaryGen = useGenerated(live && paid && view === 'overview' && summaryEligible(revealed), summaryKey, () => generateLabSummary(summaryInput.map(toInput), tensions))
  const clusterIn = view !== 'overview' ? clusterTraits(revealed, view) : []
  const clusterKey = contentKey('cluster', sendable(clusterIn).map((t) => ({ facet: t.facet, word: t.word, direction: bandOf(t.facet) })), { cluster: view })
  const clusterTension = rels.find((r) => r.signals.every((s) => clusterIn.some((t) => t.facet === s.facet)))
  const clusterGen = useGenerated(live && paid && view !== 'overview' && q.alt !== '1' && clusterReadingEligible(clusterIn), clusterKey,
    () => generateLabClusterReading(view, sendable(clusterIn).map(toInput), clusterTension ? [toTension(clusterTension)] : []))

  const evidenceRows = (facets: string[], inputFacets: string[]) => {
    const v = validateDrawsOn(facets, inputFacets)
    return v.ok ? v.facets.map((f) => byFacet.get(f)!) : []
  }
  const cardHref = (f: string) => `?view=${viewToSlug(byFacet.get(f)!.cluster)}&trait=${traitToSlug(byFacet.get(f)!.word)}`

  // ── "What stands out" (no generation): the most pronounced trait overall
  // ("Your most pronounced pattern"), then the next two most pronounced from
  // two other clusters, listed in the fixed cluster order. Ties: strength,
  // then the higher score, then reveal order (mostPronounced).
  const standout = (() => {
    const ranked = mostPronounced(revealed)
    const first = ranked[0]
    const used = new Set(first ? [first.cluster] : [])
    const next: FilterTrait[] = []
    for (const t of ranked.slice(1)) {
      if (next.length === 2) break
      if (used.has(t.cluster)) continue
      used.add(t.cluster)
      next.push(t)
    }
    next.sort((a, b) => CLUSTERS.indexOf(a.cluster) - CLUSTERS.indexOf(b.cluster))
    return { first, next }
  })()
  const Dot = ({ t, size = 10 }: { t: FilterTrait; size?: number }) => (
    <span aria-hidden="true" style={{ display: 'inline-block', width: size, height: size, borderRadius: 999, background: hslCss(toHsl(hueOf(t))), flexShrink: 0 }} />
  )
  // "What stands out": only the most pronounced pattern. The visual above
  // already shows the other traits, so they are not listed again here.
  const whatStandsOut = () => {
    const { first } = standout
    if (!first) return null
    const c = cardFor(first.facet)
    return (
      <div className="cf-text">
        <h2 style={{ ...type.traitWord, color: ink, margin: '0 0 2px' }}>What stands out</h2>
        <p style={{ ...type.meta, margin: '0 0 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Dot t={first} /> Your most pronounced pattern: {first.word}</p>
        <p style={{ ...type.display4, color: soft, margin: '0 auto 20px', maxWidth: 420 }}>{c.trait_quote}</p>
        {(c.shows_up ?? c.body) && <p style={{ ...type.body, color: soft, margin: '0 auto', maxWidth: 420 }}>{c.shows_up ?? c.body}</p>}
        <button type="button" className="cf-track" onClick={() => select(first.facet)}>[LAB COPY] Open {first.word}</button>
        {revealed.length < 30 && <p style={{ ...type.meta, margin: '14px 0 0' }}>[LAB COPY] Based on the {revealed.length} traits you have so far.</p>}
      </div>
    )
  }

  const summaryBlock = () => {
    if (!summaryEligible(revealed)) {
      return (
        <div className="cf-text">
          <p style={{ ...type.meta, margin: '0 0 12px' }}>[LAB COPY] This appears once you have {SUMMARY_MIN_TRAITS} traits. You have {revealed.length} so far.</p>
          <Headlines traits={top} onPick={select} />
        </div>
      )
    }
    // Generation is off (GENERATION_ON); the takeaway path below stays for reference.
    if (!(live && summaryGen.status === 'ready')) return whatStandsOut()
    const g = summaryGen
    return (
      <div className="cf-text">
        <p style={{ ...type.display4, color: ink, margin: '0 0 8px' }}>
          <WithPointer text={g.headline ?? ''} pointer={g.pointer} onPick={select} href={cardHref} />
        </p>
        {g.text && (
          <p style={{ ...type.body, color: soft, margin: 0 }}>
            <WithPointer text={g.text} pointer={g.pointer} onPick={select} href={cardHref} />
          </p>
        )}
        {revealed.length < 30 && <p style={{ ...type.meta, margin: '10px 0 0' }}>[LAB COPY] This uses the {revealed.length} traits you have so far.</p>}
        <MultiEvidence traits={evidenceRows(g.drawsOn, summaryInput.map((t) => t.facet))} hueOf={hueOf} onSeeTrait={select} startOpen={q.ev === '1'} footer={<Ai />} />
      </div>
    )
  }

  // ── Cluster view: the no-generation content (description draft b, the two
  // most pronounced headline sentences, the tension box when a pair fires,
  // the evidence pill for the traits shown), with the generated one-sentence
  // takeaway on top only when generation is on and it came back. The AI line
  // goes with the takeaway only.
  // A cluster summary without generation: which traits lean (and which way)
  // and which sit near the middle, each name a link to that trait.
  const TraitLink = ({ t }: { t: FilterTrait }) => (
    <a href={cardHref(t.facet)} className="cf-inline" onClick={(e) => { e.preventDefault(); select(t.facet) }}>{t.word}</a>
  )
  const list = (ts: FilterTrait[]) => ts.map((t, i) => (
    <span key={t.facet}>{i > 0 && (i === ts.length - 1 ? ' and ' : ', ')}<TraitLink t={t} /></span>
  ))
  const ClusterSummary = ({ ts }: { ts: FilterTrait[] }) => {
    const lean = ts.filter((t) => bandOf(t.facet) !== 'mid')
    const mid = ts.filter((t) => bandOf(t.facet) === 'mid')
    return (
      <>
        {lean.length > 0 && <>[LAB COPY] In this group your answers lean most clearly toward {list(lean)}. </>}
        {mid.length > 0 && <>{lean.length === 0 ? '[LAB COPY] All of these sit near the middle for you: ' : ''}{list(mid)}{lean.length > 0 ? (mid.length === 1 ? ' sits' : ' sit') + ' near the middle.' : '.'} </>}
      </>
    )
  }
  const clusterBlock = (c: string) => {
    const two = clusterIn.filter((t) => bandOf(t.facet) !== 'mid').slice(0, 8)
    const g = live && clusterGen.status === 'ready' && q.alt !== '1' ? clusterGen : null
    const sendableFacets = sendable(clusterIn).map((t) => t.facet)
    return (
      <div className="cf-text">
        {g && (
          <div style={{ marginBottom: 18 }}>
            <p style={{ ...type.display4, color: ink, margin: 0 }}>{g.headline}</p>
            <p style={{ ...type.meta, margin: '6px 0 0' }}>{AI_LINE}</p>
          </div>
        )}
        {/* Same structure as a trait card: title, a subtitle line, the lead sentence, then the body. */}
        <h2 style={{ ...type.traitWord, color: ink, margin: '0 0 2px' }}>{familyLabel(c)}</h2>
        <p style={{ ...type.meta, margin: '0 0 18px' }}>[LAB COPY] {clusterIn.length} of your traits</p>
        <p style={{ ...type.display4, color: soft, margin: '0 auto 20px', maxWidth: 420 }}>{CLUSTER_DESCRIPTIONS[c][1].text}</p>
        <p style={{ ...type.body, color: soft, margin: '0 auto 12px', maxWidth: 420 }}>{CLUSTER_ABOUT[c]}</p>
        <p style={{ ...type.body, color: soft, margin: '0 auto', maxWidth: 420 }}>
          <ClusterSummary ts={clusterIn} /> {CLUSTER_HOW_TO_READ}
        </p>
        {clusterTension && (
          <div className="cf-tension">
            <p style={{ ...type.ui, color: ink, margin: '0 0 4px' }}>[LAB COPY] Where two of these pull apart</p>
            <p style={{ ...type.body, color: soft, margin: 0 }}>[LAB COPY] Relationship insight: the cached generated text for this pair.</p>
            <p style={{ ...type.meta, margin: '4px 0 0' }}>{evidenceSentence(clusterTension)}</p>
          </div>
        )}
        <MultiEvidence traits={evidenceRows(Array.from(new Set([...two.map((t) => t.facet), ...(g?.drawsOn ?? [])])).filter((f) => sendableFacets.includes(f)), sendableFacets)} hueOf={hueOf} onSeeTrait={select} startOpen={q.ev === '1'} />
      </div>
    )
  }

  // Paid: hue = cluster, a full colour from Palette 1 (no steps within a cluster). Free: the live per-trait hues.
  const hueOf = (t: FilterTrait): Colour => (!paid ? t.traitHue : t.clusterColour)
  const shown = order.map((f) => byFacet.get(f)!).filter(Boolean)
  const selectedTrait = paid ? (selected ? byFacet.get(selected) : undefined) : shown[0]
  const relFor = (facet: string) => rels.find((r) => r.signals.some((x) => x.facet === facet))
  const ties = topTieCount(revealed)

  let under: ReactNode
  if (selectedTrait) {
    const rel = paid ? relFor(selectedTrait.facet) : undefined
    under = (
      <TraitCard t={selectedTrait} hue={hueOf(selectedTrait)} paid={paid} responses={responses}
        insight={rel ? `[LAB COPY] Relationship insight: the cached generated text for this pair. ${evidenceSentence(rel)}` : undefined}
        onCluster={() => setView(selectedTrait.cluster)} />
    )
  } else if (view === 'overview') under = summaryBlock()
  else under = clusterBlock(view)

  const caption = !paid ? 'Free, 5 traits' : [viewLabel(view), selectedTrait ? `${selectedTrait.word} selected` : 'nothing selected', n < 30 ? `${n} traits revealed` : null, forced, live ? 'live generation' : null].filter(Boolean).join(', ')

  return (
    <main className="cf">
      <style dangerouslySetInnerHTML={{ __html: CF_CSS }} />
      <p style={{ ...type.meta, textAlign: 'center', margin: '0 0 20px' }}>Report lab · {caption}</p>
      {paid && (
        <div className="cf-control">
          <ShowingMenu view={view} options={options} labelOf={viewLabel} onChange={setView} mobile={mobile} startOpen={q.menu === '1'} />
        </div>
      )}
      {paid && (
        <div className="cf-backrow">
          {selectedTrait && <button ref={backRef} type="button" className="cf-back" onClick={zoomOut}>← Back to {viewLabel(view)}</button>}
        </div>
      )}
      <div className="cf-col">
        <ReportCluster traits={shown} hueOf={hueOf} onSelect={select} overview={paid && !selectedTrait} registerButton={register} satellites={q.sat ?? 'breathe'} labelsInside={q.lab !== 'out'} />
      </div>
      {paid && view === 'overview' && !selectedTrait && ties > 5 && (
        <p style={{ ...type.meta, textAlign: 'center', margin: '8px 0 0' }}>[LAB COPY] {ties} traits tie as most pronounced. Showing five: the ones you unlocked first.</p>
      )}
      <div className="cf-under">{under}</div>
    </main>
  )
}

const CF_CSS = `
  body{background:#F7F4ED;}
  .cf{min-height:100vh;background:#F7F4ED;color:${ink};padding:28px 16px 64px;text-align:center;}
  .cf-col{max-width:520px;margin:0 auto;}
  .cf-control{max-width:760px;margin:0 auto 4px;}
  .cf-backrow{height:52px;display:flex;align-items:center;justify-content:center;}
  .cf-under{max-width:520px;margin:20px auto 0;}
  .cf-text{max-width:480px;margin:0 auto;}
  .cf button:focus-visible,.cf summary:focus-visible{outline:2px solid #D85A30;outline-offset:2px;}
  .cf-back{min-height:44px;padding:0 16px;border-radius:999px;border:1px solid #E5E1D5;background:#FFFFFF;color:${ink};cursor:pointer;font-family:var(--font-body);font-size:var(--text-ui);font-weight:500;}
  .cf-heads{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px;}
  .cf-sumlist{list-style:none;margin:0;padding:0;}
  .cf-sumlist li{padding:12px 0;border-top:1px solid #E5E1D5;}
  .cf-sumlist li:first-child{border-top:0;}
  .cf-standout-main{display:block;width:100%;padding:8px 4px;border:0;background:none;cursor:pointer;text-align:center;}
  .cf-standout-list{list-style:none;margin:0;padding:0;}
  .cf-standout-list li{border-top:1px solid #E5E1D5;padding:6px 0;}
  .cf-head{width:100%;min-height:44px;padding:8px 4px;border:0;background:none;cursor:pointer;text-align:center;}
  .cf-inline{display:inline;padding:0;border:0;background:none;cursor:pointer;color:${ink};font:inherit;text-decoration:underline;text-underline-offset:3px;text-decoration-color:rgba(38,36,32,0.4);}
  .cf-cluster-link{font-family:var(--font-body);font-size:var(--text-meta);color:${soft};min-height:44px;padding:0 4px;}
  .cf-track{min-height:44px;margin-top:16px;padding:0 18px;border-radius:999px;border:1px solid #E5E1D5;background:#FFFFFF;color:${ink};cursor:pointer;font-family:var(--font-body);font-size:var(--text-ui);font-weight:500;}
  .cf-tension{margin-top:24px;padding:16px;border-radius:14px;background:#FFFFFF;}
  .cf-about{margin-top:20px;}
  .cf-about summary{min-height:44px;display:inline-flex;align-items:center;cursor:pointer;font-family:var(--font-body);font-size:var(--text-ui);font-weight:500;color:${soft};}
  .cf-skel{display:flex;flex-direction:column;align-items:center;gap:10px;}
  .cf-bar{display:block;height:14px;border-radius:999px;background:#ECE7DC;}
`
