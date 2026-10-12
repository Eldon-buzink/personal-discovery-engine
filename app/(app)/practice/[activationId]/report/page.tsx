import { redirect } from 'next/navigation'

// Each trait used to have its own report page (this week + the 4-week
// window). Reviews are one page per cadence now, listing every trait; this
// route sends old links to this trait's section of the monthly review.
export default function PatternReportRedirect({ params }: { params: { activationId: string } }) {
  redirect(`/practice/reviews/monthly#${params.activationId}`)
}
