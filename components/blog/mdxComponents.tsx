import type { ComponentProps } from 'react'
import AssessmentCTA from './AssessmentCTA'
import { blogCharcoal, blogCoral, blogSans, blogSerif } from './tokens'

// Maps markdown elements to the exact typography from the post mockup's
// .prose rules, plus registers <AssessmentCTA /> as the one shortcode
// authors can drop into a post body (see AssessmentCTA.tsx). Passed to
// MDXRemote's `components` prop in app/blog/[slug]/page.tsx.
export const mdxComponents = {
  h2: (props: ComponentProps<'h2'>) => (
    <h2 {...props} style={{ fontFamily: blogSerif, fontWeight: 500, fontSize: 26, letterSpacing: '-0.005em', margin: '40px 0 16px', color: blogCharcoal }} />
  ),
  h3: (props: ComponentProps<'h3'>) => (
    <h3 {...props} style={{ fontFamily: blogSerif, fontWeight: 500, fontSize: 20, margin: '30px 0 12px', color: blogCharcoal }} />
  ),
  p: (props: ComponentProps<'p'>) => (
    <p {...props} style={{ marginBottom: 22 }} />
  ),
  // Authors write `> Quote text` for a pullquote — matches the mockup's
  // .pullquote treatment exactly (coral left border, italic serif).
  blockquote: (props: ComponentProps<'blockquote'>) => (
    <blockquote
      {...props}
      style={{
        fontFamily: blogSerif, fontStyle: 'italic', fontSize: 24, lineHeight: 1.45,
        color: blogCharcoal, borderLeft: `2px solid ${blogCoral}`, padding: '4px 0 4px 26px',
        margin: '34px 0', maxWidth: 540,
      }}
    />
  ),
  ul: (props: ComponentProps<'ul'>) => (
    <ul {...props} style={{ margin: '0 0 22px', paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 8 }} />
  ),
  li: (props: ComponentProps<'li'>) => (
    <li {...props} style={{ lineHeight: 1.7 }} />
  ),
  strong: (props: ComponentProps<'strong'>) => (
    <strong {...props} style={{ fontWeight: 600 }} />
  ),
  a: (props: ComponentProps<'a'>) => (
    <a {...props} style={{ color: blogCoral, textDecoration: 'underline', textUnderlineOffset: 2 }} />
  ),
  AssessmentCTA,
}

export const proseStyle = { fontSize: 17, lineHeight: 1.75, color: blogCharcoal, fontFamily: blogSans }
