'use client'

import { useState } from 'react'
import Link from 'next/link'
import { accentColorCss } from '@/lib/blog/theme'
import { CATEGORY_LABELS, type BlogCategory, type BlogPost } from '@/lib/blog/types'
import { blogCharcoal, blogCharcoalSoft, blogCream, blogLine, blogSans, blogSerif } from './tokens'

const TAB_CATEGORIES: BlogCategory[] = ['traits', 'frameworks', 'relationships', 'work-direction']

const TAB_DESCRIPTIONS: Record<BlogCategory, string> = {
  traits: 'One explainer per IPIP-NEO facet, across all five domains.',
  frameworks: 'The models behind Bearing: Big Five, SDT, ECR-R, RIASEC.',
  relationships: 'Attachment and connection, from the Relationships branch.',
  'work-direction': 'Working style and career fit, from Holland Codes.',
  lifestyle: '',
}

// Frameworks' titles+subtitles run long, so that directory renders as full-
// width single-column rows instead of the 2-up grid every other category
// uses — matches the mockup's dir-row.wide treatment for that tab only.
const WIDE_CATEGORIES = new Set<BlogCategory>(['frameworks'])

const INITIAL_VISIBLE: Record<BlogCategory, number> = {
  traits: 6,
  frameworks: 4,
  relationships: 3,
  'work-direction': 3,
  lifestyle: 0,
}

function DirRow({ post, wide }: { post: BlogPost; wide: boolean }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      style={{
        display: 'flex', alignItems: 'baseline', gap: 12, padding: '14px 0', borderBottom: `1px solid ${blogLine}`,
        textDecoration: 'none', color: 'inherit', gridColumn: wide ? '1 / 3' : undefined,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 6, background: accentColorCss(post.frontmatter.accentColor) }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: blogSerif, fontWeight: 500, fontSize: wide ? 16.5 : 16, letterSpacing: '-0.003em', color: blogCharcoal }}>
          {post.frontmatter.title}
        </div>
        <div style={{ fontSize: 12, color: blogCharcoalSoft, marginTop: wide ? 4 : 2, maxWidth: wide ? 640 : undefined, lineHeight: wide ? 1.5 : undefined }}>
          {post.frontmatter.subcategory}
        </div>
      </div>
      <span style={{ fontSize: 12, color: blogCharcoalSoft, whiteSpace: 'nowrap', flexShrink: 0 }}>{post.frontmatter.readTime} min</span>
    </Link>
  )
}

export default function TopicBrowser({ postsByCategory }: { postsByCategory: Record<BlogCategory, BlogPost[]> }) {
  const [activeTab, setActiveTab] = useState<BlogCategory>('traits')
  const [expandedTabs, setExpandedTabs] = useState<Record<string, boolean>>({})

  return (
    <div id="topic-browser" style={{ background: '#FFFEFB', border: `1px solid ${blogLine}`, borderRadius: 28, padding: '44px 48px 48px', marginBottom: 56 }}>
      <div style={{ maxWidth: 560, marginBottom: 32 }}>
        <h2 style={{ fontFamily: blogSerif, fontWeight: 500, fontSize: 26, letterSpacing: '-0.005em', marginBottom: 10, color: blogCharcoal }}>
          Browse by topic
        </h2>
        <p style={{ fontSize: 14.5, color: blogCharcoalSoft, lineHeight: 1.6 }}>
          Every explainer Bearing has published, organized the way the assessment itself is — by trait, by framework, and by the branch it feeds into.
        </p>
      </div>

      <div className="topic-tabs" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, paddingBottom: 32 }}>
        {TAB_CATEGORIES.map(cat => {
          const active = cat === activeTab
          const count = postsByCategory[cat]?.length ?? 0
          return (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              style={{
                textAlign: 'left', padding: '16px 18px', borderRadius: 16, border: `1px solid ${active ? blogCharcoal : blogLine}`,
                background: active ? blogCharcoal : '#F7F4ED', cursor: 'pointer', fontFamily: blogSans,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: accentColorCss(TAB_DOT_COLOR[cat]) }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: active ? blogCream : blogCharcoal }}>{CATEGORY_LABELS[cat]}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, marginLeft: 'auto', padding: '2px 8px', borderRadius: 100,
                  border: `1px solid ${active ? 'rgba(255,255,255,0.2)' : blogLine}`,
                  color: active ? '#C9C5BA' : blogCharcoalSoft,
                }}>
                  {count}
                </span>
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.4, color: active ? '#C9C5BA' : blogCharcoalSoft }}>{TAB_DESCRIPTIONS[cat]}</div>
            </button>
          )
        })}
      </div>

      {TAB_CATEGORIES.map(cat => {
        if (cat !== activeTab) return null
        const posts = postsByCategory[cat] ?? []
        const wide = WIDE_CATEGORIES.has(cat)
        const initialCount = INITIAL_VISIBLE[cat]
        const isExpanded = !!expandedTabs[cat]
        const visiblePosts = isExpanded ? posts : posts.slice(0, initialCount)
        const hasMore = posts.length > initialCount

        return (
          <div key={cat} className="topic-dir-grid" style={{ display: 'grid', gridTemplateColumns: wide ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) minmax(0, 1fr)', gap: '0 32px' }}>
            {visiblePosts.map(post => <DirRow key={post.slug} post={post} wide={wide} />)}
            {hasMore && (
              <button
                className="topic-show-more"
                onClick={() => setExpandedTabs(prev => ({ ...prev, [cat]: !prev[cat] }))}
                style={{
                  gridColumn: wide ? '1' : '1 / 3', display: 'flex', alignItems: 'center', gap: 8, background: 'none',
                  border: `1px solid ${blogLine}`, color: blogCharcoal, fontFamily: blogSans, fontSize: 13, fontWeight: 600,
                  padding: '9px 16px', borderRadius: 100, cursor: 'pointer', margin: '18px auto 0', width: 'fit-content',
                }}
              >
                <span>{isExpanded ? 'Show less' : `Show all ${posts.length}`}</span>
                <span style={{ display: 'inline-block', transition: 'transform 0.2s ease', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>▾</span>
              </button>
            )}
          </div>
        )
      })}

      <style>{`
        @media (max-width: 860px) {
          .topic-tabs { grid-template-columns: 1fr 1fr !important; }
          .topic-dir-grid { grid-template-columns: minmax(0, 1fr) !important; }
          /* Without this, the button's inline gridColumn:'1 / 3' (sized for
             the 2-column desktop grid) forces CSS Grid to auto-generate a
             phantom second column here even after topic-dir-grid collapses
             to one — harmless today (renders at 0 width) but fragile. */
          .topic-show-more { grid-column: 1 !important; }
        }
        @media (max-width: 560px) {
          .topic-tabs { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

// Fixed per-tab dot color (not derived from any one post's accentColor,
// since a tab represents many posts) — picked to match the mockup's own
// per-tab dot colors (coral/sky/moss/amber for traits/frameworks/
// relationships/work).
const TAB_DOT_COLOR: Record<BlogCategory, string> = {
  traits: 'coral',
  frameworks: 'sky',
  relationships: 'moss',
  'work-direction': 'amber',
  lifestyle: 'coral',
}
