import 'server-only'
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import readingTime from 'reading-time'
import { BLOG_CATEGORIES, type BlogCategory, type BlogPost, type PostFrontmatter } from './types'

// MDX files on disk, not a headless CMS — git-versioned, no separate service
// to run or keep in sync. getAllPosts() reads the whole tree once per process
// (module-level cache below); fine for a build-time/static-generation
// workload like this, not meant for a runtime with frequent content writes.
//
// `import 'server-only'` makes any accidental client-component import of
// this file (directly, or transitively through fs/path) fail at build time
// with a clear message, instead of the opaque webpack "node:fs" bundling
// error this file used to cause before being split from lib/blog/types.ts.

export type { BlogCategory, BlogPost, PostFrontmatter, FaqItem } from './types'
export { BLOG_CATEGORIES, CATEGORY_LABELS } from './types'

const CONTENT_DIR = path.join(process.cwd(), 'content/blog')

let _cache: BlogPost[] | null = null

export function getAllPosts(): BlogPost[] {
  if (_cache) return _cache
  const posts: BlogPost[] = []
  for (const category of BLOG_CATEGORIES) {
    const dir = path.join(CONTENT_DIR, category)
    if (!fs.existsSync(dir)) continue
    for (const filename of fs.readdirSync(dir)) {
      if (!filename.endsWith('.mdx')) continue
      const slug = filename.replace(/\.mdx$/, '')
      const raw = fs.readFileSync(path.join(dir, filename), 'utf8')
      const { data, content } = matter(raw)
      const fm = data as PostFrontmatter
      if (fm.category !== category) {
        throw new Error(`content/blog/${category}/${filename}: frontmatter category "${fm.category}" doesn't match its directory "${category}"`)
      }
      posts.push({
        slug,
        frontmatter: {
          ...fm,
          readTime: fm.readTime ?? Math.max(1, Math.round(readingTime(content).minutes)),
          published: fm.published ?? true,
        },
        content,
      })
    }
  }
  _cache = posts
  return posts
}

// Gates on both published AND publishDate (if set) — a post can be
// published:true with a future publishDate for staggered-schedule releases;
// see the publishDate comment in types.ts for why this is deploy-triggered
// rather than a real scheduler. Lexical string comparison is safe here
// because both sides are ISO "YYYY-MM-DD".
const todayISO = () => new Date().toISOString().slice(0, 10)

function isLive(fm: PostFrontmatter): boolean {
  if (!fm.published) return false
  if (fm.publishDate && fm.publishDate > todayISO()) return false
  return true
}

// Everything downstream (index page, sidebars, report links) reads through
// this, not getAllPosts() directly — a post with published:false in
// frontmatter (used for drafts), or a future publishDate, should never
// surface in a list or a "Learn more" link, only be reachable if you already
// have the exact slug... which it also isn't, since the [slug] route itself
// checks this (see page.tsx).
export function getPublishedPosts(): BlogPost[] {
  return getAllPosts().filter(p => isLive(p.frontmatter))
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return getAllPosts().find(p => p.slug === slug)
}

export function getPostsByCategory(category: BlogCategory): BlogPost[] {
  return getPublishedPosts().filter(p => p.frontmatter.category === category)
}

export function getRecentPosts(category: BlogCategory, count: number): BlogPost[] {
  return [...getPostsByCategory(category)]
    .sort((a, b) => b.frontmatter.updatedAt.localeCompare(a.frontmatter.updatedAt))
    .slice(0, count)
}

// Landing-page teaser: most recent posts across every category, not just
// lifestyle (unlike the index page's bento/more-articles, which are
// lifestyle-only by design — see build brief section 2 vs section 7).
export function getRecentPostsAcrossCategories(count: number): BlogPost[] {
  return [...getPublishedPosts()]
    .sort((a, b) => b.frontmatter.updatedAt.localeCompare(a.frontmatter.updatedAt))
    .slice(0, count)
}

export function getPostBySlugIfPublished(slug: string): BlogPost | undefined {
  const post = getPostBySlug(slug)
  return post && isLive(post.frontmatter) ? post : undefined
}
