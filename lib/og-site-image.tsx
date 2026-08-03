import { ImageResponse } from 'next/og'
import { loadGoogleFont } from './og-font'

export const SITE_OG_IMAGE_SIZE = { width: 1200, height: 630 }
export const SITE_OG_IMAGE_ALT = "Bearing — Find out what's actually driving you"

const TITLE = 'Bearing'
const TAGLINE = "Find out what's actually driving you"

// Shared by app/opengraph-image.tsx (the true root, covering routes like
// /report and /blob-demo that sit outside every route group) and
// app/(site)/opengraph-image.tsx. Both are needed: Next's file-convention
// image resolution doesn't reliably cross a (group) boundary — pages inside
// app/(site)/ (home, pricing, about, blog index, ...) silently got no
// og:image at all from the root-only file, confirmed by checking their
// rendered HTML directly rather than assuming inheritance worked.
export async function renderSiteOgImage(): Promise<ImageResponse> {
  const [newsreader, inter] = await Promise.all([
    loadGoogleFont('Newsreader', 400, TITLE),
    loadGoogleFont('Inter', 500, TAGLINE),
  ])

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F7F4ED',
        }}
      >
        <div style={{ display: 'flex', fontFamily: 'Newsreader', fontSize: 104, color: '#262420', letterSpacing: '-0.02em' }}>
          {TITLE}
        </div>
        <div style={{ display: 'flex', fontFamily: 'Inter', fontSize: 34, color: '#5A5750', marginTop: 22 }}>
          {TAGLINE}
        </div>
      </div>
    ),
    {
      ...SITE_OG_IMAGE_SIZE,
      fonts: [
        { name: 'Newsreader', data: newsreader, weight: 400, style: 'normal' },
        { name: 'Inter', data: inter, weight: 500, style: 'normal' },
      ],
    },
  )
}
