'use client'

import { Problems1, Problems2, Problems3, problemsCSS } from '../Problems'

// Picks one of the three problems designs and adds their styles.
export default function ProblemsSection({ variant }: { variant: 'p1' | 'p2' | 'p3' }) {
  const Section = { p1: Problems1, p2: Problems2, p3: Problems3 }[variant]
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: problemsCSS }} />
      <Section />
    </>
  )
}
