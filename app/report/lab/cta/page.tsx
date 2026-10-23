'use client'

// Report lab: sticky bar and closing panel placement, per state. Lab only.
// ?state=<CtaState>&p=1|2

import { useEffect, useState } from 'react'
import CtaBoard from './CtaBoard'
import type { CtaState } from '@/lib/known/reportCta'

export default function LabCtaPage() {
  const [q, setQ] = useState<{ state: CtaState; p: '1' | '2' } | null>(null)
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    setQ({ state: (p.get('state') as CtaState) ?? 'free-locked', p: p.get('p') === '2' ? '2' : '1' })
    const m = () => setMobile(window.innerWidth < 700); m(); window.addEventListener('resize', m); return () => window.removeEventListener('resize', m)
  }, [])
  if (!q) return null
  return <CtaBoard state={q.state} placement={q.p} mobile={mobile} />
}
