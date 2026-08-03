import { ImageResponse } from 'next/og'
import { loadGoogleFont } from '@/lib/og-font'

export const alt = "Bearing — Find out what's actually driving you"
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const TITLE = 'Bearing'
const TAGLINE = "Find out what's actually driving you"

export default async function Image() {
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
      ...size,
      fonts: [
        { name: 'Newsreader', data: newsreader, weight: 400, style: 'normal' },
        { name: 'Inter', data: inter, weight: 500, style: 'normal' },
      ],
    },
  )
}
