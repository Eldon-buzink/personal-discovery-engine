import { buildMetadata } from '@/lib/seo'
import HomeV2Client from './HomeV2Client'

// Phase 3 skeleton — temporary route, not linked from anywhere (no nav/footer
// entry, not in sitemap.ts, added to robots.ts's disallow list as a second
// layer). Exists so the redesign can be reviewed section by section without
// touching the live page.tsx / LandingPageClient.tsx at all. See
// reference/landing-redesign.md section 10, Phase 3.
export const metadata = buildMetadata({
  path: '/home-v2',
  title: 'Bearing — skeleton (not for indexing)',
  description: 'Internal review build. Not linked, not indexed.',
  noindex: true,
})

export default function Page() {
  return <HomeV2Client />
}
