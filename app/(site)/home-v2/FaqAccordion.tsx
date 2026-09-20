'use client'

import { useState } from 'react'

// Copies the interaction TECHNIQUE from components/known/DirectionAccordion.tsx:57-71
// (max-height transition + rotating "+" icon) — not the file itself, per the
// task's instruction. That file's colors (#8C8A83/#56534D/#E5E1D5) and content
// shape (tier/word/summary/body) are report/assessment-specific; this is a
// generic question/answer component styled with the landing page's own mk*
// tokens (css block lives in HomeV2Client.tsx, classes prefixed hv2-faq-*).
// Closed by default — openIdx starts as an empty Set, same as the source.

export interface FaqAccordionItem {
  question: string
  answer: string | string[] | null // null = no drafted answer yet -> placeholder
}

export default function FaqAccordion({ items }: { items: FaqAccordionItem[] }) {
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
    <div>
      {items.map((item, i) => {
        const isOpen = openIdx.has(i)
        return (
          <div key={item.question} className="hv2-faq-item" onClick={() => toggle(i)}>
            <div className="hv2-faq-row">
              <h3>{item.question}</h3>
              <span
                className="hv2-faq-icon"
                style={{ transform: isOpen ? 'rotate(45deg)' : 'none' }}
              >
                +
              </span>
            </div>
            <div className="hv2-faq-body" style={{ maxHeight: isOpen ? 400 : 0 }}>
              <div className="hv2-faq-body-inner">
                {item.answer === null ? (
                  <div className="hv2-placeholder">[PLACEHOLDER: no drafted answer in the ledger yet]</div>
                ) : Array.isArray(item.answer) ? (
                  item.answer.map((line, j) => <p key={j}>{line}</p>)
                ) : (
                  <p>{item.answer}</p>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
