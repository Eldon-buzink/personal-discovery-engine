'use client'

import { useState } from 'react'

// Matches reference/known-full-flow.html's .direction-card/.direction-expand CSS
// exactly (colors, sizes, the 0→240px max-height transition, the 45° icon rotate).
// No color, no blob, no dot-on-line — confirmed this branch doesn't use either
// existing visual language.

const gray         = '#8C8A83'
const charcoalSoft = '#56534D'
const charcoal     = '#262420'
const line         = '#E5E1D5'
const white        = '#FDFCF9'
const sans         = 'var(--font-inter), system-ui, sans-serif'
const serif        = 'var(--font-newsreader), serif'

export interface DirectionAccordionItem {
  tier:    string // "Closest match" | "Worth exploring" — passed through as-is
  word:    string // action-phrase title, e.g. "Make something with your hands"
  summary: string // collapsed-state text
  body:    string // expanded-state text
}

export default function DirectionAccordion({ items }: { items: DirectionAccordionItem[] }) {
  const [openIdx, setOpenIdx] = useState<Set<number>>(new Set())

  function toggle(i: number) {
    setOpenIdx((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 480, margin: '0 auto' }}>
      {items.map((item, i) => {
        const isOpen = openIdx.has(i)
        return (
          <div
            key={i}
            onClick={() => toggle(i)}
            style={{
              background: white, border: `1px solid ${line}`, borderRadius: 14,
              padding: '20px 22px', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <p style={{ fontFamily: sans, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: gray, fontWeight: 700, margin: '0 0 8px' }}>
              {item.tier}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <h3 style={{ fontFamily: serif, fontSize: 18, fontWeight: 600, margin: 0, color: charcoal }}>
                {item.word}
              </h3>
              <span style={{
                fontSize: 14, color: gray, flexShrink: 0,
                transition: 'transform 0.25s ease',
                transform: isOpen ? 'rotate(45deg)' : 'none',
              }}>
                +
              </span>
            </div>
            <p style={{ fontFamily: sans, fontSize: 13.5, lineHeight: 1.6, color: charcoalSoft, margin: '9px 0 0' }}>
              {item.summary}
            </p>
            <div style={{
              maxHeight: isOpen ? 240 : 0, overflow: 'hidden',
              transition: 'max-height 0.35s ease',
            }}>
              <div style={{ paddingTop: 13, marginTop: 13, borderTop: `1px solid ${line}` }}>
                <p style={{ fontFamily: sans, fontSize: 13.5, lineHeight: 1.6, color: charcoalSoft, margin: '0 0 10px' }}>
                  {item.body}
                </p>
                <p style={{ fontFamily: sans, fontSize: 11.5, color: gray, margin: 0 }}>
                  From your direction branch
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
