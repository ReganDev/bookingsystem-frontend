/**
 * Client websites link to the booking app as `https://<host>/#<business-slug>`
 * (e.g. dashBook/#absolutelyfabuloushairandbeauty). Translate that hash into
 * the in-app route for the business booking page.
 *
 * Returns null when the hash is empty or doesn't look like a business slug.
 */
export function resolveHashPath(hash: string): string | null {
  const cleaned = hash.replace(/^#\/?/, '').replace(/\/+$/, '').trim()
  if (!cleaned) return null

  let decoded: string
  try {
    decoded = decodeURIComponent(cleaned)
  } catch {
    return null
  }

  // Allow fully qualified hash routes like #/book/<slug> too
  if (/^book\/[a-z0-9-]+$/i.test(decoded)) {
    return `/${decoded.toLowerCase()}`
  }

  if (!/^[a-z0-9-]+$/i.test(decoded)) return null

  return `/book/${decoded.toLowerCase()}`
}
