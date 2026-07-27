import Link from 'next/link'
import TableOfContents from './TableOfContents'
import { getPostBySlugIfPublished } from '@/lib/blog/content'
import { accentColorCss } from '@/lib/blog/theme'
import { blogCard, blogCharcoal, blogCharcoalSoft, blogCream, blogLine, blogSans } from './tokens'
import type { TocItem } from '@/lib/blog/toc'

export default function PostSidebar({
  toc,
  relatedSlugs,
  currentFacetLabel,
}: {
  toc: TocItem[]
  relatedSlugs: string[]
  // e.g. "Deliberation" — used only to personalize the assess-card's copy
  // the same way the mockup does ("see where Deliberation sits alongside
  // your other 29 facets"); omitted for non-trait posts.
  currentFacetLabel?: string
}) {
  // Silently drops any relatedSlugs entry that doesn't resolve to a
  // published post — same "don't render a dead link" rule as the report's
  // facetId -> blog links (see lib/known/blogLinks.ts), applied here too.
  const related = relatedSlugs
    .map(slug => getPostBySlugIfPublished(slug))
    .filter((p): p is NonNullable<typeof p> => p !== undefined)

  return (
    <div style={{ paddingTop: 4 }}>
      <TableOfContents items={toc} />

      {related.length > 0 && (
        <div style={{ marginBottom: 38 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: blogCharcoalSoft, marginBottom: 16, fontFamily: blogSans }}>
            Related facets
          </p>
          {related.map(post => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              style={{ display: 'flex', gap: 12, alignItems: 'flex-start', textDecoration: 'none', color: 'inherit', padding: '12px 0' }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: accentColorCss(post.frontmatter.accentColor), flexShrink: 0, marginTop: 6 }} />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.4, marginBottom: 2, color: blogCharcoal, fontFamily: blogSans }}>
                  {post.frontmatter.title}
                </div>
                <div style={{ fontSize: 11.5, color: blogCharcoalSoft, fontFamily: blogSans }}>{post.frontmatter.subcategory}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div style={{ border: `1px solid ${blogLine}`, borderRadius: 16, padding: 22, background: blogCard }}>
        <p style={{ fontSize: 13, color: blogCharcoalSoft, lineHeight: 1.55, marginBottom: 14, fontFamily: blogSans }}>
          Get your full trait profile across all five domains, free
          {currentFacetLabel ? ` — see where ${currentFacetLabel} sits alongside your other 29 facets` : ''}.
        </p>
        <Link href="/onboarding">
          <button style={{ width: '100%', background: blogCharcoal, color: blogCream, border: 'none', padding: 11, borderRadius: 100, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', fontFamily: blogSans }}>
            Take the free assessment
          </button>
        </Link>
      </div>
    </div>
  )
}
