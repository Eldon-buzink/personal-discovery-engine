import { notFound } from 'next/navigation'
import FullReportSeeder from './FullReportSeeder'

// Development only: fills this browser with a complete Ring 1 session (all
// 120 answers, all 30 traits revealed) and opens /report, which then
// generates each trait's copy as it would for a real user. 404 in production.
export default function DevFullReportPage() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return <FullReportSeeder />
}
