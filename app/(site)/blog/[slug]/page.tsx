import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import rehypeSlug from 'rehype-slug'
import { buildMetadata } from '@/lib/seo'
import { getPostBySlugIfPublished, getPublishedPosts, CATEGORY_LABELS } from '@/lib/blog/content'
import { extractToc } from '@/lib/blog/toc'
import { accentColorCss, accentColorSoftCss } from '@/lib/blog/theme'
import { mdxComponents, proseStyle } from '@/components/blog/mdxComponents'
import GlowCard from '@/components/blog/GlowCard'
import FaqBlock from '@/components/blog/FaqBlock'
import PostSidebar from '@/components/blog/PostSidebar'
import { blogCharcoal, blogCharcoalSoft, blogPeriwinkle, blogRose, blogSans, blogSerif } from '@/components/blog/tokens'

// Static generation — content changes infrequently (build brief, section 1).
// dynamicParams left at its default (true) rather than forced false: a
// request for a slug that doesn't exist yet (e.g. right after a content
// deploy that hasn't rebuilt this route yet) should 404 via the notFound()
// check below, not hard-fail the whole route.
export async function generateStaticParams() {
  return getPublishedPosts().map(post => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = getPostBySlugIfPublished(params.slug)
  if (!post) return buildMetadata({ path: `/blog/${params.slug}`, title: 'Not found — Bearing', description: '' })
  return buildMetadata({
    path: `/blog/${post.slug}`,
    title: `${post.frontmatter.title} — Bearing`,
    description: post.frontmatter.dek,
    type: 'article',
    image: `/blog/${post.slug}/image`,
  })
}

// Per-category substitute for the mockup's hardcoded "Reviewed against
// IPIP-NEO-120" meta item — that phrasing is only accurate for trait posts;
// every other category needed its own equivalent rather than reusing text
// that would misdescribe what grounds it. Lifestyle omits this meta item
// entirely (see below) since "reviewed against X" doesn't fit reflection/
// research/product-update pieces.
const CATEGORY_GROUNDING: Record<string, string> = {
  traits: 'Reviewed against IPIP-NEO-120',
  frameworks: 'Grounded in peer-reviewed research',
  relationships: 'Based on the ECR-R attachment model',
  'work-direction': 'Based on the RIASEC / Holland Codes model',
}

function formatUpdatedAt(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export default function PostPage({ params }: { params: { slug: string } }) {
  const post = getPostBySlugIfPublished(params.slug)
  if (!post) notFound()

  const { frontmatter, content } = post
  const toc = extractToc(content)
  const categoryLabel = CATEGORY_LABELS[frontmatter.category]
  const grounding = CATEGORY_GROUNDING[frontmatter.category]
  const accent = accentColorCss(frontmatter.accentColor)
  const accentSoft = accentColorSoftCss(frontmatter.accentColor, 0.14)

  // facetLabel for the sidebar's assess-card copy ("see where X sits
  // alongside your other 29 facets") — uses facetId directly, not a parsed
  // slice of the title. Titles are deliberately varied in structure/wording
  // per post (see build-brief note on avoiding a templated feel across the
  // 30 trait posts) — some use "Facet: subtitle", some use a comma, some use
  // neither, so parsing the title for "just the facet name" isn't reliable.
  // facetId is already the exact clean name (matches lib/known/scoring.ts),
  // so there's no parsing needed for trait posts at all.
  const facetLabel = frontmatter.category === 'traits' ? frontmatter.facetId : undefined

  const canonicalUrl = `https://www.getbearing.me/blog/${post.slug}`

  // frontmatter.updatedAt is a date-only string (e.g. "2026-07-27") — there's
  // no time-of-day or timezone in the CMS source, so rather than inventing
  // one, this pins it to UTC midnight, same as formatUpdatedAt() above
  // already does for display. "Z" is a real, honest timezone designator for
  // data that has no finer-grained time info, not a guess at a business zone.
  const isoDate = `${frontmatter.updatedAt}T00:00:00Z`

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: frontmatter.title,
    description: frontmatter.dek,
    image: `https://www.getbearing.me/blog/${post.slug}/image`,
    datePublished: isoDate,
    dateModified: isoDate,
    author: { '@type': 'Organization', name: 'Bearing', url: 'https://www.getbearing.me' },
    publisher: { '@type': 'Organization', name: 'Bearing', url: 'https://www.getbearing.me' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
  }

  const faqJsonLd = frontmatter.faq && frontmatter.faq.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: frontmatter.faq.map(item => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      }
    : null

  return (
    <div style={{ background: '#F7F4ED', minHeight: '100vh', fontFamily: blogSans }}>
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      {faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      )}

      <div className="blog-wrap" style={{ maxWidth: 1080, margin: '0 auto', padding: '150px 32px 0' }}>
        <div style={{ fontSize: 13, color: blogCharcoalSoft, display: 'flex', gap: 8, alignItems: 'center', marginBottom: 24 }}>
          <Link href="/blog" style={{ color: 'inherit', textDecoration: 'none' }}>Resources</Link>
          <span style={{ opacity: 0.5 }}>/</span>
          <Link href="/blog" style={{ color: 'inherit', textDecoration: 'none' }}>{categoryLabel}</Link>
          <span style={{ opacity: 0.5 }}>/</span>
          {/* facetId for trait posts (short, e.g. "Adventurousness"), full
              title for every other category — those titles are the
              identifier, not a "Name: subtitle" pair, so there's nothing
              shorter and reliable to slice out of them. */}
          <span>{frontmatter.facetId ?? frontmatter.title}</span>
        </div>

        <GlowCard
          variant="light"
          glows={[
            { color: blogPeriwinkle, size: 240, top: -70, left: -60 },
            { color: blogRose, size: 220, bottom: -80, right: -40 },
          ]}
          blur={70}
          glowOpacity={0.4}
          borderRadius={24}
          padding="52px 56px"
          style={{ margin: '24px 0 48px' }}
        >
          <div style={{ maxWidth: 640 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
              color: accent, background: accentSoft, padding: '6px 14px', borderRadius: 100, marginBottom: 22,
            }}>
              {categoryLabel} · {frontmatter.subcategory}
            </div>
            <h1 style={{ fontFamily: blogSerif, fontWeight: 500, fontSize: 40, lineHeight: 1.18, letterSpacing: '-0.01em', color: blogCharcoal, marginBottom: 18 }}>
              {frontmatter.title}
            </h1>
            <p style={{ fontSize: 17, color: blogCharcoalSoft, lineHeight: 1.6, marginBottom: 24 }}>
              {frontmatter.dek}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, color: blogCharcoalSoft, flexWrap: 'wrap' }}>
              <span>{frontmatter.readTime} min read</span>
              {grounding && (
                <>
                  <span style={{ width: 3, height: 3, borderRadius: '50%', background: blogCharcoalSoft }} />
                  <span>{grounding}</span>
                </>
              )}
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: blogCharcoalSoft }} />
              <span>Updated {formatUpdatedAt(frontmatter.updatedAt)}</span>
            </div>
          </div>
        </GlowCard>

        <div className="blog-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 64, paddingBottom: 80 }}>
          <div style={proseStyle}>
            <MDXRemote source={content} components={mdxComponents} options={{ mdxOptions: { rehypePlugins: [rehypeSlug] } }} />
            <FaqBlock items={frontmatter.faq ?? []} />
          </div>

          <div className="blog-sidebar-col">
            <PostSidebar toc={toc} relatedSlugs={frontmatter.relatedSlugs ?? []} currentFacetLabel={facetLabel} />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .blog-layout { grid-template-columns: 1fr !important; }
          .blog-sidebar-col { order: -1; }
        }
        @media (max-width: 640px) {
          .blog-wrap { padding-top: 120px !important; }
        }
      `}</style>
    </div>
  )
}
