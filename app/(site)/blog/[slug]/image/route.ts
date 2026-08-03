import { getPublishedPosts } from '@/lib/blog/content'
import { renderBlogPostOgImage } from '@/lib/og-blog-post-image'

// A plain, hash-free alias for the same image opengraph-image.tsx serves —
// Article JSON-LD's `image` field needs a URL it can construct directly
// from the post slug; the file-convention route's actual served path gets
// a Next-generated hash suffix that isn't safe to hardcode elsewhere.
export async function generateStaticParams() {
  return getPublishedPosts().map(post => ({ slug: post.slug }))
}

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  return renderBlogPostOgImage(params.slug)
}
