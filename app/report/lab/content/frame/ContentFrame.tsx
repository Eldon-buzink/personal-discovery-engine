'use client'

// Report lab: content under the visual, per selection. Low fidelity; every
// generated piece is a [LAB COPY] placeholder and nothing calls a model.
//
// Query (fixed settings): f paid|free, m a (Summary and Most pronounced as
// separate states) | b (one merged Overview), s summary structure a|b,
// cl cluster layout a|b, d description draft 1|2, n revealed traits (paid,
// default 30), st ready|loading|failed, ev 1 (evidence panel open),
// fs 1 (free user gets a short Summary), menu 1.
// Live state: the filter and the selected trait (none = the level's own
// content), mirrored into the URL with replaceState.

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { UnlockedContent } from '@/components/known/ReportVisuals'
import EvidenceDialog from '@/components/known/EvidenceDialog'
import { patternSubtitle } from '@/components/known/TraitCarousel'
import { evidencePanelData } from '@/lib/known/evidencePanel'
import { exampleResponses } from '@/lib/known/exampleReport'
import { evidenceSentence, type FiredRelationship } from '@/lib/known/relationships'
import { type } from '@/lib/design/type'
import {
  bandOf, cardFor, clusterTraits, CLUSTERS, familyLabel, filterTraits, freeTraits, mostPronounced, relationshipsFor,
  topTieCount, topTraits, type FilterTrait,
} from '@/lib/lab/filterLab'
import {
  AI_LINE, CLUSTER_DESCRIPTIONS, clusterReadingEligible, CLUSTER_READING_MIN_TRAITS, sendable, summaryEligible, SUMMARY_MIN_TRAITS, validateDrawsOn,
} from '@/lib/lab/contentLab'
import { ReportCluster } from '../../filter/ReportCluster'
import { ShowingMenu } from '../../filter/ShowingMenu'
import { EvidenceList } from '../EvidenceList'

export interface ContentQuery {
  f?: string; m?: string; s?: string; cl?: string; d?: string; n?: string; st?: string; ev?: string; fs?: string; menu?: string
  view?: string; trait?: string
}

const ink = '#262420'
const soft = '#56534D'

const LEVELS = new Set(['summary', 'top', 'overview'])

const viewLabel = (v: string) =>
  v === 'top' ? 'Most pronounced' : v === 'summary' ? '[LAB COPY] Summary' : v === 'overview' ? '[LAB COPY] Overview' : familyLabel(v)
// Summary/Overview drop their marker in running text; a cluster's working
// label (Curiosity) keeps it.
const plainLabel = (v: string) => (LEVELS.has(v) ? viewLabel(v).replace('[LAB COPY] ', '') : familyLabel(v))

function writeUrl(view: string, trait: string | null) {
  const p = new URLSearchParams(window.location.search)
  p.set('view', view)
  if (trait) p.set('trait', trait); else p.delete('trait')
  window.history.replaceState(window.history.state, '', `${window.location.pathname}?${p.toString()}`)
}

function placeOrder(traits: FilterTrait[], first?: string | null): string[] {
  const order = traits.map((t) => t.facet)
  const i = first ? order.indexOf(first) : -1
  if (i > 0) [order[0], order[i]] = [order[i], order[0]]
  return order
}

// ── Pieces ─────────────────────────────────────────────────────────────────

const Ai = () => <p style={{ ...type.meta, margin: '10px 0 0' }}>{AI_LINE}</p>

function EvidenceRow({ count, onOpen }: { count: number; onOpen: () => void }) {
  return (
    <button type="button" className="cf-evidence" onClick={onOpen}>
      [LAB COPY] Based on {count} of your traits · See what this draws on
    </button>
  )
}

function Skeleton({ label }: { label: string }) {
  return (
    <div aria-busy="true" aria-live="polite" className="cf-skel">
      <span className="cf-bar" style={{ width: '70%' }} /><span className="cf-bar" style={{ width: '92%' }} /><span className="cf-bar" style={{ width: '84%' }} />
      <p style={{ ...type.meta, margin: '8px 0 0' }}>{label}</p>
    </div>
  )
}

