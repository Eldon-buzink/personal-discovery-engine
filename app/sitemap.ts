import type { MetadataRoute } from 'next'
import { getPublishedPosts } from '@/lib/blog/content'

const BASE_URL = 'https://www.getbearing.me'

// Only the marketing/content surface goes here. The assessment/report/
// onboarding/auth flow is intentionally excluded — see the "isn't meant to
// be indexed or shared" note in app/layout.tsx — and is kept out of crawler
// reach entirely via robots.ts rather than listed here.
export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/pricing`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/blog`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/contact`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/terms`, changeFrequency: 'yearly', priority: 0.3 },
  ]

  const postRoutes: MetadataRoute.Sitemap = getPublishedPosts().map(post => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: post.frontmatter.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [...staticRoutes, ...postRoutes]
}
