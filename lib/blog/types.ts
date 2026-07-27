// Pure types and static constants only — no fs/path, safe to import from
// client components. lib/blog/content.ts (the actual file-reading pipeline)
// imports FROM here, not the other way around, and is itself guarded with
// `import 'server-only'` so this split can't silently regress: a client
// component that imports content.ts directly gets a build error instead of
// the "node:fs" bundling failure this split was written to fix.

export type BlogCategory = 'traits' | 'frameworks' | 'relationships' | 'work-direction' | 'lifestyle'

export const BLOG_CATEGORIES: BlogCategory[] = ['traits', 'frameworks', 'relationships', 'work-direction', 'lifestyle']

export const CATEGORY_LABELS: Record<BlogCategory, string> = {
  traits: 'Traits',
  frameworks: 'Frameworks',
  relationships: 'Relationships',
  'work-direction': 'Work & Direction',
  lifestyle: 'Lifestyle',
}

export interface FaqItem { q: string; a: string }

export interface PostFrontmatter {
  title: string
  dek: string
  category: BlogCategory
  subcategory: string
  facetId?: string
  readTime?: number
  updatedAt: string
  accentColor: string
  relatedSlugs?: string[]
  faq?: FaqItem[]
  published?: boolean
}

export interface BlogPost {
  slug: string
  frontmatter: PostFrontmatter & { readTime: number; published: boolean }
  content: string
}
