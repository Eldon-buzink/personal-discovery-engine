import SiteNav, { NAV_H } from '@/components/known/SiteNav'

// Practice (and other signed-in app pages) share the site's top bar so people
// can move between Report, Practice and their account. Pages here use
// min-h-screen; inside the shell that's reduced by the bar's height so pages
// aren't one bar taller than the window.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`.app-shell .min-h-screen{min-height:calc(100vh - ${NAV_H}px);}`}</style>
      <SiteNav />
      <div className="app-shell" style={{ paddingTop: NAV_H }}>{children}</div>
    </>
  )
}
