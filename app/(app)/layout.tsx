import SiteNav, { NAV_H } from '@/components/known/SiteNav'

// Practice screens share the site nav (Practice · Reviews · Manage for a
// signed-in user) instead of each page carrying its own loose links. The nav
// is fixed, so content is pushed down by its height — and every practice
// screen's own full-height wrappers are trimmed by the same amount, so a
// short page doesn't pick up a scrollbar just from the offset.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `.app-shell .min-h-screen { min-height: calc(100vh - ${NAV_H}px); }` }} />
      <SiteNav />
      <main className="app-shell" style={{ paddingTop: NAV_H }}>{children}</main>
    </>
  )
}
