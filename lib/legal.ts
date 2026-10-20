// Who runs Bearing, for the Privacy and Terms pages (and anywhere else the
// business details belong). One place to fill in.
//
// A Dutch business website has to show its name, address, KvK number and
// an email address (Handelsregisterwet; art. 3:15d BW). ownerName, kvkNumber
// and address are empty until they're filled in here; the pages show only
// what's set.
export const LEGAL = {
  tradeName: 'Bearing',
  site: 'getbearing.me',
  ownerName: '',
  kvkNumber: '',
  address: '',
  country: 'the Netherlands',
  email: 'hello@getbearing.me',
  minimumAge: 16,
} as const

// "Bearing (getbearing.me) is run by <name>, a sole trader registered in the
// Netherlands (KvK 12345678), <address>."
export function operatorSentence(): string {
  const who = LEGAL.ownerName ? `${LEGAL.ownerName}, a sole trader` : 'a sole trader'
  const kvk = LEGAL.kvkNumber ? ` (KvK ${LEGAL.kvkNumber})` : ''
  const address = LEGAL.address ? `, ${LEGAL.address}` : ''
  return `${LEGAL.tradeName} (${LEGAL.site}) is run by ${who} registered in ${LEGAL.country}${kvk}${address}.`
}
