'use client'

/**
 * Report lab, Phase 2: one frame of the options board, rendered at the
 * width it's opened at (the board shows each at 390 and 1280). Low
 * fidelity: static layouts, the real blob engine, the real 30-trait
 * example. Every blob is a static path; each frame defines its gradients
 * and one blur filter once and shares them.
 */

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { blobGradientStops, buildPointMotionProfile, generateAnimatedBlobPath, hashSeed } from '@/lib/blobs'
import {
  byFamily, cardFor, FAMILY_HUES, familyLabel, freeTraits, labTraits, LAB_PRACTICE_COUNT, mostPronounced, packTraits, radius, type LabTrait,
} from '@/lib/lab/reportLab'
import { type } from '@/lib/design/type'

const ink = '#262420'
const soft = '#56534D'
const cream = '#F7F4ED'
const coral = '#D85A30'
const line = '#E5E1D5'

export type FrameQuery = { view?: string; d?: string; n?: string; sel?: string; v?: string; s?: string }

// ── Shared SVG pieces ────────────────────────────────────────────────────────

function Defs({ id, blur = 2.2 }: { id: string; blur?: number }) {
  return (
    <defs>
      {Object.values(FAMILY_HUES).map((hue) => (
        <radialGradient key={hue} id={`${id}-g${hue}`} cx="45%" cy="40%" r="70%">
          {blobGradientStops(hue, true).map((s, i) => <stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />)}
        </radialGradient>
      ))}
      <filter id={`${id}-f`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={blur} /></filter>
    </defs>
  )
}

function blobPath(t: LabTrait, cx: number, cy: number, r: number) {
  return generateAnimatedBlobPath(cx, cy, r, buildPointMotionProfile(hashSeed(`lab-${t.facet}`), 8), 0.3, 0)
}

// A trait as a node: static blob, a 44px (at least) hit circle, the trait
// word as its accessible name, a coral ring when selected.
function Node({ id, t, cx, cy, r, opacity = 1, selected = false, label, labelBelow = false, labelSize = 13 }: {
  id: string; t: LabTrait; cx: number; cy: number; r: number; opacity?: number; selected?: boolean; label?: boolean; labelBelow?: boolean; labelSize?: number
}) {
  return (
    <g role="button" tabIndex={0} aria-label={t.word} style={{ cursor: 'pointer' }}>
      <title>{t.word}</title>
      <circle cx={cx} cy={cy} r={Math.max(22, r)} fill="transparent" />
      <path d={blobPath(t, cx, cy, r)} fill={`url(#${id}-g${t.hue})`} filter={`url(#${id}-f)`} opacity={opacity} />
      {selected && <circle cx={cx} cy={cy} r={r + 6} fill="none" stroke={coral} strokeWidth={2} />}
      {label && (
        <text x={cx} y={labelBelow ? cy + r + labelSize + 4 : cy + labelSize * 0.35} textAnchor="middle"
          style={{ fontFamily: 'var(--font-trait)', fontStyle: 'italic', fontWeight: 600, fontSize: labelSize, fill: ink }}>
          {t.word}
        </text>
      )}
    </g>
  )
}

// Group centres for n families: a zigzag down the phone, a wave across the desktop.
function centers(n: number, mobile: boolean, w: number, h: number) {
  return Array.from({ length: n }, (_, i) => {
    if (mobile) {
      const x = n === 1 ? w / 2 : i % 2 === 0 ? w * 0.27 : w * 0.73
      return { x: n % 2 === 1 && i === n - 1 && n > 1 ? w / 2 : x, y: (h / (n + 0.4)) * (i + 0.7) }
    }
    return { x: (w / n) * (i + 0.5), y: i % 2 === 0 ? h * 0.36 : h * 0.66 }
  })
}

// Positions inside a group: the most pronounced in the middle, the rest on a ring.
function ringPositions(count: number, R: number, seed: string) {
  const jitter = (hashSeed(seed) % 30) - 15
  return Array.from({ length: count }, (_, i) => {
    if (i === 0) return { dx: 0, dy: 0 }
    const a = ((-90 + (360 / Math.max(1, count - 1)) * (i - 1) + jitter) * Math.PI) / 180
    return { dx: Math.cos(a) * R, dy: Math.sin(a) * R }
  })
}

function FindLinks() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 14, flexWrap: 'wrap' }}>
      <button type="button" style={chip}>Find a trait</button>
      <button type="button" style={{ ...chip, background: 'transparent', border: 'none', textDecoration: 'underline' }}>How your traits are grouped</button>
    </div>
  )
}
const chip: CSSProperties = { ...type.ui, minHeight: 44, padding: '0 16px', borderRadius: 999, border: `1px solid ${line}`, background: '#FFFFFF', color: ink, cursor: 'pointer' }

