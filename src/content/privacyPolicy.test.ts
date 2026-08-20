import { describe, expect, it } from 'vitest'
import {
  PLACEHOLDER,
  PRIVACY_SECTIONS,
  hasUnfilledDetails,
  privacyDetails,
  providers,
  retentionPeriods,
  unfilledDetailKeys,
} from './privacyPolicy'

describe('privacyPolicy content', () => {
  it('flags every detail still set to the placeholder', () => {
    const keys = unfilledDetailKeys({
      ...privacyDetails,
      legalEntity: PLACEHOLDER,
      privacyEmail: 'privacy@example.com',
    })

    expect(keys).toContain('legalEntity')
    expect(keys).not.toContain('privacyEmail')
    expect(keys).not.toContain('serviceName')
  })

  it('treats a deliberately blank value as filled in, not missing', () => {
    // A sole trader has no company number; blank means "omit this line".
    const keys = unfilledDetailKeys({ ...privacyDetails, companyNumber: '' })

    expect(keys).not.toContain('companyNumber')
  })

  it('reports whether anything is still unfilled', () => {
    expect(hasUnfilledDetails({ ...privacyDetails, legalEntity: PLACEHOLDER })).toBe(true)

    const filled = Object.fromEntries(
      Object.entries(privacyDetails).map(([key, value]) => [
        key,
        value === PLACEHOLDER ? 'filled in' : value,
      ]),
    ) as typeof privacyDetails

    expect(hasUnfilledDetails(filled)).toBe(false)
  })

  it('names only providers that personal data actually reaches', () => {
    const names = providers.map((provider) => provider.name)

    expect(names).toEqual([
      'Supabase',
      'Resend',
      'Vercel',
      'Railway',
      'Sentry',
      'postcodes.io',
      'OSRM (Project OSRM demo server)',
      'Google Fonts',
    ])
  })

  it('does not name services the product does not use', () => {
    const serialised = JSON.stringify(providers).toLowerCase()

    for (const absent of ['stripe', 'google analytics', 'cloudflare', 'twilio']) {
      expect(serialised).not.toContain(absent)
    }
  })

  it('gives every section a unique anchor id', () => {
    const ids = PRIVACY_SECTIONS.map((section) => section.id)

    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain('who-we-are')
    expect(ids).toContain('complaints')
  })

  it('states a retention period for each category it lists', () => {
    expect(retentionPeriods.length).toBeGreaterThan(0)
    for (const entry of retentionPeriods) {
      expect(entry.period.trim()).not.toBe('')
    }
  })
})
