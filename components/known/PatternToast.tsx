'use client'

import { useEffect, useRef, useState } from 'react'
import AnimatedBlob from './AnimatedBlob'
import type { CompletedFacetRecord } from '@/lib/known/types'

const DISMISS_MS = 6000

interface PatternToastProps {
  record: CompletedFacetRecord
  revealedCount: number
  revealCap: number
  isPaid: boolean
  onDismiss: () => void
  onSeeIt: () => void
}

export default function PatternToast({ record, revealedCount, revealCap, isPaid, onDismiss, onSeeIt }: PatternToastProps) {
  const [progress, setProgress] = useState(100)
  const [dragY, setDragY] = useState(0)
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss

  const touchStartY = useRef<number | null>(null)
  const isDragging = useRef(false)

  // Auto-dismiss countdown
  useEffect(() => {
    const start = performance.now()
    let raf: number

    function tick(now: number) {
      const elapsed = now - start
      const pct = Math.max(0, 100 - (elapsed / DISMISS_MS) * 100)
      setProgress(pct)
      if (elapsed < DISMISS_MS) {
        raf = requestAnimationFrame(tick)
      } else {
        onDismissRef.current()
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY
    isDragging.current = false
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartY.current === null) return
    const delta = e.touches[0].clientY - touchStartY.current
    if (delta > 0) {
      isDragging.current = true
      setDragY(delta)
    }
  }

  function handleTouchEnd() {
    if (dragY > 72) {
      onDismissRef.current()
    } else {
      setDragY(0)
    }
    touchStartY.current = null
  }

  const isSliding = dragY > 0
  const transform = `translateX(-50%) translateY(${dragY}px)`

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        zIndex: 4000,
        width: 'calc(100% - 32px)',
        maxWidth: 360,
        background: '#F7F4ED',
        borderRadius: 16,
        boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
        overflow: 'hidden',
        transform,
        transition: isSliding ? 'none' : 'transform 0.3s cubic-bezier(0.22,1,0.36,1)',
        animation: isSliding ? 'none' : 'slideUp 0.4s cubic-bezier(0.22,1,0.36,1) both',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Main row — the whole toast opens the pattern detail now, not just
          "See it →". Tap-to-dismiss is gone; swipe-to-dismiss (below) and the
          auto-dismiss countdown are the only ways this closes without acting on it. */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }}
        onClick={onSeeIt}
      >
        {/* Blob */}
        <div style={{ flexShrink: 0, width: 48, height: 48 }}>
          <AnimatedBlob
            seed={`ring1-pattern-${record.traitWord.toLowerCase()}`}
            hueOffset={record.hueOffset}
            size={48}
            baseRadius={17}
            irregularity={0.28}
          />
        </div>

        {/* Labels */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: 'var(--font-newsreader), serif',
            fontStyle: 'italic',
            fontWeight: 600,
            fontSize: 15,
            color: '#262420',
            lineHeight: 1.2,
          }}>
            {record.traitWord}
          </p>
          <p style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: 12,
            color: '#8C8A83',
            marginTop: 2,
          }}>
            {isPaid ? `${revealedCount} traits discovered` : `${revealedCount} of ${revealCap} traits discovered`}
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={(e) => { e.stopPropagation(); onSeeIt() }}
          style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: 13,
            fontWeight: 500,
            color: '#3D6B5C',
            flexShrink: 0,
            padding: '4px 0',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          See it →
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, background: '#E5E1D5' }}>
        <div
          style={{
            height: '100%',
            background: '#8C8A83',
            width: `${progress}%`,
            transition: 'width 0.05s linear',
          }}
        />
      </div>
    </div>
  )
}
