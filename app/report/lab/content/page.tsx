import { buildMetadata } from '@/lib/seo'
import { CLUSTERS, familyLabel } from '@/lib/lab/filterLab'
import { CLUSTER_DESCRIPTIONS } from '@/lib/lab/contentLab'

// Report lab, content per selection: the options board. Every state as a
// real render at 390 and 1280. Not indexed; nothing calls a model.
export const metadata = buildMetadata({ path: '/report/lab/content', title: 'Report lab: content | Bearing', description: 'Report lab, content per selection.', noindex: true })

const BOARD: { section: string; items: { label: string; q: string }[] }[] = [
  { section: 'Summary and Most pronounced: (a) separate states', items: [
    { label: 'Summary, structure a (headline, paragraph, evidence row)', q: 'm=a&view=summary&s=a' },
    { label: 'Summary, structure b (headline, paragraph, one line per cluster)', q: 'm=a&view=summary&s=b' },
    { label: 'Summary evidence panel open', q: 'm=a&view=summary&s=a&ev=1' },
    { label: 'Most pronounced (tie stated, five headline sentences)', q: 'm=a&view=top' },
    { label: 'Menu open', q: 'm=a&view=summary&menu=1' },
  ] },
  { section: 'Summary and Most pronounced: (b) one merged Overview', items: [
    { label: 'Overview, structure a', q: 'm=b&view=overview&s=a' },
    { label: 'Overview, structure b', q: 'm=b&view=overview&s=b' },
  ] },
  { section: 'Cluster content', items: [
    { label: 'Layout a: description, reading, tension, evidence (Drive and discipline)', q: 'view=Conscientiousness&cl=a' },
    { label: 'Layout b: reading first, tension as a pointer, description folded (Drive and discipline)', q: 'view=Conscientiousness&cl=b' },
    { label: 'Layout a, description draft 2', q: 'view=Conscientiousness&cl=a&d=2' },
    { label: 'Cluster evidence panel open', q: 'view=Conscientiousness&cl=a&ev=1' },
    { label: 'Layout a, a cluster without a tension (Getting along)', q: 'view=Agreeableness&cl=a' },
  ] },
  { section: 'Single trait', items: [
    { label: 'Trait card with a relationship insight (Ambitious)', q: 'view=Conscientiousness&trait=Achievement-Striving' },
    { label: 'Trait card from Most pronounced (Take-charge)', q: 'm=a&view=top&trait=Assertiveness' },
  ] },
  { section: 'Loading, failure, fewer traits', items: [
    { label: 'Summary loading', q: 'm=a&view=summary&st=loading' },
    { label: 'Summary failed (falls back to the most pronounced headlines)', q: 'm=a&view=summary&st=failed' },
    { label: 'Cluster reading loading', q: 'view=Conscientiousness&st=loading' },
    { label: 'Cluster reading failed (falls back to the six headlines)', q: 'view=Conscientiousness&st=failed' },
    { label: 'Paid, 7 traits revealed: Summary falls back to headlines', q: 'm=a&view=summary&n=7' },
    { label: 'Paid, 12 traits revealed: Summary from revealed traits only', q: 'm=a&view=summary&n=12' },
    { label: 'Paid, 12 traits revealed: a cluster with fewer than 3 (no reading)', q: 'view=Neuroticism&n=12' },
  ] },
  { section: 'Free user (no clusters, per-trait hues)', items: [
    { label: 'Unchanged single-trait card', q: 'f=free' },
    { label: 'Variant: a short Summary for free users', q: 'f=free&fs=1' },
  ] },
]

function Frame({ q, width, scale }: { q: string; width: number; scale: number }) {
  const height = 1400
  return (
    <div style={{ width: width * scale, height: height * scale, overflow: 'hidden', borderRadius: 12, border: '1px solid #E5E1D5', background: '#FFFFFF', flexShrink: 0 }}>
      <iframe src={`/report/lab/content/frame?${q}`} title={`${q} at ${width}`} width={width} height={height}
        style={{ border: 0, transform: `scale(${scale})`, transformOrigin: '0 0' }} />
    </div>
  )
}

export default function LabContentPage() {
  return (
    <div style={{ background: '#EFEBE2', minHeight: '100vh', padding: '32px 24px 80px', fontFamily: 'var(--font-body)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 36, textAlign: 'center', margin: '0 0 6px' }}>Report lab: content</h1>
      <p style={{ textAlign: 'center', color: '#6B675F', fontSize: 14, margin: '0 0 32px' }}>Each state at 390 (left) and 1280 (right). Placeholder text is marked [LAB COPY]. Nothing here calls a model.</p>
      {BOARD.map((s) => (
        <section key={s.section} style={{ marginBottom: 56 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26, margin: '0 0 16px' }}>{s.section}</h2>
          {s.items.map((it) => (
            <div key={it.q} style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 14, color: '#56534D', margin: '0 0 8px' }}>{it.label} · <a href={`/report/lab/content/frame?${it.q}`}>open</a></p>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', overflowX: 'auto' }}>
                <Frame q={it.q} width={390} scale={0.62} />
                <Frame q={it.q} width={1280} scale={0.45} />
              </div>
            </div>
          ))}
        </section>
      ))}
      <section style={{ maxWidth: 860, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26, margin: '0 0 16px' }}>Static cluster descriptions: two drafts each</h2>
        {CLUSTERS.map((c) => (
          <div key={c} style={{ marginBottom: 28 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 20, margin: '0 0 8px' }}>{familyLabel(c)}</h3>
            {CLUSTER_DESCRIPTIONS[c].map((d, i) => (
              <div key={i} style={{ background: '#FFFFFF', borderRadius: 12, padding: '12px 16px', marginBottom: 8 }}>
                <p style={{ fontSize: 15, color: '#262420', margin: '0 0 6px' }}><strong>Draft {i + 1}.</strong> {d.text}</p>
                <p style={{ fontSize: 13, color: '#8C8A83', margin: 0 }}>{d.covers.map((x) => `"${x.phrase}" = ${x.facet}`).join(' · ')}</p>
              </div>
            ))}
          </div>
        ))}
      </section>
    </div>
  )
}
