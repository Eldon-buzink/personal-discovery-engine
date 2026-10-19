'use client'

import { createContext, useContext } from 'react'

// Who is visiting, from the old landing's useLandingVisitor (see
// V3Client.tsx): set once by the page shell, read by the nav, the hero and
// the closing section so every button says the same thing.
export const VisitorContext = createContext({ welcomeBack: false, startedUnfinished: false })
export const useVisitor = () => useContext(VisitorContext)

export function ctaFor(startedUnfinished: boolean) {
  return startedUnfinished ? { href: '/assessment', label: 'Continue your assessment' } : { href: '/onboarding', label: 'Start the assessment' }
}
