'use client'

import { useState } from 'react'
import Link from 'next/link'
import PostThumbnail from './PostThumbnail'
import { accentColorCss } from '@/lib/blog/theme'
import { blogCharcoal, blogCharcoalSoft, blogLine, blogSans, blogSerif } from './tokens'
import type { BlogPost } from '@/lib/blog/types'

function MoreRow({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '18px 4px', borderBottom: `1px solid ${blogLine}`, textDecoration: 'none', color: 'inherit' }}
    >
      <PostThumbnail slug={post.slug} accentColor={post.frontmatter.accentColor} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', marginBottom: 4, color: accentColorCss(post.frontmatter.accentColor), fontFamily: blogSans }}>
          {post.frontmatter.subcategory.charAt(0).toUpperCase() + post.frontmatter.subcategory.slice(1)}
        </div>
        <div style={{ fontFamily: blogSerif, fontWeight: 500, fontSize: 17, letterSpacing: '-0.003em', marginBottom: 5, color: blogCharcoal }}>
          {post.frontmatter.title}
        </div>
        <div style={{ fontSize: 13, color: blogCharcoalSoft, lineHeight: 1.5, maxWidth: 560 }}>{post.frontmatter.dek}</div>
      </div>
      <span style={{ fontSize: 12, color: blogCharcoalSoft, whiteSpace: 'nowrap', alignSelf: 'flex-start', marginTop: 2, fontFamily: blogSans }}>
        {post.frontmatter.readTime} min
      </span>
    </Link>
  )
}

export default function MoreArticlesList({ posts }: { posts: BlogPost[] }) {
  const [expanded, setExpanded] = useState(false)
  const shown = posts.slice(0, 3)
  const extra = posts.slice(3, 6)

  if (shown.length === 0) return null

  return (
    <div style={{ paddingBottom: 6 }}>
      <div>
        {shown.map(post => <MoreRow key={post.slug} post={post} />)}
        {expanded && extra.map(post => <MoreRow key={post.slug} post={post} />)}
      </div>
      {extra.length > 0 && (
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: `1px solid ${blogLine}`,
            color: blogCharcoal, fontFamily: blogSans, fontSize: 13.5, fontWeight: 600, padding: '10px 18px',
            borderRadius: 100, cursor: 'pointer', margin: '20px auto 64px',
          }}
        >
          <span>{expanded ? 'Show less' : 'Show 3 more'}</span>
          <span style={{ display: 'inline-block', transition: 'transform 0.2s ease', transform: expanded ? 'rotate(180deg)' : 'none' }}>▾</span>
        </button>
      )}
    </div>
  )
}
