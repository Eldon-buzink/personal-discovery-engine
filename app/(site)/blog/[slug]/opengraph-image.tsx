import { getPublishedPosts } from '@/lib/blog/content'
import { renderBlogPostOgImage, BLOG_OG_IMAGE_SIZE } from '@/lib/og-blog-post-image'

export const alt = 'Bearing blog post'
export const size = BLOG_OG_IMAGE_SIZE
export const contentType = 'image/png'

// Same rationale as generateStaticParams in page.tsx — prerender at build
// time alongside the post itself rather than generating on first request.
export async function generateStaticParams() {
  return getPublishedPosts().map(post => ({ slug: post.slug }))
}

export default function Image({ params }: { params: { slug: string } }) {
  return renderBlogPostOgImage(params.slug)
}
