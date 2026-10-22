'use client'

// Report lab: run today's card and the split card side by side for six
// example traits. Nothing runs until the button is pressed; each press is
// six pairs of model calls. The raw output and every attempt's verdict are
// shown, and also kept in a <pre id="cc-json"> so they can be copied out.

import { useState } from 'react'
import { type } from '@/lib/design/type'
import { generateLabCardPair, type CardPair } from '../actions'

export const COMPARE_FACETS = ['Achievement-Striving', 'Assertiveness', 'Vulnerability', 'Depression', 'Self-Discipline', 'Trust']

function SplitCard({ c }: { c: { trait_quote: string; shows_up: string; tradeoff: string } }) {
  return (
    <div>
      <p style={{ ...type.display4, margin: '0 0 12px' }}>{c.trait_quote}</p>
      <p style={{ ...type.body, color: '#56534D', margin: 0 }}>{c.shows_up}</p>
      {c.tradeoff && <p style={{ ...type.body, color: '#56534D', margin: '14px 0 0' }}>{c.tradeoff}</p>}
    </div>
  )
}

export default function CardCompare() {
  const [results, setResults] = useState<CardPair[]>([])
  const [running, setRunning] = useState(false)
  const run = async () => {
    setRunning(true)
    const out: CardPair[] = []
    for (const f of COMPARE_FACETS) {
      out.push(await generateLabCardPair(f).catch((e) => ({ status: 'failed' as const, reason: String(e) })))
      setResults([...out])
    }
    setRunning(false)
  }
  return (
    <main style={{ minHeight: '100vh', background: '#F7F4ED', padding: '28px 16px 64px' }}>
      <h1 style={{ ...type.display3, textAlign: 'center', margin: '0 0 8px' }}>Report lab: card format, old and new</h1>
      <p style={{ ...type.meta, textAlign: 'center', margin: '0 0 16px' }}>Six traits from the example. Needs LAB_CONTENT_GENERATION=1 and a key on the server.</p>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <button type="button" id="cc-run" disabled={running} onClick={run} style={{ minHeight: 44, padding: '0 18px', borderRadius: 999, border: '1px solid #E5E1D5', background: '#FFFFFF', cursor: 'pointer' }}>
          {running ? `Running (${results.length} of ${COMPARE_FACETS.length})` : 'Generate old and new'}
        </button>
      </div>
      {results.map((r, i) => (
        <section key={i} style={{ maxWidth: 1100, margin: '0 auto 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 16 }}>
          {r.status !== 'ok' ? <p style={{ ...type.body }}>Failed: {r.reason}</p> : (
            <>
              <div style={{ background: '#FFFFFF', borderRadius: 14, padding: 16 }}>
                <p style={{ ...type.ui, margin: '0 0 8px' }}>{r.word} ({r.facet}, {r.direction}): today</p>
                {r.old.value ? (
                  <>
                    <p style={{ ...type.display4, margin: '0 0 12px' }}>{r.old.value.trait_quote}</p>
                    <p style={{ ...type.body, color: '#56534D', margin: 0 }}>{r.old.value.body}</p>
                    <p style={{ ...type.meta, margin: '8px 0 0' }}>Tags: {r.old.value.tags.join(' · ')}</p>
                  </>
                ) : <p style={{ ...type.body }}>No usable card.</p>}
                <ul style={{ ...type.meta, margin: '10px 0 0', paddingLeft: 18 }}>{r.old.attempts.map((a, j) => <li key={j}>{a.verdict}</li>)}</ul>
              </div>
              <div style={{ background: '#FFFFFF', borderRadius: 14, padding: 16 }}>
                <p style={{ ...type.ui, margin: '0 0 8px' }}>{r.word}: split</p>
                {r.split.value ? <SplitCard c={r.split.value} /> : <p style={{ ...type.body }}>No usable card.</p>}
                <ul style={{ ...type.meta, margin: '10px 0 0', paddingLeft: 18 }}>{r.split.attempts.map((a, j) => <li key={j}>{a.verdict}</li>)}</ul>
              </div>
            </>
          )}
        </section>
      ))}
      <pre id="cc-json" style={{ display: 'none' }}>{JSON.stringify(results)}</pre>
    </main>
  )
}
