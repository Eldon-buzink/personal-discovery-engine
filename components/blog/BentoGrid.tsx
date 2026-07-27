import Link from 'next/link'
import GlowCard from './GlowCard'
import { blogAmber, blogCream, blogPeriwinkle, blogRose, blogSerif, blogTeal } from './tokens'
import type { BlogPost } from '@/lib/blog/types'

// Glow config is fixed per grid position (large / small-1 / small-2), not
// derived from each post's own accentColor — this mirrors the mockup
// exactly, which hand-picks a distinct color per slot regardless of what
// the card's content is, rather than the more data-driven-but-different-
// looking choice of using each post's own accent hue.
const SLOT_GLOWS = {
  large: [
    { color: blogPeriwinkle, size: 220, top: -60, left: -60 },
    { color: blogRose, size: 200, bottom: -70, right: -50 },
  ],
  small1: [{ color: blogAmber, size: 150, top: -40, right: -40 }],
  small2: [{ color: blogTeal, size: 150, bottom: -40, left: -30 }],
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Explicit numeric grid-column/grid-row placement, not grid-template-areas —
// grid-template-areas needs quoted area-name strings ('large' 'small1' ...),
// and a quote character inside a <style>{`...`}</style> template hits the
// exact same SSR/CSR text-escaping mismatch the `>` combinator did elsewhere
// on this page (see landing-page/blog work earlier this session): React's
// server renderer HTML-escapes text content of a <style> tag (' becomes
// &#x27;), the client-side re-render doesn't re-escape identically, and
// hydration fails on the mismatch. Numeric grid-column/grid-row values and
// class-selector-only overrides sidestep both known trigger characters.
const SLOT_PLACEMENT: Record<'large' | 'small1' | 'small2', { gridColumn: string; gridRow: string }> = {
  large: { gridColumn: '1', gridRow: '1 / 3' },
  small1: { gridColumn: '2', gridRow: '1' },
  small2: { gridColumn: '2', gridRow: '2' },
}

function BentoCard({ post, slot }: { post: BlogPost; slot: 'large' | 'small1' | 'small2' }) {
  const isLarge = slot === 'large'
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="bento-card-item"
      style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%', ...SLOT_PLACEMENT[slot] }}
    >
      <GlowCard
        variant="charcoal"
        glows={SLOT_GLOWS[slot]}
        blur={70}
        glowOpacity={0.55}
        borderRadius={20}
        padding="26px"
        style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', minHeight: isLarge ? 420 : undefined }}
      >
        <div style={{ fontSize: isLarge ? 11.5 : 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#C9C5BA', marginBottom: 10 }}>
          {capitalize(post.frontmatter.subcategory)}
        </div>
        {isLarge ? (
          <h2 style={{ fontFamily: blogSerif, fontWeight: 500, lineHeight: 1.28, fontSize: 26, marginBottom: 8, color: blogCream }}>{post.frontmatter.title}</h2>
        ) : (
          <h3 style={{ fontFamily: blogSerif, fontWeight: 500, lineHeight: 1.28, fontSize: 18, marginBottom: 8, color: blogCream }}>{post.frontmatter.title}</h3>
        )}
        <p style={{ fontSize: isLarge ? 13.5 : 12.5, color: '#C9C5BA', lineHeight: isLarge ? 1.55 : 1.5, maxWidth: isLarge ? 340 : 280, margin: 0 }}>
          {post.frontmatter.dek}
        </p>
      </GlowCard>
    </Link>
  )
}

export default function BentoGrid({ posts }: { posts: BlogPost[] }) {
  if (posts.length === 0) return null
  const [large, small1, small2] = posts

  return (
    <div
      className="bento-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: small1 || small2 ? '1.4fr 1fr' : '1fr',
        gridTemplateRows: '1fr 1fr',
        gap: 16,
        paddingBottom: 32,
      }}
    >
      <BentoCard post={large} slot="large" />
      {small1 && <BentoCard post={small1} slot="small1" />}
      {small2 && <BentoCard post={small2} slot="small2" />}

      <style>{`
        @media (max-width: 860px) {
          .bento-grid { grid-template-columns: 1fr !important; }
          .bento-card-item { grid-column: 1 !important; grid-row: auto !important; }
        }
      `}</style>
    </div>
  )
}
