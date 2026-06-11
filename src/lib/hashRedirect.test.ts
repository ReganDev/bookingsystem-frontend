import { describe, expect, it } from 'vitest'
import { resolveHashPath } from './hashRedirect'

describe('resolveHashPath', () => {
  it('maps a bare business slug hash to the booking route', () => {
    expect(resolveHashPath('#absolutelyfabuloushairandbeauty')).toBe(
      '/book/absolutelyfabuloushairandbeauty',
    )
  })

  it('handles slugs with hyphens', () => {
    expect(resolveHashPath('#tans-by-mary')).toBe('/book/tans-by-mary')
  })

  it('handles a leading slash after the hash', () => {
    expect(resolveHashPath('#/absolutelyfabuloushairandbeauty')).toBe(
      '/book/absolutelyfabuloushairandbeauty',
    )
  })

  it('handles trailing slashes', () => {
    expect(resolveHashPath('#salon/')).toBe('/book/salon')
  })

  it('passes through fully qualified hash routes', () => {
    expect(resolveHashPath('#/book/salon')).toBe('/book/salon')
  })

  it('lowercases mixed-case slugs', () => {
    expect(resolveHashPath('#AbsolutelyFabulous')).toBe(
      '/book/absolutelyfabulous',
    )
  })

  it('returns null for an empty hash', () => {
    expect(resolveHashPath('')).toBeNull()
    expect(resolveHashPath('#')).toBeNull()
    expect(resolveHashPath('#/')).toBeNull()
  })

  it('returns null for values that do not look like slugs', () => {
    expect(resolveHashPath('#some/random/path')).toBeNull()
    expect(resolveHashPath('#<script>alert(1)</script>')).toBeNull()
    expect(resolveHashPath('#%ZZ')).toBeNull()
  })
})
