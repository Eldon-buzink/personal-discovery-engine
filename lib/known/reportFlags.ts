// Report redesign flags, read at build time. Both off unless set to '1', so
// the live report is unchanged until someone turns them on.
// - NEXT_PUBLIC_REPORT_FREE_CLUSTER: free users see the five-blob visual
//   (the selected trait in the middle, the others around it) instead of the
//   trait carousel.
// - NEXT_PUBLIC_REPORT_PAID_V2: paid users (and the public example report)
//   see the cluster design: the Showing menu, Overview and the five groups.

export const REPORT_FREE_CLUSTER = process.env.NEXT_PUBLIC_REPORT_FREE_CLUSTER === '1'
export const REPORT_PAID_V2 = process.env.NEXT_PUBLIC_REPORT_PAID_V2 === '1'