// ── A. Constellation ─────────────────────────────────────────────────────────

function Constellation({ traits, selected, mobile }: { traits: LabTrait[]; selected: LabTrait | null; mobile: boolean }) {
  const groups = byFamily(traits)
  const w = mobile ? 358 : 1040
  const h = mobile ? Math.max(260, groups.length * 122) : 440
  const cs = centers(groups.length, mobile, w, h)
  const R = mobile ? 56 : 70
  const id = 'a'
  return (
    <div style={{ background: ink, borderRadius: 24, padding: mobile ? '18px 0' : '24px 0' }}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', overflow: 'visible' }} role="group" aria-label="Your traits">
        <Defs id={id} blur={1.6} />
        {groups.map((g, gi) => {
          const pos = ringPositions(g.traits.length, R, g.family)
          const inFamily = selected?.family === g.family
          return (
            <g key={g.family}>
              {g.traits.slice(1).map((t, i) => (
                <line key={t.facet} x1={cs[gi].x} y1={cs[gi].y} x2={cs[gi].x + pos[i + 1].dx} y2={cs[gi].y + pos[i + 1].dy}
                  stroke={`hsla(${g.traits[0].hue},70%,75%,${selected && !inFamily ? 0.1 : 0.35})`} strokeWidth={1} />
              ))}
              {g.traits.map((t, i) => (
                <Node key={t.facet} id={id} t={t} cx={cs[gi].x + pos[i].dx} cy={cs[gi].y + pos[i].dy} r={radius(t, mobile ? 7 : 9, mobile ? 17 : 22)}
                  opacity={selected && !inFamily ? 0.3 : 0.55 + 0.45 * t.size} selected={selected?.facet === t.facet} />
              ))}
            </g>
          )
        })}
        {selected && (() => {
          const gi = groups.findIndex((g) => g.family === selected.family)
          const pos = ringPositions(groups[gi].traits.length, R, groups[gi].family)[groups[gi].traits.indexOf(selected)]
          return <text x={cs[gi].x + pos.dx} y={cs[gi].y + pos.dy + (mobile ? 40 : 48)} textAnchor="middle" style={{ fontFamily: 'var(--font-trait)', fontStyle: 'italic', fontWeight: 600, fontSize: 18, fill: cream }}>{selected.word}</text>
        })()}
      </svg>
    </div>
  )
}

// ── B. Map ───────────────────────────────────────────────────────────────────

