import SiteNav from '@/components/known/SiteNav'
import SiteFooter from '@/components/known/SiteFooter'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNav />
      {children}
      <SiteFooter />
    </>
  )
}
