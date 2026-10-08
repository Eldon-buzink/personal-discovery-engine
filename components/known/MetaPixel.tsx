'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { CONSENT_CHANGED_EVENT, isAdTrackingExcluded, readConsent, type ConsentValue } from '@/lib/consent'

// Meta Pixel, loaded only after the visitor allows ad measurement (see
// ConsentBanner). Until then no request goes to Meta at all.
//
// Once loaded:
//   - PageView is sent by this component on each page change, except for
//     the pages in isAdTrackingExcluded (mini-assessment, /start landing,
//     report, practice, blog), which never get one.
//   - Meta's own automatic tracking is switched off: disablePushState stops
//     it sending a PageView on every client-side navigation (which would
//     include the excluded pages), and autoConfig=false stops automatic
//     button-click and page-metadata events.
//   - If the visitor later says no, consent is revoked in the Pixel and no
//     further events are sent.

type Fbq = ((...args: unknown[]) => void) & { disablePushState?: boolean; callMethod?: unknown; queue?: unknown[] }

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID

function loadPixel(pixelId: string): Fbq {
  const w = window as unknown as { fbq?: Fbq; _fbq?: Fbq }
  if (!w.fbq) {
    // Meta's standard loader stub, without the PageView it normally fires.
    const n: Fbq = Object.assign(
      (...args: unknown[]) => {
        if (n.callMethod) (n.callMethod as (...a: unknown[]) => void)(...args)
        else n.queue!.push(args)
      },
      { queue: [] as unknown[] }
    )
    ;(n as unknown as Record<string, unknown>).push = n
    ;(n as unknown as Record<string, unknown>).loaded = true
    ;(n as unknown as Record<string, unknown>).version = '2.0'
    w.fbq = n
    if (!w._fbq) w._fbq = n
    n.disablePushState = true
    const s = document.createElement('script')
    s.async = true
    s.src = 'https://connect.facebook.net/en_US/fbevents.js'
    document.head.appendChild(s)
    n('set', 'autoConfig', false, pixelId)
    n('init', pixelId)
  }
  return w.fbq
}

export default function MetaPixel() {
  const pathname = usePathname()
  const [consent, setConsent] = useState<ConsentValue | null>(null)

  useEffect(() => {
    setConsent(readConsent())
    const onChange = (e: Event) => setConsent((e as CustomEvent<ConsentValue>).detail)
    window.addEventListener(CONSENT_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onChange)
  }, [])

  useEffect(() => {
    if (!PIXEL_ID) return
    const w = window as unknown as { fbq?: Fbq }
    if (consent !== 'granted') {
      // Said no after having said yes in this tab: tell the Pixel to stop.
      if (w.fbq) w.fbq('consent', 'revoke')
      return
    }
    const fbq = loadPixel(PIXEL_ID)
    fbq('consent', 'grant')
    if (pathname && !isAdTrackingExcluded(pathname)) fbq('track', 'PageView')
  }, [consent, pathname])

  return null
}
