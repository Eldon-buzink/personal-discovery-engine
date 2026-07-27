import { blogCard, blogCharcoal, blogCharcoalSoft, blogLine, blogSans } from './tokens'
import type { FaqItem } from '@/lib/blog/types'

// Renders the frontmatter `faq` array inline in the post body — the same
// data also gets emitted as FAQPage JSON-LD by the post page, so this is
// purely the visual rendering, not the source of truth for the Q&A content.
export default function FaqBlock({ items }: { items: FaqItem[] }) {
  if (!items || items.length === 0) return null
  return (
    <div style={{ background: blogCard, border: `1px solid ${blogLine}`, borderRadius: 16, padding: '26px 28px', margin: '30px 0' }}>
      {items.map((item, i) => (
        <div key={i} style={{ marginTop: i === 0 ? 0 : 20 }}>
          <div style={{ fontWeight: 600, fontSize: 15.5, marginBottom: 8, color: blogCharcoal, fontFamily: blogSans }}>{item.q}</div>
          <div style={{ fontSize: 14.5, color: blogCharcoalSoft, lineHeight: 1.6, fontFamily: blogSans }}>{item.a}</div>
        </div>
      ))}
    </div>
  )
}
