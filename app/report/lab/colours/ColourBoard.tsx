'use client'

// Report lab: cluster colour options on the cream background, each shown as
// normal vision and simulated protanopia, deuteranopia and tritanopia
// (Machado 2009, severity 1.0, an SVG feColorMatrix in linear RGB). Numbers
// are the minimum pairwise CIEDE2000 between the five colours per vision
// type and the weakest colour against the cream, worked out offline with
// the same model.

import { useMemo } from 'react'
import { buildPointMotionProfile, generateAnimatedBlobPath, hashSeed } from '@/lib/blobs'
import { type } from '@/lib/design/type'

type HSL = [number, number, number]
const CLUSTERS = ['Emotional range', 'Social energy', 'Ideas and experiences', 'Getting along', 'Drive and discipline']

const PALETTES: { name: string; note: string; cols: HSL[]; min: Record<string, number>; cream: number }[] = [
  { name: 'Today', note: 'Hue only, 80% / 62%.', cols: [[235, 80, 62], [35, 80, 62], [290, 80, 62], [175, 80, 62], [8, 80, 62]], min: { normal: 21.8, protan: 4.2, deutan: 10.8, tritan: 15.4 }, cream: 5.3 },
  { name: 'Targeted fix', note: 'Curiosity to rose 335, Getting along to a deeper teal. Protan fixed; tritan breaks (rose and coral).', cols: [[235, 80, 62], [35, 80, 62], [335, 80, 62], [180, 70, 38], [8, 80, 62]], min: { normal: 21.6, protan: 14.8, deutan: 10.8, tritan: 3.9 }, cream: 23.3 },
  { name: 'Palette 1', note: 'Hues at least 40° apart, lightness varies.', cols: [[250, 70, 42], [130, 85, 52], [340, 55, 42], [200, 85, 42], [20, 55, 52]], min: { normal: 29.5, protan: 20.3, deutan: 17.4, tritan: 16.2 }, cream: 25.3 },
  { name: 'Readable (proposed)', note: 'Dark text contrast 4.6 or more on every blob.', cols: [[240, 65, 70], [30, 45, 74], [80, 65, 60], [190, 55, 62], [350, 45, 62]], min: { normal: 26.5, protan: 17.4, deutan: 13.3, tritan: 17.6 }, cream: 15.2 },
  { name: 'Palette 1, muted green (too dark for text)', note: 'Social energy at 130 / 55% / 60%.', cols: [[250, 70, 42], [130, 55, 60], [340, 55, 42], [200, 85, 42], [20, 55, 52]], min: { normal: 29.5, protan: 20.3, deutan: 12.9, tritan: 16.2 }, cream: 21.7 },
  { name: 'Palette 2', note: 'Highest minimum, but two blues told apart mainly by lightness.', cols: [[240, 55, 42], [90, 85, 52], [340, 70, 62], [230, 55, 72], [0, 55, 42]], min: { normal: 23.5, protan: 19.4, deutan: 22.4, tritan: 19.3 }, cream: 25.0 },
]

const MATRIX: Record<string, string> = {
  protan: '0.152286 1.052583 -0.204868 0 0  0.114503 0.786281 0.099216 0 0  -0.003882 -0.048116 1.051998 0 0  0 0 0 1 0',
  deutan: '0.367322 0.860646 -0.227968 0 0  0.280085 0.672501 0.047413 0 0  -0.011820 0.042940 0.968881 0 0  0 0 0 1 0',
  tritan: '1.255528 -0.076749 -0.178779 0 0  -0.078411 0.930809 0.147602 0 0  0.004733 0.691367 0.303900 0 0  0 0 0 1 0',
}
const VISIONS = ['normal', 'protan', 'deutan', 'tritan'] as const

function Swatch({ c, i, label }: { c: HSL; i: number; label: string }) {
  const d = useMemo(() => generateAnimatedBlobPath(40, 40, 26, buildPointMotionProfile(hashSeed(`pal-${i}`), 9), 0.3, 0), [i])
  const id = `sw-${i}-${c.join('-')}`
  const [h, s, l] = c
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 72 }}>
      <svg width="64" height="64" viewBox="0 0 80 80" aria-hidden="true" style={{ overflow: 'visible' }}>
        <defs>
          <radialGradient id={`${id}-g`} cx="45%" cy="40%" r="70%">
            <stop offset="0%" stopColor={`hsl(${h},${s}%,${l}%)`} stopOpacity="1" />
            <stop offset="45%" stopColor={`hsl(${h},${s}%,${l}%)`} stopOpacity="0.88" />
            <stop offset="100%" stopColor={`hsl(${h},${Math.max(0, s - 10)}%,${Math.min(95, l + 15)}%)`} stopOpacity="0" />
          </radialGradient>
          <filter id={`${id}-f`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" /></filter>
        </defs>
        <path d={d} fill={`url(#${id}-g)`} filter={`url(#${id}-f)`} />
      </svg>
      <span style={{ ...type.meta, fontSize: 11, textAlign: 'center', lineHeight: 1.25 }}>{label}</span>
    </div>
  )
}

export default function ColourBoard() {
  return (
    <main style={{ minHeight: '100vh', background: '#F7F4ED', padding: '28px 16px 64px', color: '#262420' }}>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        {Object.entries(MATRIX).map(([k, m]) => (
          <filter key={k} id={`cvd-${k}`} colorInterpolationFilters="linearRGB"><feColorMatrix type="matrix" values={m} /></filter>
        ))}
      </svg>
      <h1 style={{ ...type.display3, textAlign: 'center', margin: '0 0 6px' }}>Report lab: cluster colours</h1>
      <p style={{ ...type.meta, textAlign: 'center', margin: '0 0 28px' }}>Target: at least 10 between any two colours in every row, and clearly visible on the cream. No hue steps inside a cluster.</p>
      {PALETTES.map((p) => (
        <section key={p.name} style={{ maxWidth: 980, margin: '0 auto 36px', borderTop: '1px solid #E5E1D5', paddingTop: 18 }}>
          <h2 style={{ ...type.display4, margin: '0 0 4px', textAlign: 'center' }}>{p.name}</h2>
          <p style={{ ...type.meta, margin: '0 0 12px', textAlign: 'center' }}>{p.note} Weakest against the cream: {p.cream}.</p>
          {VISIONS.map((v) => (
            <div key={v} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'center', margin: '0 0 10px' }}>
              <span style={{ ...type.ui, width: 120, textAlign: 'right', color: p.min[v] < 10 ? '#B23A1E' : '#262420' }}>
                {v === 'normal' ? 'Normal' : v === 'protan' ? 'Protanopia' : v === 'deutan' ? 'Deuteranopia' : 'Tritanopia'} · {p.min[v]}
              </span>
              <div style={{ display: 'flex', gap: 4, filter: v === 'normal' ? undefined : `url(#cvd-${v})` }}>
                {p.cols.map((c, i) => <Swatch key={i} c={c} i={i} label={CLUSTERS[i]} />)}
              </div>
            </div>
          ))}
        </section>
      ))}
    </main>
  )
}
