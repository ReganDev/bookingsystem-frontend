/**
 * Embed mode: a business puts its booking page in an iframe on its own website
 * with `/book/<slug>?embed=1`. The page then drops the BookingBase header and
 * footer, stays on the light theme, and tells the parent page how tall it is
 * so the iframe can grow to fit instead of scrolling.
 */

export const EMBED_RESIZE_MESSAGE = 'bookingbase:resize'

export function isEmbedSearch(search: string): boolean {
  return new URLSearchParams(search).get('embed') === '1'
}

// Read once at load: links inside the frame drop the query string, and the
// page must stay in embed mode for as long as it lives in the iframe.
const embedded =
  typeof window !== 'undefined' && isEmbedSearch(window.location.search)

export function isEmbedded(): boolean {
  return embedded
}

/** Keeps `?embed=1` on a link that navigates inside the frame. */
export function embedPath(path: string): string {
  if (!isEmbedded()) return path
  const layout =
    embedLayout(window.location.search) === 'fill' ? '&layout=fill' : ''
  return `${path}${path.includes('?') ? '&' : '?'}embed=1${layout}`
}

/** Posts the document height to the parent page whenever it changes. */
export function reportEmbedHeight(): () => void {
  if (window.parent === window) return () => {}

  let last = 0
  const post = () => {
    const height = Math.ceil(document.body.getBoundingClientRect().height)
    if (height === last) return
    last = height
    // The height is not sensitive and the embedding site's origin is not
    // known in advance, so any parent may receive it.
    window.parent.postMessage({ type: EMBED_RESIZE_MESSAGE, height }, '*')
  }

  post()
  if (typeof ResizeObserver === 'undefined') return () => {}
  const observer = new ResizeObserver(post)
  observer.observe(document.body)
  return () => observer.disconnect()
}

/**
 * `auto` (default): the page is as tall as its content and reports that height.
 * `fill` (`&layout=fill`): on wide frames the page fills the height the host
 * gave the iframe and the booking panel scrolls inside it, so the host can
 * fit the whole thing on one screen. Narrow frames still behave as `auto`.
 */
export type EmbedLayout = 'auto' | 'fill'

export function embedLayout(search: string): EmbedLayout {
  return new URLSearchParams(search).get('layout') === 'fill' ? 'fill' : 'auto'
}

/** Call once before the app renders. */
export function initEmbed() {
  if (!isEmbedded()) return
  const root = document.documentElement
  root.dataset.embed = embedLayout(window.location.search)
  // The host site sets the look; never follow the visitor's dark preference.
  root.dataset.theme = 'light'
  reportEmbedHeight()
}
