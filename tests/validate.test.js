import { describe, it, expect } from 'vitest'
import { validateOrder, hasErrors } from '../src/js/validate.js'

const VALID = {
  name: 'Hunter Anderson',
  email: 'hunter@example.com',
  address: '123 Trailhead Way',
  city: 'Provo',
  zip: '84604',
}

const withField = (field, value) => ({ ...VALID, [field]: value })

describe('a complete, valid order', () => {
  it('produces no errors', () => {
    const errors = validateOrder(VALID)
    expect(errors).toEqual({})
    expect(hasErrors(errors)).toBe(false)
  })

  it('tolerates surrounding whitespace', () => {
    const padded = Object.fromEntries(
      Object.entries(VALID).map(([k, v]) => [k, `  ${v}  `])
    )
    expect(validateOrder(padded)).toEqual({})
  })
})

describe('required fields', () => {
  it('reports every empty field at once, not just the first', () => {
    const errors = validateOrder({})
    expect(Object.keys(errors).sort()).toEqual([
      'address',
      'city',
      'email',
      'name',
      'zip',
    ])
  })

  it('treats whitespace-only input as empty', () => {
    expect(validateOrder(withField('name', '   ')).name).toBeTruthy()
  })

  it('handles missing keys without throwing', () => {
    expect(() => validateOrder({ name: 'Hunter' })).not.toThrow()
  })
})

describe('email', () => {
  it.each([
    'hunter@example.com',
    'first.last@sub.domain.org',
    'a+tag@example.co.uk',
  ])('accepts %s', (email) => {
    expect(validateOrder(withField('email', email)).email).toBeUndefined()
  })

  it.each([
    'hunter',
    'hunter@',
    '@example.com',
    'hunter@example',
    'hunter @example.com',
    'hunter@exam ple.com',
  ])('rejects %s', (email) => {
    expect(validateOrder(withField('email', email)).email).toBeTruthy()
  })

  it('distinguishes empty from malformed', () => {
    expect(validateOrder(withField('email', '')).email).toBe(
      'Please enter your email address.'
    )
    expect(validateOrder(withField('email', 'nope')).email).toContain('valid')
  })
})

describe('zip', () => {
  it('accepts exactly five digits', () => {
    expect(validateOrder(withField('zip', '84604')).zip).toBeUndefined()
  })

  it.each(['1234', '123456', 'abcde', '8460a', '84 04'])(
    'rejects %s',
    (zip) => {
      expect(validateOrder(withField('zip', zip)).zip).toBeTruthy()
    }
  )

  it('distinguishes empty from malformed', () => {
    expect(validateOrder(withField('zip', '')).zip).toBe(
      'Please enter your zip code.'
    )
    expect(validateOrder(withField('zip', '123')).zip).toContain('5 numbers')
  })
})

describe('hasErrors', () => {
  it('is false for an empty object and true otherwise', () => {
    expect(hasErrors({})).toBe(false)
    expect(hasErrors({ zip: 'nope' })).toBe(true)
  })
})
