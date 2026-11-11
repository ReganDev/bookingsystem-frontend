import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  EMBED_RESIZE_MESSAGE,
  embedLayout,
  isEmbedSearch,
  reportEmbedHeight,
} from './embed'

describe('isEmbedSearch', () => {
  it('is on only for embed=1', () => {
    expect(isEmbedSearch('?embed=1')).toBe(true)
    expect(isEmbedSearch('?date=2026-01-01&embed=1')).toBe(true)
    expect(isEmbedSearch('')).toBe(false)
    expect(isEmbedSearch('?embed=0')).toBe(false)
    expect(isEmbedSearch('?embedded=1')).toBe(false)
  })
})

describe('embedLayout', () => {
  it('defaults to auto and switches to fill on request', () => {
    expect(embedLayout('?embed=1')).toBe('auto')
    expect(embedLayout('?embed=1&layout=fill')).toBe('fill')
    expect(embedLayout('?embed=1&layout=other')).toBe('auto')
  })
})

describe('reportEmbedHeight', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does nothing when the page is not in a frame', () => {
    const post = vi.spyOn(window, 'postMessage')
    reportEmbedHeight()
    expect(post).not.toHaveBeenCalled()
  })

  it('posts the document height to the parent frame', () => {
    const parent = { postMessage: vi.fn() }
    vi.spyOn(window, 'parent', 'get').mockReturnValue(
      parent as unknown as Window,
    )
    vi.spyOn(document.body, 'getBoundingClientRect').mockReturnValue({
      height: 812.4,
    } as DOMRect)

    reportEmbedHeight()

    expect(parent.postMessage).toHaveBeenCalledWith(
      { type: EMBED_RESIZE_MESSAGE, height: 813 },
      '*',
    )
  })
})
