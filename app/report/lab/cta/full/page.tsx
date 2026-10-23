'use client'

// Report lab: the whole report page per CTA state. Lab only.
// ?state=<CtaState>&ring=still|moving|none

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import FullBoard from './FullBoard'
import type { Ring } from '../CtaBoard'
import type { CtaState } from '@/lib/known/reportCta'

export default function LabCtaFullPage() {
  return <Suspense fallback={null}><Inner /></Suspense>
}

function Inner() {
  const params = useSearchParams()
  const [mobile, setMobile] = useState(false)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const m = () => setMobile(window.innerWidth < 700); m(); setReady(true)
    window.addEventListener('resize', m); return () => window.removeEventListener('resize', m)
  }, [])
  if (!ready) return null
  const state = (params.get('state') as CtaState) ?? 'free-locked'
  const r = params.get('ring')
  const ring: Ring = r === 'moving' || r === 'none' ? r : 'still'
  return <FullBoard state={state} ring={ring} mobile={mobile} />
}
