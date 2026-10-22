import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { labRoutesEnabled } from '@/lib/lab/labRoutes'

// Every /report/lab/* page: a 404 outside local development (lib/lab/labRoutes.ts).
// Rendered per request, so the check runs on the server that serves it.
export const dynamic = 'force-dynamic'

export default function ReportLabLayout({ children }: { children: ReactNode }) {
  if (!labRoutesEnabled()) notFound()
  return <>{children}</>
}