function Headlines({ traits, onPick }: { traits: FilterTrait[]; onPick: (f: string) => void }) {
  return (
    <ul className="cf-heads">
      {traits.map((t) => (
        <li key={t.facet}>
          <button type="button" className="cf-head" onClick={() => onPick(t.facet)}>
            <span style={{ ...type.traitWord, fontSize: 18, color: ink }}>{t.word}</span>
            <span style={{ ...type.body, color: soft }}>{cardFor(t.facet).trait_quote}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

// ── The frame ──────────────────────────────────────────────────────────────

export default function ContentFrame({ q }: { q: ContentQuery }) {
  const paid = q.f !== 'free'
  const merged = q.m === 'b'
  const st = q.st ?? 'ready'
  const [mobile, setMobile] = useState(false)
  useEffect(() => { const m = () => setMobile(window.innerWidth < 700); m(); window.addEventListener('resize', m); return () => window.removeEventListener('resize', m) }, [])
  const all = useMemo(filterTraits, [])
  const responses = useMemo(exampleResponses, [])
  const n = paid ? Math.max(1, Math.min(30, Number(q.n ?? 30))) : 5
  const revealed = useMemo(() => (paid ? all.filter((t) => t.revealIndex < n) : freeTraits(all)), [all, paid, n])
  const rels = useMemo(() => relationshipsFor(revealed), [revealed])
  const clusters = CLUSTERS.filter((c) => revealed.some((t) => t.cluster === c))
  const options = merged ? ['overview', ...clusters] : ['summary', 'top', ...clusters]

  const defaultView = merged ? 'overview' : 'summary'
  const [view, setViewState] = useState(paid ? (q.view && options.includes(q.view) ? q.view : defaultView) : 'top')
  const setOf = (v: string) => (!paid ? revealed : LEVELS.has(v) ? topTraits(revealed) : clusterTraits(revealed, v))
  const [selected, setSelected] = useState<string | null>(paid ? q.trait ?? null : null)
  const [order, setOrder] = useState(() => placeOrder(setOf(view), q.trait))
  const [evOpen, setEvOpen] = useState(q.ev === '1')
  const byFacet = new Map(all.map((t) => [t.facet, t]))
  const traits = order.map((k) => byFacet.get(k)!).filter(Boolean)
  const hueOf = (t: FilterTrait) => (paid ? t.clusterHue : t.traitHue)

  const select = (facet: string) => {
    const next = [...order]
    const i = next.indexOf(facet)
    if (i < 0) return
    ;[next[0], next[i]] = [next[i], next[0]]
    setOrder(next)
    if (paid) { setSelected(facet); writeUrl(view, facet) }
  }
  const backToLevel = () => { setSelected(null); writeUrl(view, null) }
  const setView = (v: string, pick?: string) => {
    setViewState(v)
    setOrder(placeOrder(setOf(v), pick))
    setSelected(pick ?? null)
    setEvOpen(false)
    writeUrl(v, pick ?? null)
  }

  // ── content for the current selection ───────────────────────────────────
  const freeCentre = !paid ? traits[0] : undefined
  const selectedTrait = paid ? (selected ? byFacet.get(selected) : undefined) : freeCentre
  const relFor = (facet: string): FiredRelationship | undefined => rels.find((r) => r.signals.some((s) => s.facet === facet))

  const traitCard = (t: FilterTrait) => {
    const rel = paid ? relFor(t.facet) : undefined
    return (
      <div>
        {paid && <button type="button" className="cf-back" onClick={backToLevel}>← [LAB COPY] Back to {plainLabel(view)}</button>}
        <UnlockedContent
          traitWord={t.word}
          content={cardFor(t.facet)}
          hue={hueOf(t)}
          subtitle={patternSubtitle(t.revealIndex)}
          source={null}
          variant="ring1"
          insight={rel ? `[LAB COPY] Relationship insight: the cached generated text for this pair. ${evidenceSentence(rel)}` : undefined}
          evidence={<EvidenceDialog key={t.facet} data={evidencePanelData(t.facet, bandOf(t.facet), responses, true)} />}
        />
        <Ai />
        {paid && <button type="button" className="cf-track">[LAB COPY] Track this</button>}
      </div>
    )
  }

  // Summary: needs SUMMARY_MIN_TRAITS revealed; draws only on revealed, sendable traits.
  const top = topTraits(revealed)
  const pointerRel = rels.find((r) => r.signals.some((s) => top.some((t) => t.facet === s.facet)))
  const pointerTrait = pointerRel ? top.find((t) => pointerRel.signals.some((s) => s.facet === t.facet)) : undefined
  const summaryInput = sendable(revealed).map((t) => t.facet)
  const summaryDraws = validateDrawsOn(
    Array.from(new Set([...top.map((t) => t.facet), ...(pointerRel?.signals.map((s) => s.facet) ?? [])])).filter((f) => summaryInput.includes(f)),
    summaryInput,
  )
  const summaryDrawTraits = summaryDraws.ok ? summaryDraws.facets.map((f) => byFacet.get(f)!) : []

  const summaryBlock = () => {
    if (!summaryEligible(revealed)) {
      return (
        <div className="cf-text">
          <p style={{ ...type.meta, margin: '0 0 12px' }}>[LAB COPY] Your summary appears once you have {SUMMARY_MIN_TRAITS} traits. You have {revealed.length} so far. Here are your most pronounced ones.</p>
          <Headlines traits={top} onPick={select} />
        </div>
      )
    }
    if (st === 'loading') return <Skeleton label="[LAB COPY] Writing your summary." />
    if (st === 'failed') {
      return (
        <div className="cf-text">
          <Headlines traits={top} onPick={select} />
        </div>
      )
    }
    const standouts = clusters.map((c) => {
      const inC = mostPronounced(revealed.filter((t) => t.cluster === c))
      const best = inC[0]
      const words = best && best.strength >= 1 ? inC.filter((t) => t.strength === best.strength).map((t) => t.word) : []
      return { c, words }
    }).filter((x) => x.words.length)
    return (
      <div className="cf-text">
        <p style={{ ...type.display4, color: ink, margin: '0 0 8px' }}>[LAB COPY] Summary headline: one sentence on what stands out most.</p>
        <p style={{ ...type.body, color: soft, margin: 0 }}>
          [LAB COPY] {q.s === 'b' ? 'Two short sentences on what stands out across your report.' : 'A short paragraph, three or four sentences, on what stands out across your report. Each cluster side by side, never one explaining another.'}
        </p>
        {q.s === 'b' && (
          <ul className="cf-standouts">
            {standouts.map(({ c, words }) => (
              <li key={c}>
                <button type="button" className="cf-standout" onClick={() => setView(c)}>
                  <span style={{ ...type.meta, color: soft }}>{plainLabel(c)}</span>
                  <span style={{ ...type.body, color: ink }}>[LAB COPY] {words.join(', ')} {words.length > 1 ? 'stand' : 'stands'} out.</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {pointerRel && pointerTrait && (
          <button type="button" className="cf-pointer" onClick={() => select(pointerTrait.facet)}>
            [LAB COPY] {pointerRel.signals.map((s) => s.traitWord).join(' and ')} pull in different directions. Read more on {pointerTrait.word}.
          </button>
        )}
        {revealed.length < 30 && <p style={{ ...type.meta, margin: '10px 0 0' }}>[LAB COPY] Based on the {revealed.length} traits you have so far.</p>}
        <Ai />
        <EvidenceRow count={summaryDrawTraits.length} onOpen={() => setEvOpen(true)} />
      </div>
    )
  }

  const mostPronouncedBlock = (withFraming = true) => {
    const ties = topTieCount(revealed)
    return (
      <div className="cf-text">
        {withFraming && <p style={{ ...type.body, color: soft, margin: '0 0 6px' }}>[LAB COPY] The five traits your answers lean on most.</p>}
        {ties > 5 && <p style={{ ...type.meta, margin: '0 0 12px' }}>[LAB COPY] {ties} traits tie as most pronounced. Showing five: the ones you unlocked first.</p>}
        <Headlines traits={top} onPick={select} />
      </div>
    )
  }

  const clusterBlock = (c: string) => {
    const inC = clusterTraits(revealed, c)
    const draft = CLUSTER_DESCRIPTIONS[c][q.d === '2' ? 1 : 0]
    const input = sendable(inC).map((t) => t.facet)
    const draws = validateDrawsOn(input, input)
    const drawTraits = draws.ok ? draws.facets.map((f) => byFacet.get(f)!) : []
    const tension = rels.find((r) => r.signals.every((s) => inC.some((t) => t.facet === s.facet)))
    const tensionTrait = tension ? inC.find((t) => t.facet === tension.signals[0].facet) : undefined
    const eligible = clusterReadingEligible(inC)
    const reading = !eligible
      ? <p style={{ ...type.meta, margin: 0 }}>[LAB COPY] A reading for this group appears once you have {CLUSTER_READING_MIN_TRAITS} of its traits.</p>
      : st === 'loading'
        ? <Skeleton label="[LAB COPY] Writing your reading." />
        : st === 'failed'
          ? <Headlines traits={inC} onPick={select} />
          : (
            <>
              <p style={{ ...type.body, color: ink, margin: 0 }}>[LAB COPY] Personal reading: two or three sentences on how your {inC.length} traits in this group show up together. Never a score or a level.</p>
              <Ai />
              <EvidenceRow count={drawTraits.length} onOpen={() => setEvOpen(true)} />
            </>
          )
    const tensionBlock = tension && tensionTrait && eligible && st === 'ready' ? (
      q.cl === 'b'
        ? <button type="button" className="cf-pointer" onClick={() => select(tensionTrait.facet)}>[LAB COPY] {tension.signals.map((s) => s.traitWord).join(' and ')} pull in different directions. Read more on {tensionTrait.word}.</button>
        : (
          <div className="cf-tension">
            <p style={{ ...type.ui, color: ink, margin: '0 0 4px' }}>[LAB COPY] Where two of these pull apart</p>
            <p style={{ ...type.body, color: soft, margin: 0 }}>[LAB COPY] Relationship insight: the cached generated text for this pair.</p>
            <p style={{ ...type.meta, margin: '4px 0 0' }}>{evidenceSentence(tension)}</p>
          </div>
        )
    ) : null
    const evidence = <EvidenceList open={evOpen} onClose={() => setEvOpen(false)} title="[LAB COPY] What this reading draws on" traits={drawTraits} responses={responses} onPick={select} />
    if (q.cl === 'b') {
      // Layout b: the reading leads; the static description sits under it, quieter.
      return (
        <div className="cf-text">
          {reading}
          {tensionBlock}
          <details className="cf-about">
            <summary>[LAB COPY] What this group covers</summary>
            <p style={{ ...type.meta, margin: '6px 0 0' }}>{draft.text}</p>
          </details>
          {evidence}
        </div>
      )
    }
    // Layout a: static description first, then the reading, then the tension.
    return (
      <div className="cf-text">
        <p style={{ ...type.meta, margin: '0 0 14px' }}>{draft.text}</p>
        {reading}
        {tensionBlock}
        {evidence}
      </div>
    )
  }

  let under: ReactNode
  if (!paid) {
    under = (
      <>
        {q.fs === '1' && (
          <div className="cf-text" style={{ marginBottom: 24 }}>
            <p style={{ ...type.display4, color: ink, margin: '0 0 8px' }}>[LAB COPY] Free summary headline.</p>
            <p style={{ ...type.body, color: soft, margin: 0 }}>[LAB COPY] Two sentences on what stands out in your first five traits, each trait described on its own.</p>
            <p style={{ ...type.meta, margin: '10px 0 0' }}>[LAB COPY] Based on the 5 traits you have so far.</p>
            <Ai />
          </div>
        )}
        {freeCentre && traitCard(freeCentre)}
      </>
    )
  } else if (selectedTrait) {
    under = traitCard(selectedTrait)
  } else if (view === 'summary') {
    under = summaryBlock()
  } else if (view === 'overview') {
    under = summaryBlock()
  } else if (view === 'top') {
    under = mostPronouncedBlock()
  } else {
    under = clusterBlock(view)
  }

  const caption = !paid
    ? `Free, 5 traits${q.fs === '1' ? ', with a short Summary' : ''}`
    : [merged ? 'Overview merged (b)' : 'Separate Summary and Most pronounced (a)', viewLabel(view), selectedTrait ? `${selectedTrait.word} selected` : null,
      LEVELS.has(view) && view !== 'top' && !selectedTrait ? `summary ${q.s === 'b' ? 'b' : 'a'}` : null,
      !LEVELS.has(view) && !selectedTrait ? `cluster layout ${q.cl === 'b' ? 'b' : 'a'}, description ${q.d === '2' ? '2' : '1'}` : null,
      n < 30 ? `${n} traits revealed` : null, st !== 'ready' ? st : null].filter(Boolean).join(', ')

  return (
    <main className="cf">
      <style dangerouslySetInnerHTML={{ __html: CF_CSS }} />
      <p style={{ ...type.meta, textAlign: 'center', margin: '0 0 20px' }}>Report lab · {caption}</p>
      {paid && (
        <div className="cf-control">
          <ShowingMenu view={view} options={options} labelOf={viewLabel} onChange={(v) => setView(v)} mobile={mobile} startOpen={q.menu === '1'} />
        </div>
      )}
      <div className="cf-col"><ReportCluster traits={traits} hueOf={hueOf} onSelect={select} /></div>
      <div className="cf-under">{under}</div>
      {paid && LEVELS.has(view) && !selectedTrait && (
        <EvidenceList open={evOpen} onClose={() => setEvOpen(false)} title="[LAB COPY] What your summary draws on" traits={summaryDrawTraits} responses={responses} onPick={select} />
      )}
    </main>
  )
}

const CF_CSS = `
  body{background:#F7F4ED;}
  .cf{min-height:100vh;background:#F7F4ED;color:${ink};padding:28px 16px 64px;text-align:center;}
  .cf-col{max-width:520px;margin:0 auto;}
  .cf-control{max-width:760px;margin:0 auto 16px;}
  .cf-under{max-width:520px;margin:24px auto 0;}
  .cf-text{max-width:480px;margin:0 auto;}
  .cf button:focus-visible,.cf summary:focus-visible{outline:2px solid #D85A30;outline-offset:2px;}
  .cf-heads,.cf-standouts{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;}
  .cf-standouts{margin-top:16px;}
  .cf-head,.cf-standout{width:100%;min-height:44px;display:flex;flex-direction:column;align-items:center;gap:2px;padding:10px 14px;border:0;border-radius:14px;background:#FFFFFF;cursor:pointer;text-align:center;}
  .cf-pointer,.cf-evidence,.cf-back{display:inline-flex;align-items:center;min-height:44px;margin-top:12px;padding:0 4px;border:0;background:none;cursor:pointer;color:${ink};
    font-family:var(--font-body);font-size:var(--text-ui);font-weight:500;text-decoration:underline;text-underline-offset:4px;text-decoration-color:rgba(38,36,32,0.35);}
  .cf-back{margin:0 0 8px;text-decoration:none;}
  .cf-track{min-height:44px;margin-top:16px;padding:0 18px;border-radius:999px;border:1px solid #E5E1D5;background:#FFFFFF;color:${ink};cursor:pointer;font-family:var(--font-body);font-size:var(--text-ui);font-weight:500;}
  .cf-tension{margin-top:20px;padding:16px;border-radius:14px;background:#FFFFFF;}
  .cf-about{margin-top:20px;}
  .cf-about summary{min-height:44px;display:inline-flex;align-items:center;cursor:pointer;font-family:var(--font-body);font-size:var(--text-ui);font-weight:500;color:${soft};}
  .cf-skel{display:flex;flex-direction:column;align-items:center;gap:10px;}
  .cf-bar{display:block;height:14px;border-radius:999px;background:#ECE7DC;}
`
