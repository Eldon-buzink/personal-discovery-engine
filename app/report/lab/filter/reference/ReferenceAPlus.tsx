'use client'

// Report lab, reference only: the A+ mock ("Top five or one domain, with a
// filter") from commit a138942 (branch report-options), unchanged apart from
// imports, rendered so it can be compared with the new variants. Sample
// scores, per-trait hues and its own copy, as it was then.

import { useState } from 'react'
import { hashSeed, userCuratedHue, type FacetEntry } from '@/components/known/ReportVisuals'
import { DOMAIN_FACETS } from '@/lib/known/ring1-questions'
import { FACET_DESCRIPTIONS, getTraitWord } from '@/lib/known/scoring'
import { InteractiveCluster } from './OldInteractiveCluster'


const cream = '#F7F4ED'
const gray = '#8C8A83'
const charcoalSoft = '#56534D'
const charcoal = '#262420'
const line = '#E5E1D5'
const coral = '#D85A30'
const sans = 'var(--font-inter), system-ui, sans-serif'
const serif = 'var(--font-newsreader), serif'

// Working labels for the five domains. New copy — placeholders for this mock.
const DOMAIN_LABEL: Record<string, string> = {
  Neuroticism: 'Emotional range',
  Extraversion: 'Social energy',
  Openness: 'Openness',
  Agreeableness: 'How you relate',
  Conscientiousness: 'How you work',
}

// Sample scores (1–5), deterministic per facet.
function sampleScore(facet: string): number {
  return 1.4 + (hashSeed(facet + '-sample') % 330) / 100
}

interface Trait extends FacetEntry { domain: string; score: number; hue: number }

const TRAITS: Trait[] = (() => {
  const all = Object.entries(DOMAIN_FACETS).flatMap(([domain, facets]) => facets.map((facet) => ({ domain, facet })))
  // reveal order: shuffled, so hues/hueOffset look like a real session
  const revealed = [...all].sort((a, b) => hashSeed(a.facet + 'r') - hashSeed(b.facet + 'r'))
  return all.map(({ domain, facet }) => {
    const score = sampleScore(facet)
    const traitWord = getTraitWord(facet, score)
    const hueOffset = revealed.findIndex((r) => r.facet === facet)
    return { facet, traitWord, hueOffset, content: null, domain, score, hue: userCuratedHue(`ring1-pattern-${traitWord.toLowerCase()}`, hueOffset) }
  })
})()

const pronounced = (t: Trait) => Math.abs(t.score - 3)
const TOP5 = [...TRAITS].sort((a, b) => pronounced(b) - pronounced(a)).slice(0, 5)
const BY_DOMAIN = Object.keys(DOMAIN_FACETS).map((d) => ({ domain: d, traits: TRAITS.filter((t) => t.domain === d) }))


function Detail({ t }: { t: Trait | null }) {
  if (!t) return null
  return (
    <div style={{ textAlign: 'center', marginTop: 22 }}>
      <p style={{ fontFamily: serif, fontSize: 24, fontWeight: 600, color: charcoal, margin: '0 0 6px' }}>{t.traitWord}</p>
      <p style={{ fontFamily: sans, fontSize: 13.5, color: charcoalSoft, lineHeight: 1.6, maxWidth: 420, margin: '0 auto' }}>
        {FACET_DESCRIPTIONS[t.facet]}
      </p>
      <p style={{ fontFamily: sans, fontSize: 11.5, color: gray, marginTop: 8 }}>(the full trait detail would follow here)</p>
    </div>
  )
}
// ── A+. Filter: top five or one domain → pills → cluster ───────────────────

