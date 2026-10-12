import { redirect } from 'next/navigation'

// Moved to /practice/reviews/quarterly alongside the weekly and monthly
// reviews; kept for bookmarks and older links.
export default function QuarterlyRedirect() {
  redirect('/practice/reviews/quarterly')
}