function MapView({ traits, selected, mobile }: { traits: LabTrait[]; selected: LabTrait | null; mobile: boolean }) {
  const groups = byFamily(traits)
  const w = mobile ? 358 : 1040
  const h = mobile ? Math.max(280, groups.length * 190) : 500
  const cs = centers(groups.length, mobile, w, h)
  const R = mobile ? 50 : 66
  const regionR = mobile ? 84 : 112
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', overflow: 'visible' }} role="group" aria-label="Your traits">
      {groups.map((g, gi) => {
        const hue = g.traits[0].hue
        const region = generateAnimatedBlobPath(cs[gi].x, cs[gi].y, regionR, buildPointMotionProfile(hashSeed(`map-${g.family}`), 9), 0.35, 0)
        const pos = ringPositions(g.traits.length, R, g.family)
        const dim = selected && selected.family !== g.family
        return (
          <g key={g.family} opacity={dim ? 0.4 : 1}>
            <path d={region} fill={`hsla(${hue},60%,72%,0.16)`} stroke={`hsla(${hue},45%,45%,0.25)`} strokeWidth={1} />
            <text x={cs[gi].x} y={cs[gi].y - regionR - 8} textAnchor="middle" style={{ ...type.meta, fontSize: 13, fill: '#6B675F' }}>{familyLabel(g.family)}</text>
            {g.traits.map((t, i) => {
              const x = cs[gi].x + pos[i].dx
              const y = cs[gi].y + pos[i].dy
              const rings = 1 + Math.round(t.strength * 2)
              const isSel = selected?.facet === t.facet
              return (
                <g key={t.facet} role="button" tabIndex={0} aria-label={t.word}>
                  <title>{t.word}</title>
                  <circle cx={x} cy={y} r={22} fill="transparent" />
                  {Array.from({ length: rings }, (_, k) => (
                    <circle key={k} cx={x} cy={y} r={5 + k * (mobile ? 4.5 : 6)} fill="none" stroke={`hsla(${hue},55%,42%,${0.55 - k * 0.1})`} strokeWidth={1} />
                  ))}
                  <circle cx={x} cy={y} r={3.5} fill={`hsl(${hue},55%,42%)`} />
                  {isSel && <text x={x} y={y + 34} textAnchor="middle" style={{ fontFamily: 'var(--font-trait)', fontStyle: 'italic', fontWeight: 600, fontSize: 16, fill: ink }}>{t.word}</text>}
                  {isSel && <circle cx={x} cy={y} r={5 + (rings - 1) * (mobile ? 4.5 : 6) + 5} fill="none" stroke={coral} strokeWidth={2} />}
                </g>
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}

// ── C. Palette + carousel ────────────────────────────────────────────────────

function PaletteCarousel({ traits, selected, mobile }: { traits: LabTrait[]; selected: LabTrait | null; mobile: boolean }) {
  const palette = byFamily(traits).flatMap((g) => g.traits)
  const hero = selected ?? mostPronounced(traits)[0]
  const hi = palette.indexOf(hero)
  const prev = palette[hi - 1]
  const next = palette[hi + 1]
  const w = mobile ? 358 : 1040
  const hh = mobile ? 230 : 280
  const id = 'c'
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${hh}`} width="100%" style={{ display: 'block', overflow: 'visible' }} role="group" aria-label="Selected trait">
        <Defs id={id} blur={3} />
        {prev && <Node id={id} t={prev} cx={w / 2 - (mobile ? 128 : 230)} cy={hh / 2} r={mobile ? 30 : 46} opacity={0.4} />}
        {next && <Node id={id} t={next} cx={w / 2 + (mobile ? 128 : 230)} cy={hh / 2} r={mobile ? 30 : 46} opacity={0.4} />}
        <Node id={id} t={hero} cx={w / 2} cy={hh / 2} r={(mobile ? 62 : 84) + 20 * hero.size} label labelSize={mobile ? 24 : 30} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14, marginTop: 4 }}>
        <span style={{ ...type.meta }}>{hi + 1} of {palette.length}</span>
        <button type="button" style={chip}>Most pronounced</button>
      </div>
      <div style={{ overflowX: 'auto', marginTop: 16, paddingBottom: 6 }}>
        <div style={{ display: 'flex', gap: 0, width: 'max-content', margin: '0 auto' }} role="listbox" aria-label="All traits">
          {byFamily(traits).map((g) => (
            <div key={g.family} style={{ display: 'flex', marginRight: 12 }}>
              {g.traits.map((t) => (
                <svg key={t.facet} width={44} height={44} viewBox="0 0 44 44" role="option" aria-selected={t === hero} aria-label={t.word} style={{ overflow: 'visible' }}>
                  <title>{t.word}</title>
                  <path d={blobPath(t, 22, 22, t === hero ? 15 : 8 + 6 * t.size)} fill={`hsla(${t.hue},70%,62%,${0.45 + 0.45 * t.size})`} />
                  {t === hero && <circle cx={22} cy={22} r={19} fill="none" stroke={coral} strokeWidth={2} />}
                </svg>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── D. Packed cluster ────────────────────────────────────────────────────────

function Packed({ traits, selected, mobile }: { traits: LabTrait[]; selected: LabTrait | null; mobile: boolean }) {
  const { items, box } = packTraits(traits, 22, 40)
  const w = mobile ? 358 : 640
  const scale = Math.min(1.4, w / box.w)
  const h = box.h * scale
  const id = 'd'
  return (
    <div style={{ maxWidth: w, margin: '0 auto' }}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', overflow: 'visible' }} role="group" aria-label="Your traits">
        <Defs id={id} blur={1.4} />
        {items.map(({ trait: t, c }) => {
          const r = c.r * scale
          const x = (c.x - box.minX) * scale + (w - box.w * scale) / 2
          const y = (c.y - box.minY) * scale
          const dim = selected && selected.facet !== t.facet
          return <Node key={t.facet} id={id} t={t} cx={x} cy={y} r={r * 0.94} opacity={dim ? 0.45 : 0.9} selected={selected?.facet === t.facet} label={r >= 34 || selected?.facet === t.facet} labelSize={13} />
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}><button type="button" style={chip}>Most pronounced</button></div>
    </div>
  )
}

// ── E. Family grid ───────────────────────────────────────────────────────────

function FamilyGrid({ traits, selected, mobile }: { traits: LabTrait[]; selected: LabTrait | null; mobile: boolean }) {
  const cell = mobile ? 59 : 112
  const id = 'e'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: mobile ? 14 : 18 }}>
      <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden="true"><Defs id={id} blur={1.4} /></svg>
      {byFamily(traits).map((g) => (
        <div key={g.family} style={{ textAlign: 'center' }}>
          <p style={{ ...type.meta, margin: '0 0 4px' }}>{familyLabel(g.family)}</p>
          <div style={{ display: 'flex', justifyContent: 'center' }} role="group" aria-label={familyLabel(g.family)}>
            {g.traits.map((t) => {
              const isSel = selected?.facet === t.facet
              const showLabel = !mobile || isSel
              const hgt = mobile ? (isSel ? 82 : 60) : 104
              return (
                <svg key={t.facet} width={cell} height={hgt} viewBox={`0 0 ${cell} ${hgt}`} style={{ overflow: 'visible' }}>
                  <Node id={id} t={t} cx={cell / 2} cy={mobile ? 30 : 42} r={radius(t, mobile ? 9 : 14, mobile ? 24 : 36)}
                    opacity={selected && !isSel ? 0.45 : 0.9} selected={isSel} label={showLabel} labelBelow labelSize={mobile ? 12 : 13} />
                </svg>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

const DIRECTIONS: Record<string, { name: string; C: typeof Constellation }> = {
  A: { name: 'A. Constellation', C: Constellation },
  B: { name: 'B. Map', C: MapView },
  C: { name: 'C. Palette + carousel', C: PaletteCarousel },
  D: { name: 'D. Packed cluster', C: Packed },
  E: { name: 'E. Family grid', C: FamilyGrid },
}

// ── Supporting pieces ────────────────────────────────────────────────────────

function Tiles({ traits, mobile }: { traits: LabTrait[]; mobile: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {byFamily(traits).map((g) => (
        <div key={g.family}>
          <p style={{ ...type.meta, margin: '0 0 8px', textAlign: 'center' }}>{familyLabel(g.family)}</p>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${mobile ? 2 : 6}, minmax(0,1fr))`, gap: 8 }}>
            {g.traits.map((t) => (
              <button key={t.facet} type="button" style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '4px 8px', borderRadius: 12, border: `1px solid ${line}`, background: '#FFFFFF', cursor: 'pointer' }}>
                <svg width={24} height={24} viewBox="0 0 24 24" aria-hidden="true" style={{ overflow: 'visible', flexShrink: 0 }}>
                  <path d={blobPath(t, 12, 12, 9)} fill={`hsla(${t.hue},70%,62%,0.75)`} />
                </svg>
                <span style={{ fontFamily: 'var(--font-trait)', fontStyle: 'italic', fontWeight: 600, fontSize: 14, color: ink, textAlign: 'left', lineHeight: 1.15 }}>{t.word}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function Picker({ v, traits, mobile }: { v: string; traits: LabTrait[]; mobile: boolean }) {
  const head = <p style={{ ...type.display4, color: ink, textAlign: 'center', margin: '0 0 14px' }}>How your traits are grouped</p>
  if (v === '1') {
    return (
      <div style={{ position: 'relative', minHeight: mobile ? 760 : 560, background: 'rgba(38,36,32,0.35)', borderRadius: 20, overflow: 'hidden' }}>
        <p style={{ ...type.meta, color: cream, textAlign: 'center', padding: 16 }}>(the visual sits behind)</p>
        <div style={mobile
          ? { position: 'absolute', left: 0, right: 0, bottom: 0, background: cream, borderRadius: '20px 20px 0 0', padding: '20px 16px 28px' }
          : { position: 'absolute', left: '50%', top: 70, transform: 'translateX(-50%)', width: 720, background: cream, borderRadius: 20, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
          {mobile && <div style={{ width: 40, height: 4, borderRadius: 2, background: line, margin: '0 auto 14px' }} />}
          {head}
          <Tiles traits={traits} mobile={mobile} />
        </div>
      </div>
    )
  }
  return (
    <div>
      <div style={{ height: mobile ? 200 : 260, borderRadius: 20, border: `1px dashed ${line}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ ...type.meta }}>(the visual)</p>
      </div>
      <button type="button" aria-expanded="true" style={{ ...chip, display: 'block', margin: '16px auto' }}>How your traits are grouped ▴</button>
      <div style={{ background: '#FFFFFF', border: `1px solid ${line}`, borderRadius: 20, padding: mobile ? 16 : 24 }}>
        <Tiles traits={traits} mobile={mobile} />
      </div>
    </div>
  )
}

function SummaryCard() {
  return (
    <div style={{ background: '#FFFFFF', border: `1px solid ${line}`, borderRadius: 20, padding: 24, textAlign: 'center' }}>
      <p style={{ ...type.meta, margin: '0 0 8px' }}>[LAB COPY] Your first ring</p>
      <p style={{ ...type.display3, color: ink, margin: '0 0 10px' }}>[LAB COPY] Your answers lean most clearly toward Ambitious, Take-charge and Energized.</p>
      <p style={{ ...type.body, color: soft, margin: 0 }}>[LAB COPY] Two or three sentences on how the most pronounced traits show up together. Written later from your results; marked as AI-written.</p>
    </div>
  )
}

function DetailCard({ t, back }: { t: LabTrait; back: boolean }) {
  const c = cardFor(t.facet)
  return (
    <div style={{ background: '#FFFFFF', border: `1px solid ${line}`, borderRadius: 20, padding: 24, textAlign: 'center' }}>
      {back && <button type="button" style={{ ...chip, border: 'none', background: 'transparent', textDecoration: 'underline', marginBottom: 6 }}>← Overview</button>}
      <p style={{ fontFamily: 'var(--font-trait)', fontStyle: 'italic', fontWeight: 600, fontSize: 30, color: ink, margin: '0 0 10px' }}>{t.word}</p>
      <p style={{ ...type.display4, color: ink, margin: '0 0 10px' }}>{c.trait_quote}</p>
      <p style={{ ...type.body, color: soft, margin: '0 0 14px' }}>{c.body}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
        {c.tags.map((g) => <span key={g} style={{ ...type.ui, padding: '6px 12px', borderRadius: 999, border: `1px solid hsla(${t.hue},50%,50%,0.4)` }}>{g}</span>)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
        <button type="button" style={chip}>See what this is based on</button>
        <button type="button" style={chip}>[LAB COPY] Track this</button>
      </div>
    </div>
  )
}

function Summary({ v, traits }: { v: string; traits: LabTrait[] }) {
  const t = mostPronounced(traits)[0]
  const label = (s: string) => <p style={{ ...type.meta, textAlign: 'center', margin: '18px 0 8px' }}>{s}</p>
  if (v === '1') {
    return <div>{label('Nothing selected')}<SummaryCard />{label('Trait selected (replaces the summary)')}<DetailCard t={t} back /></div>
  }
  return <div>{label('Always on top')}<SummaryCard />{label('Trait selected (opens below)')}<DetailCard t={t} back={false} /></div>
}

function Closing({ v, s, traits, mobile }: { v: string; s: string; traits: LabTrait[]; mobile: boolean }) {
  const paid = s === 'paid'
  const own = paid ? mostPronounced(traits).slice(0, LAB_PRACTICE_COUNT) : freeTraits(traits)
  const top = mostPronounced(paid ? traits : freeTraits(traits))[0]
  const headline = paid ? '[LAB COPY] Put it into practice' : '[LAB COPY] See the rest of your report'
  const sub = paid
    ? `[LAB COPY] Start with your ${LAB_PRACTICE_COUNT} most pronounced traits. Change them any time.`
    : '[LAB COPY] All 30 traits. One payment, no subscription.'
  const cta = paid ? `Start your practice with these ${LAB_PRACTICE_COUNT}` : 'Unlock all 30 traits'
  const cluster = (
    <svg width={own.length * 40} height={48} viewBox={`0 0 ${own.length * 40} 48`} aria-hidden="true" style={{ overflow: 'visible', display: 'block', margin: '0 auto 14px' }}>
      <Defs id={`cl-${v}-${s}`} blur={1.6} />
      {own.map((t, i) => <path key={t.facet} d={blobPath(t, 20 + i * 40, 24, 12 + 6 * t.size)} fill={`url(#cl-${v}-${s}-g${t.hue})`} filter={`url(#cl-${v}-${s}-f)`} />)}
    </svg>
  )
  const body = (
    <>
      {cluster}
      <p style={{ ...type.display2, color: ink, margin: '0 0 8px' }}>{headline}</p>
      <p style={{ ...type.body, color: soft, margin: '0 0 22px' }}>{sub}</p>
      <button type="button" style={{ ...type.ui, minHeight: 52, padding: '0 26px', borderRadius: 999, border: 'none', background: ink, color: cream, cursor: 'pointer' }}>{cta}</button>
    </>
  )
  const footer = <div style={{ background: '#1C1C1A', height: 120, marginTop: 48, borderRadius: 0 }}><p style={{ ...type.meta, color: '#8C8A83', padding: 20 }}>(footer)</p></div>
  if (v === '1') {
    return <div><div style={{ maxWidth: 640, margin: '0 auto', background: '#FFFFFF', border: `1px solid ${line}`, borderRadius: 28, padding: mobile ? '32px 20px' : '44px 40px', textAlign: 'center' }}>{body}</div>{footer}</div>
  }
  return (
    <div>
      <div style={{ margin: mobile ? '0 -16px' : '0 -48px', background: `hsla(${top.hue},60%,75%,0.22)`, padding: mobile ? '40px 16px' : '64px 48px', textAlign: 'center' }}>{body}</div>
      <div style={{ margin: mobile ? '0 -16px' : '0 -48px' }}>{footer}</div>
    </div>
  )
}

// ── Frame ────────────────────────────────────────────────────────────────────

export default function LabFrame({ q }: { q: FrameQuery }) {
  const [mobile, setMobile] = useState(true)
  useEffect(() => {
    const on = () => setMobile(window.innerWidth < 700)
    on()
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  const all = labTraits()
  const traits = q.n === '5' ? freeTraits(all) : all
  const selected = q.sel === '1' ? mostPronounced(traits)[0] : null
  let title = ''
  let content: ReactNode = null
  if (q.view === 'dir') {
    const d = DIRECTIONS[q.d ?? 'A'] ?? DIRECTIONS.A
    title = `${d.name}, ${traits.length} traits${selected ? `, ${selected.word} selected` : ''}`
    content = <><d.C traits={traits} selected={selected} mobile={mobile} /><FindLinks /></>
  } else if (q.view === 'picker') {
    title = `Trait picker ${q.v}: ${q.v === '1' ? (mobile ? 'bottom sheet' : 'popover') : 'inline panel'}`
    content = <Picker v={q.v ?? '1'} traits={all} mobile={mobile} />
  } else if (q.view === 'summary') {
    title = `Summary and trait detail ${q.v}: ${q.v === '1' ? 'swap' : 'summary stays on top'}`
    content = <Summary v={q.v ?? '1'} traits={all} />
  } else if (q.view === 'closing') {
    title = `Closing panel ${q.v}: ${q.v === '1' ? 'contained panel' : 'tinted band'}, ${q.s === 'paid' ? 'paid' : 'locked at 5'}`
    content = <Closing v={q.v ?? '1'} s={q.s ?? 'locked'} traits={all} mobile={mobile} />
  }
  return (
    <div style={{ background: cream, minHeight: '100vh', color: ink }}>
      <div style={{ maxWidth: 1136, margin: '0 auto', padding: mobile ? '20px 16px 40px' : '32px 48px 56px' }}>
        <p style={{ ...type.meta, textAlign: 'center', margin: '0 0 18px' }}>Report lab · {title}</p>
        {content}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `g[role="button"]:focus-visible{outline:2px solid ${coral};outline-offset:2px;} button:focus-visible{outline:2px solid ${ink};outline-offset:2px;}` }} />
    </div>
  )
}
