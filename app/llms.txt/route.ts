import { getPublishedPosts, BLOG_CATEGORIES, CATEGORY_LABELS } from '@/lib/blog/content'

// /llms.txt (llmstxt.org): a plain map of the site for AI answer engines.
// Built from the same post list as the sitemap, so a new post shows up here
// once its publishDate passes, with the same hourly refresh.
export const revalidate = 3600

const BASE_URL = 'https://www.getbearing.me'

const PAGES: { path: string; name: string; note: string }[] = [
  { path: '/how-it-works', name: 'How it works', note: 'How 120 statements become 30 facet scores, which parts of the report are written by AI, the limits of self-report, and what is free.' },
  { path: '/traits', name: 'All 30 facets', note: 'Every facet Bearing measures, grouped by the five Big Five domains, with the words used for low and high scores.' },
  { path: '/pricing', name: 'Pricing', note: 'Start free with no account. One payment of €49 unlocks the rest for good. No subscription.' },
  { path: '/blog', name: 'Blog', note: 'Explainers on each facet, the frameworks behind the test, relationships and work.' },
  { path: '/about', name: 'About', note: 'Who makes Bearing.' },
  { path: '/privacy', name: 'Privacy', note: 'What Bearing stores, who processes it and how long it is kept.' },
]

export function GET() {
  const posts = getPublishedPosts()
  const lines: string[] = [
    '# Bearing',
    '',
    '> Bearing is a personality report and daily practice. You answer 120 statements from the IPIP-NEO-120, a public Big Five test, and get a report on 30 personality facets: what each one looks like in your days and what it costs or gives you. A short daily check-in then helps you notice those patterns as they happen. The first 5 patterns are free.',
    '',
    'Facts worth knowing:',
    '',
    '- The test is the IPIP-NEO-120: 120 statements, 30 facets, grouped into the five Big Five domains (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism).',
    '- Scores are worked out from your answers with fixed rules. Some explanation text in the report is written by AI from those scores. The How it works page says which.',
    '- Bearing is for self-understanding. It is not a clinical or diagnostic tool.',
    '- The Relationships branch adapts the ECR-R into 15 items and places you in one of four relationship patterns.',
    '',
    '## Main pages',
    '',
    `- [Home](${BASE_URL}/): What Bearing is and how to start the free test.`,
    ...PAGES.map(p => `- [${p.name}](${BASE_URL}${p.path}): ${p.note}`),
  ]

  for (const category of BLOG_CATEGORIES) {
    const inCategory = posts
      .filter(p => p.frontmatter.category === category)
      .sort((a, b) => a.frontmatter.title.localeCompare(b.frontmatter.title))
    if (inCategory.length === 0) continue
    lines.push('', `## ${CATEGORY_LABELS[category]}`, '')
    for (const post of inCategory) {
      lines.push(`- [${post.frontmatter.title}](${BASE_URL}/blog/${post.slug}): ${post.frontmatter.dek}`)
    }
  }

  return new Response(lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
