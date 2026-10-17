import Link from 'next/link'
import { buildMetadata } from '@/lib/seo'
import { getPostsByCategory, type BlogPost } from '@/lib/blog/content'
import { allFacetReferences, isDescribedPublicly, type FacetReference } from '@/lib/known/facetReference'
import { DOMAIN_FACETS } from '@/lib/known/ring1-questions'
import { blogCard, blogCharcoal, blogCharcoalSoft, blogCoral, blogLine, blogSans, blogSerif } from '@/components/blog/tokens'

// The trait library: all 30 facets, grouped by domain, read from
// lib/known/facetReference.ts (the same files the report scores with), so
// this page can't drift from the report. A facet links to its blog post only
// when that post is live; otherwise it's a plain entry. No per-facet routes.

// Same as the blog routes: a post whose publishDate passes shows up here
// within the hour, without a redeploy.
export const revalidate = 3600

export const metadata = buildMetadata({
  path: '/traits',
  title: 'The 30 Big Five Facets, by Domain — Bearing',
  description: 'All 30 facets Bearing measures, grouped by the five Big Five domains, with the trait words used for low and high scores and links to each explainer.',
})

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Resources', item: 'https://www.getbearing.me/blog' },
    { '@type': 'ListItem', position: 2, name: 'All 30 facets', item: 'https://www.getbearing.me/traits' },
  ],
}

function FacetEntry({ facet, post }: { facet: FacetReference; post: BlogPost | undefined }) {
  const described = isDescribedPublicly(facet.facetId)
  return (
    <li style={{ borderTop: `1px solid ${blogLine}`, padding: '14px 0' }}>
      <div style={{ fontFamily: blogSerif, fontWeight: 500, fontSize: 18, color: blogCharcoal }}>{facet.label}</div>
      {described ? (
        <div style={{ fontSize: 13, color: blogCharcoalSoft, marginTop: 2 }}>
          Low: {facet.traitWords.low} · High: {facet.traitWords.high}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: blogCharcoalSoft, marginTop: 2 }}>Not described publicly yet.</div>
      )}
      {described && post && (
        <Link href={`/blog/${post.slug}`} style={{ display: 'inline-block', fontSize: 13.5, fontWeight: 600, color: blogCharcoal, marginTop: 8 }}>
          {post.frontmatter.title}
        </Link>
      )}
    </li>
  )
}

export default function TraitsPage() {
  const references = allFacetReferences()
  const postByFacet = new Map<string, BlogPost>()
  getPostsByCategory('traits').forEach((post) => {
    if (post.frontmatter.facetId) postByFacet.set(post.frontmatter.facetId, post)
  })

  return (
    <div style={{ background: '#F7F4ED', minHeight: '100vh', fontFamily: blogSans }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="traits-wrap" style={{ maxWidth: 1080, margin: '0 auto', padding: '150px 32px 80px' }}>
        <nav aria-label="Breadcrumb" style={{ fontSize: 13, color: blogCharcoalSoft, display: 'flex', gap: 8, alignItems: 'center', marginBottom: 24 }}>
          <Link href="/blog" style={{ color: 'inherit', textDecoration: 'none' }}>Resources</Link>
          <span style={{ opacity: 0.5 }}>/</span>
          <span>All 30 facets</span>
        </nav>

        <div style={{ maxWidth: 640, marginBottom: 40 }}>
          <div style={{ fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', color: blogCharcoalSoft, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: '60% 40% 55% 45% / 45% 55% 40% 60%', background: blogCoral }} />
            Trait library
          </div>
          <h1 style={{ fontFamily: blogSerif, fontWeight: 500, fontStyle: 'italic', fontSize: 40, lineHeight: 1.15, letterSpacing: '-0.01em', color: blogCharcoal, marginBottom: 16 }}>
            All 30 facets Bearing measures.
          </h1>
          <p style={{ fontSize: 16, color: blogCharcoalSoft, lineHeight: 1.6 }}>
            Bearing reads your answers as 30 facets, six in each of the five Big Five domains. Each facet&apos;s result is shown as one of three trait words: one for a low score, one for the middle and one for a high score. Where a facet has a published explainer, it links to it. Every article is also on the{' '}
            <Link href="/blog" style={{ color: blogCharcoal }}>blog</Link>.
          </p>
        </div>

        {Object.keys(DOMAIN_FACETS).map((domain) => (
          <section key={domain} aria-labelledby={`domain-${domain.toLowerCase()}`} style={{ background: blogCard, border: `1px solid ${blogLine}`, borderRadius: 24, padding: '28px 32px 18px', marginBottom: 24 }}>
            <h2 id={`domain-${domain.toLowerCase()}`} style={{ fontFamily: blogSerif, fontWeight: 500, fontSize: 24, color: blogCharcoal, margin: '0 0 12px' }}>
              {domain}
            </h2>
            <ul className="traits-grid" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0 28px' }}>
              {references.filter((r) => r.domain === domain).map((facet) => (
                <FacetEntry key={facet.facetId} facet={facet} post={postByFacet.get(facet.facetId)} />
              ))}
            </ul>
          </section>
        ))}

        <p style={{ fontSize: 14, color: blogCharcoalSoft, marginTop: 32 }}>
          <Link href="/blog" style={{ color: blogCharcoal, fontWeight: 600 }}>Back to all articles</Link>
        </p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 860px) {
          .traits-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
        @media (max-width: 560px) {
          .traits-wrap { padding: 120px 20px 64px !important; }
          .traits-grid { grid-template-columns: minmax(0, 1fr) !important; }
        }
      ` }} />
    </div>
  )
}
