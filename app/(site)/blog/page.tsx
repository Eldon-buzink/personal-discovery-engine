import Link from 'next/link'
import { buildMetadata } from '@/lib/seo'
import { getRecentPosts, getPostsByCategory, BLOG_CATEGORIES, type BlogCategory } from '@/lib/blog/content'
import BentoGrid from '@/components/blog/BentoGrid'
import MoreArticlesList from '@/components/blog/MoreArticlesList'
import TopicBrowser from '@/components/blog/TopicBrowser'
import GlowCard from '@/components/blog/GlowCard'
import { blogCharcoal, blogCharcoalSoft, blogCoral, blogPeriwinkle, blogRose, blogSans, blogSerif } from '@/components/blog/tokens'

export const metadata = buildMetadata({
  path: '/blog',
  title: 'Blog — Bearing',
  description: 'Understand yourself, one trait at a time — explainers on every facet, framework, and branch behind the Bearing assessment.',
})

export default function BlogPage() {
  // Bento (3 most recent lifestyle) + more-articles (next 6) — same recency-
  // ordered list, just split by position, not two independent queries.
  const lifestylePosts = getRecentPosts('lifestyle', 9)
  const bentoPosts = lifestylePosts.slice(0, 3)
  const moreArticlesPosts = lifestylePosts.slice(3, 9)

  const postsByCategory = BLOG_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = getPostsByCategory(cat)
    return acc
  }, {} as Record<BlogCategory, ReturnType<typeof getPostsByCategory>>)

  return (
    <div style={{ background: '#F7F4ED', minHeight: '100vh', fontFamily: blogSans }}>
      <div className="blog-index-wrap" style={{ maxWidth: 1080, margin: '0 auto', padding: '150px 32px 0' }}>

        <div style={{ padding: '0 0 32px' }}>
          <div style={{ fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', color: blogCharcoalSoft, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: '60% 40% 55% 45% / 45% 55% 40% 60%', background: blogCoral }} />
            Resources
          </div>
          <h1 style={{ fontFamily: blogSerif, fontWeight: 500, fontStyle: 'italic', fontSize: 40, lineHeight: 1.15, letterSpacing: '-0.01em', maxWidth: 600, color: blogCharcoal }}>
            Understand yourself, one trait at a time.
          </h1>
        </div>

        {bentoPosts.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 0 18px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: blogCharcoalSoft, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '60% 40% 55% 45% / 45% 55% 40% 60%', background: blogPeriwinkle }} />
                From the blog
              </div>
            </div>
            <BentoGrid posts={bentoPosts} />
          </>
        )}

        <MoreArticlesList posts={moreArticlesPosts} />

        <TopicBrowser postsByCategory={postsByCategory} />

        <GlowCard
          variant="charcoal"
          glows={[
            { color: blogPeriwinkle, size: 260, top: -90, left: -60 },
            { color: blogRose, size: 220, bottom: -80, right: '10%' },
          ]}
          blur={85}
          glowOpacity={0.5}
          borderRadius={24}
          padding="48px 52px"
          className="strip-card"
          style={{ marginBottom: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32 }}
        >
          <div style={{ maxWidth: 480 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: blogRose, marginBottom: 10 }}>
              Free · Private · 15 minutes
            </div>
            <h4 style={{ fontFamily: blogSerif, fontWeight: 500, fontSize: 24, marginBottom: 10, lineHeight: 1.25 }}>See where you actually land.</h4>
            <p style={{ fontSize: 14, color: '#C9C5BA', lineHeight: 1.55 }}>
              Stop reading about traits in the abstract — get your own scores across all five domains, grounded in the same research these articles come from.
            </p>
          </div>
          <div className="strip-cta-block" style={{ textAlign: 'right', flexShrink: 0 }}>
            <Link href="/onboarding">
              <button style={{ background: '#F7F4ED', color: blogCharcoal, border: 'none', padding: '12px 22px', borderRadius: 100, fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: blogSans }}>
                Start your assessment
              </button>
            </Link>
            <div style={{ fontSize: 11.5, color: '#9C978C', marginTop: 10 }}>No account to start · No credit card</div>
          </div>
        </GlowCard>

      </div>

      <style>{`
        @media (max-width: 640px) {
          .blog-index-wrap { padding-top: 120px !important; padding-left: 20px !important; padding-right: 20px !important; }
          .strip-card { flex-direction: column !important; align-items: flex-start !important; text-align: left !important; }
          .strip-cta-block { text-align: left !important; }
        }
      `}</style>
    </div>
  )
}
