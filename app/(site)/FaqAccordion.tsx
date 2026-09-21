'use client'

import { useState } from 'react'

// Interaction technique (max-height transition + rotating "+" icon) copied
// from components/known/DirectionAccordion.tsx:57-71 — not the file itself,
// since that one's colors and content shape (tier/word/summary/body) are
// report/assessment-specific. This is a generic question/answer component
// styled with the landing page's own mk* tokens (css block lives in
// LandingPageClient.tsx, classes prefixed faq-*). Closed by default —
// openIdx starts as an empty Set, same as the source.
//
// Moved here from app/(site)/home-v2/FaqAccordion.tsx so it survives when
// /home-v2 is deleted later; LandingPageClient.tsx is its only user now.

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
        const headerId = `faq-question-${i}`
        const panelId = `faq-answer-${i}`
        return (
          <div key={item.question} className="faq-item">
            {/* <h3> wraps the <button> (not the other way around) — a
                <button>'s content model is phrasing content only, so a
                heading can't legally sit inside it. Enter/Space toggle for
                free via native button semantics, no key handler needed. */}
            <h3>
              <button
                type="button"
                id={headerId}
                className="faq-row"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(i)}
              >
                {item.question}
                <span
                  className="faq-icon"
                  aria-hidden="true"
                  style={{ transform: isOpen ? 'rotate(45deg)' : 'none' }}
                >
                  +
                </span>
              </button>
            </h3>
            <div
              className="faq-body"
              id={panelId}
              role="region"
              aria-labelledby={headerId}
              style={{ maxHeight: isOpen ? 400 : 0 }}
            >
              <div className="faq-body-inner">
                {item.answer === null ? (
                  <div className="faq-placeholder">[PLACEHOLDER: no drafted answer in the ledger yet]</div>
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
