'use client'

import { useState } from 'react'
import { AXIS_POLES, type WorkingStyleAxis } from '@/lib/known/workingStyleScoring'

// ── Layout: matches reference/known-full-flow.html's "Anchored pairs" section ──
// viewBox 0 0 400 190. 3 horizontal axis lines (y=48/108/168), each with a dot
// positioned between its pole labels. Colors are the confirmed real values, not
// approximated from the reference mockup.

const AXIS_ROWS: { axis: WorkingStyleAxis; y: number; fill: string; stroke: string; radius: number }[] = [
  { axis: 'structure',    y: 48,  fill: 'hsl(200,55%,88%)', stroke: 'hsl(200,55%,42%)', radius: 13 },
  { axis: 'independence', y: 108, fill: 'hsl(280,45%,88%)', stroke: 'hsl(280,45%,46%)', radius: 15 },
  { axis: 'directness',   y: 168, fill: 'hsl(40,55%,88%)',  stroke: 'hsl(40,55%,44%)',  radius: 11 },
]

const LEFT_X = 40
const RIGHT_X = 360

const gray         = '#8C8A83'
const charcoalSoft = '#56534D'
const charcoal     = '#262420'
const sans         = 'var(--font-inter), system-ui, sans-serif'
const serif        = 'var(--font-newsreader), serif'

export interface WorkingStyleAxisItem {
  axis:     WorkingStyleAxis
  position: number // 0-1, see workingStyleScoring.ts convention
  quote:    string
  evidence: string
}

export default function WorkingStyleVisual({ items }: { items: WorkingStyleAxisItem[] }) {
  const [activeAxis, setActiveAxis] = useState<WorkingStyleAxis>('structure')
  const activeRow = AXIS_ROWS.find((r) => r.axis === activeAxis)!
  const activeItem = items.find((i) => i.axis === activeAxis)

  return (
    <div>
      <div style={{ position: 'relative', width: '100%', maxWidth: 400, margin: '0 auto' }}>
        <svg viewBox="0 0 400 190" width="100%" style={{ overflow: 'visible', display: 'block' }}>
          {AXIS_ROWS.map((row) => {
            const poles = AXIS_POLES[row.axis]
            const item = items.find((i) => i.axis === row.axis)
            const cx = LEFT_X + (item?.position ?? 0.5) * (RIGHT_X - LEFT_X)
            const isActive = row.axis === activeAxis
            return (
              <g key={row.axis}>
                <text x={LEFT_X} y={row.y - 15} fontSize="11" fill={charcoalSoft}>{poles.left}</text>
                <text x={RIGHT_X} y={row.y - 15} textAnchor="end" fontSize="11" fill={gray}>{poles.right}</text>
                <line x1={LEFT_X} y1={row.y} x2={RIGHT_X} y2={row.y} stroke="#E5E1D5" strokeWidth="1" />
                <circle
                  cx={cx} cy={row.y} r={row.radius}
                  fill={row.fill} stroke={row.stroke} strokeWidth={isActive ? 2.5 : 1.5}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setActiveAxis(row.axis)}
                />
              </g>
            )
          })}
        </svg>
      </div>

      {/* Detail panel — swaps with the tapped axis. marginTop matches the visual→detail
          gap used elsewhere in the report (Environment/Relationships use 20; Energy's
          own internal gap is tighter at 4, which reads as cramped — not matched here). */}
      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <h3 style={{ fontFamily: serif, fontSize: 21, fontWeight: 600, color: charcoal, margin: '0 0 6px' }}>
          {AXIS_DISPLAY_NAME[activeAxis]}
        </h3>
        <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 16, lineHeight: 1.55, color: activeRow.stroke, maxWidth: 400, margin: '0 auto 6px' }}>
          &ldquo;{activeItem?.quote ?? ''}&rdquo;
        </p>
        <p style={{ fontFamily: sans, fontSize: 12, color: gray, margin: '0 0 20px' }}>
          From your working style branch
        </p>
        <div style={{ margin: '0 0 4px' }}>
          <p style={{
            fontFamily: sans, fontSize: 13, fontWeight: 600, margin: '0 0 8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', display: 'inline-block', background: activeRow.stroke }} />
            Where this shows up
          </p>
          <p style={{ fontFamily: sans, fontSize: 14.5, lineHeight: 1.7, color: charcoalSoft, maxWidth: 420, margin: '0 auto' }}>
            {activeItem?.evidence ?? ''}
          </p>
        </div>
        <p style={{ fontFamily: sans, fontSize: 12, color: gray, marginTop: 18 }}>
          Tap a point above for more on that specific axis
        </p>
      </div>
    </div>
  )
}

const AXIS_DISPLAY_NAME: Record<WorkingStyleAxis, string> = {
  structure: 'Structure', independence: 'Independence', directness: 'Directness',
}
