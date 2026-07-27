import GithubSlugger from 'github-slugger'

export interface TocItem {
  id: string
  text: string
  depth: 2 | 3
}

// Extracts ## and ### headings from raw MDX and assigns each the same slug
// rehype-slug will assign when the content actually renders (both use
// github-slugger, and — critically — a single shared Slugger instance here,
// same as rehype-slug uses internally, so a duplicate heading text produces
// the same "-1", "-2" disambiguating suffix in both places). If these ever
// drifted out of sync, sidebar TOC links would point at anchors that don't
// exist on the rendered page.
export function extractToc(mdxSource: string): TocItem[] {
  const slugger = new GithubSlugger()
  const items: TocItem[] = []
  const headingLine = /^(#{2,3})\s+(.+)$/gm
  let match: RegExpExecArray | null
  while ((match = headingLine.exec(mdxSource)) !== null) {
    const depth = match[1].length as 2 | 3
    const text = match[2].trim()
    items.push({ id: slugger.slug(text), text, depth })
  }
  return items
}
