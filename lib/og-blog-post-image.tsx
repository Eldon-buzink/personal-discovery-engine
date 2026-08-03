import { ImageResponse } from 'next/og'
import { loadGoogleFont } from './og-font'
import { getPostBySlugIfPublished, CATEGORY_LABELS } from './blog/content'
import { accentColorCss } from './blog/theme'

export const BLOG_OG_IMAGE_SIZE = { width: 1200, height: 630 }

// Shared by app/(site)/blog/[slug]/opengraph-image.tsx (the file-convention
// route Next auto-wires into og:image/twitter:image, whose actual served
// path gets a Next-generated hash suffix) and
// app/(site)/blog/[slug]/image/route.ts (a plain, hash-free path at a URL
// the Article JSON-LD's `image` field can reference directly and
// predictably) — one render function, two stable-vs-convention exposures
// of the same image.
export async function renderBlogPostOgImage(slug: string): Promise<ImageResponse> {
  const post = getPostBySlugIfPublished(slug)
  const title = post?.frontmatter.title ?? 'Bearing'
  // Uppercased in JS rather than via CSS textTransform: the font subset
  // below has to contain the literal glyphs Satori renders, and relying on
  // textTransform to re-case at render time left the actual uppercase
  // glyphs out of the subset — visible as broken kerning/fallback glyphs
  // in the rendered image.
  const categoryLabel = (post ? CATEGORY_LABELS[post.frontmatter.category] : 'Bearing').toUpperCase()
  const accent = post ? accentColorCss(post.frontmatter.accentColor) : '#3D6B5C'

  const [newsreader, inter] = await Promise.all([
    loadGoogleFont('Newsreader', 400, title),
    loadGoogleFont('Inter', 600, categoryLabel + 'Bearing'),
  ])

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#F7F4ED',
          padding: 80,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', width: 14, height: 14, borderRadius: 999, background: accent }} />
          <div style={{ display: 'flex', fontFamily: 'Inter', fontSize: 26, fontWeight: 600, letterSpacing: '0.08em', color: '#5A5750' }}>
            {categoryLabel}
          </div>
        </div>
        <div style={{ display: 'flex', fontFamily: 'Newsreader', fontSize: 64, color: '#262420', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
          {title}
        </div>
        <div style={{ display: 'flex', fontFamily: 'Inter', fontSize: 28, fontWeight: 600, color: '#262420' }}>
          Bearing
        </div>
      </div>
    ),
    {
      ...BLOG_OG_IMAGE_SIZE,
      fonts: [
        { name: 'Newsreader', data: newsreader, weight: 400, style: 'normal' },
        { name: 'Inter', data: inter, weight: 600, style: 'normal' },
      ],
    },
  )
}