const filterCSS = `
  .opt-filter{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:2px 2px 4px;margin:0 -22px;padding-left:22px;padding-right:22px;}
  .opt-filter::-webkit-scrollbar{display:none;}
  .opt-chip{flex:0 0 auto;border:1px solid ${line};background:transparent;border-radius:999px;padding:7px 14px;
    font-family:${sans};font-size:13px;color:${charcoalSoft};cursor:pointer;white-space:nowrap;transition:background .15s ease,color .15s ease;}
  .opt-chip:hover{border-color:#CFCABD;}
  .opt-chip[aria-pressed="true"]{background:${charcoal};border-color:${charcoal};color:${cream};}
  .opt-chip:focus-visible,.opt-pill:focus-visible{outline:2px solid ${coral};outline-offset:2px;}
  @media(min-width:600px){.opt-filter{justify-content:center;flex-wrap:wrap;margin:0;padding-left:2px;padding-right:2px;}}
`

const GROUPS: { key: string; label: string; traits: Trait[] }[] = [
  { key: 'top', label: 'Top 5', traits: TOP5 },
  ...BY_DOMAIN.map(({ domain, traits }) => ({
    key: domain,
    label: DOMAIN_LABEL[domain],
    traits: [...traits].sort((a, b) => pronounced(b) - pronounced(a)),
  })),
]

function pillRadius(t: Trait): string {
  const h = hashSeed(t.traitWord)
  return `${48 + (h % 14)}% ${52 - (h % 9)}% ${50 + (h % 11)}% ${46 + (h % 8)}% / ${55 + (h % 10)}% ${45 + (h % 12)}% ${58 - (h % 9)}% ${44 + (h % 10)}%`
}

function OptionFiltered() {
  const [groupKey, setGroupKey] = useState('top')
  const [activeIdx, setActiveIdx] = useState(0)
  const group = GROUPS.find((g) => g.key === groupKey)!
  const selected = group.traits[Math.min(activeIdx, group.traits.length - 1)]
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: pillCSS + filterCSS }} />
      <div className="opt-filter" role="group" aria-label="Show traits">
        {GROUPS.map((g) => (
          <button
            key={g.key}
            className="opt-chip"
            aria-pressed={g.key === groupKey}
            onClick={() => { setGroupKey(g.key); setActiveIdx(0) }}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 4, margin: '16px 0 4px' }}>
        {group.traits.map((t, i) => (
          <button
            key={t.facet}
            className="opt-pill"
            aria-pressed={selected === t}
            onClick={() => setActiveIdx(i)}
            style={{ ['--h' as string]: String(t.hue), ['--r' as string]: pillRadius(t) }}
          >
            {t.traitWord}
          </button>
        ))}
      </div>
      <InteractiveCluster key={groupKey} facets={group.traits} activeIdx={activeIdx} onSelect={setActiveIdx} />
      <Detail t={selected} />
    </>
  )
}

const pillCSS = `
  .opt-pill{position:relative;isolation:isolate;border:0;background:none;cursor:pointer;
    padding:9px 16px;font-family:${serif};font-style:italic;font-size:15.5px;color:${charcoal};}
  .opt-pill::before{content:'';position:absolute;inset:1px -2px;z-index:-1;filter:blur(5px);
    background:radial-gradient(ellipse at 45% 40%, hsla(var(--h),75%,64%,.55), hsla(var(--h),60%,78%,.28) 60%, hsla(var(--h),55%,85%,0) 78%);
    border-radius:var(--r);transition:opacity .2s ease, transform .2s ease;opacity:.85;}
  .opt-pill:hover::before{transform:scale(1.06);opacity:1;}
  .opt-pill[aria-pressed="true"]{font-weight:600;}
  .opt-pill[aria-pressed="true"]::before{opacity:1;background:radial-gradient(ellipse at 45% 40%, hsla(var(--h),80%,62%,.85), hsla(var(--h),70%,70%,.4) 60%, hsla(var(--h),55%,85%,0) 80%);}
`


export default function ReferenceAPlus() {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 22px', textAlign: 'center' }}>
      <p style={{ fontFamily: sans, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase', color: gray, fontWeight: 600, margin: '0 0 6px' }}>Who you are</p>
      <OptionFiltered />
    </div>
  )
}
