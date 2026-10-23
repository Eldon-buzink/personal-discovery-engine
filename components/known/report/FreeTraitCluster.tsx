'use client'

// The free report's "Who you are" visual: the selected trait as the big blob
// in the middle, the others around it, each in its own colour (no clusters
// for free users). Tapping a blob swaps it into the middle; the others keep
// their places. Same props as TraitCarousel (selection is a position in the
// strength order), so the report can use either. Behind
// NEXT_PUBLIC_REPORT_FREE_CLUSTER (lib/known/reportFlags.ts).

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CarouselTrait } from '@/components/known/TraitCarousel'
import { BlobCluster } from './BlobCluster'

export function FreeTraitCluster({ traits, strengths, activeIdx, onSelect, children }: {
  /** Strongest first (the report's strength order). */
  traits: CarouselTrait[]
  /** How pronounced each trait is (0 … 2), by key. */
  strengths: Record<string, number>
  activeIdx: number
  onSelect: (i: number) => void
  children?: ReactNode
}) {
  const keys = traits.map((t) => t.key).join('|')
  const [order, setOrder] = useState<string[]>(() => traits.map((t) => t.key))
  // A new set of traits (one more revealed): start again from strength order.
  useEffect(() => { setOrder(traits.map((t) => t.key)) }, [keys]) // eslint-disable-line react-hooks/exhaustive-deps
  // Keep the selected trait in the middle; swap it with whatever was there.
  const active = traits[activeIdx]?.key
  const placed = useMemo(() => {
    const o = order.filter((k) => traits.some((t) => t.key === k))
    const i = active ? o.indexOf(active) : -1
    if (i > 0) [o[0], o[i]] = [o[i], o[0]]
    return o
  }, [order, active, traits])
  useEffect(() => { if (placed.join('|') !== order.join('|')) setOrder(placed) }, [placed]) // eslint-disable-line react-hooks/exhaustive-deps

  const items = placed.map((k) => {
    const t = traits.find((x) => x.key === k)!
    return { facet: t.key, word: t.traitWord, strength: strengths[t.key] ?? 0, hue: t.hue }
  })
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <BlobCluster
          traits={items}
          hueOf={(t) => t.hue}
          onSelect={(facet) => { const i = traits.findIndex((t) => t.key === facet); if (i >= 0) onSelect(i) }}
          satellites="breathe"
          labelsInside
          readability="light"
        />
      </div>
      {children}
    </div>
  )
}
