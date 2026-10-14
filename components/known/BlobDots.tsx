'use client'

import { useMemo, useRef } from 'react'
import { buildPointMotionProfile, generateAnimatedBlobPath, hashSeed, useBlobAnimation } from '@/lib/blobs'

// Three tiny blobs that breathe in turn: the loading "dots" in the blob
// style. Fixed width, so the text beside them never shifts. Each dot morphs
// slowly on the shared blob clock; with reduced motion they sit still.

const SIZE = 12
const R = 4.2
const IRREGULARITY = 0.26

function Dot({ hue, index }: { hue: number; index: number }) {
  const pathRef = useRef<SVGPathElement>(null)
  const profile = useMemo(() => buildPointMotionProfile(hashSeed(`blob-dot-${index}`), 6), [index])
  useBlobAnimation(
    (t) => pathRef.current?.setAttribute('d', generateAnimatedBlobPath(SIZE / 2, SIZE / 2, R, profile, IRREGULARITY, t * 2.2)),
    [profile],
    undefined,
    { respectReducedMotion: true },
  )
  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="blob-dot" style={{ animationDelay: `${index * 0.18}s` }}>
      <path ref={pathRef} d={generateAnimatedBlobPath(SIZE / 2, SIZE / 2, R, profile, IRREGULARITY, 0)} fill={`hsl(${hue}, 72%, 62%)`} />
    </svg>
  )
}

// Decorative: the text beside it carries the status for screen readers.
export default function BlobDots({ hue }: { hue: number }) {
  return (
    <span aria-hidden="true" style={{ display: 'inline-flex', gap: 2, alignItems: 'center', marginLeft: 6, verticalAlign: 'middle' }}>
      <style>{`
        @keyframes blobDotBreathe { 0%, 100% { transform: scale(0.6); opacity: 0.4 } 40% { transform: scale(1); opacity: 1 } }
        .blob-dot { animation: blobDotBreathe 1.2s ease-in-out infinite both; overflow: visible }
        @media (prefers-reduced-motion: reduce) { .blob-dot { animation: none; opacity: 0.8 } }
      `}</style>
      {[0, 1, 2].map((i) => <Dot key={i} hue={hue} index={i} />)}
    </span>
  )
}
