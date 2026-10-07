import { buildMetadata } from '@/lib/seo'
import PreviewLandingClient from './PreviewLandingClient'

// Preview of a proposed landing page (reference/bearing-landing-preview-spec.md),
// for comparing against `/` before deciding what to keep. noindex/nofollow,
// not in app/sitemap.ts, canonical points at itself rather than at `/`.
// Delete this folder to discard the preview.
export const metadata = buildMetadata({
  path: '/preview-landing',
  title: 'Bearing — landing preview',
  description: 'Internal preview of a proposed landing page.',
  noindex: true,
})

export default function Page() {
  return <PreviewLandingClient />
}
