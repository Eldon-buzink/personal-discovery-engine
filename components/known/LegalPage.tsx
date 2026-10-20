import type { ReactNode } from 'react'

// Shared layout for the Privacy and Terms pages: the site's type tokens,
// one readable column, a plain "Last updated" line.
export function LegalPage({ title, updated, intro, children }: { title: string; updated: string; intro: ReactNode; children: ReactNode }) {
  return (
    <div className="bg-cream text-charcoal min-h-screen">
      <article className="legal-wrap mx-auto" style={{ maxWidth: 680, padding: '140px 24px 96px' }}>
        <h1 className="font-display font-normal text-display-1 text-charcoal" style={{ marginBottom: 12 }}>
          {title}
        </h1>
        <p className="font-sans text-meta text-muted" style={{ marginBottom: 32 }}>Last updated: {updated}</p>
        <div className="font-sans text-body text-charcoal-soft">{intro}</div>
        {children}
      </article>
      <style dangerouslySetInnerHTML={{ __html: `
        .legal-wrap a { color: #262420; text-decoration: underline; text-underline-offset: 3px; }
        .legal-wrap ul { padding-left: 20px; margin: 0 0 14px; list-style: disc; }
        .legal-wrap li { margin-bottom: 8px; }
        .legal-wrap p { margin: 0 0 14px; }
        @media (max-width: 640px) { .legal-wrap { padding-top: 112px !important; } }
      ` }} />
    </div>
  )
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 40 }}>
      <h2 className="font-display font-normal text-display-3 text-charcoal" style={{ marginBottom: 12 }}>{title}</h2>
      <div className="font-sans text-body text-charcoal-soft">{children}</div>
    </section>
  )
}
