import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { labRoutesEnabled } from '@/lib/lab/labRoutes'

// The landing options board: a 404 outside local development, like the
// report lab (lib/lab/labRoutes.ts).
export const dynamic = 'force-dynamic'

export default function LandingOptionsLayout({ children }: { children: ReactNode }) {
  if (!labRoutesEnabled()) notFound()
  return <>{children}</>
}
