import { notFound } from 'next/navigation'
import InsightSeeder from './InsightSeeder'

// Development only: see app/dev/insights. 404 in production.
export default function DevInsightSeedPage({ searchParams }: { searchParams: { f?: string } }) {
  if (process.env.NODE_ENV !== 'development') notFound()
  return <InsightSeeder fixtureId={searchParams.f ?? ''} />
}
