import { describe, it, expect } from 'vitest'
import { matchProducts } from '../src/js/data.js'

const LIST = [
  {
    id: 'boot-ridgeline',
    name: 'Ridgeline Hiking Boots',
    category: 'Footwear',
    description: 'Waterproof mid-cut boots with aggressive grip for rocky terrain.',
  },
  {
    id: 'shoe-approach-trail',
    name: 'Approach Trail Runners',
    category: 'Footwear',
    description: 'Breathable low-profile trail runners with a rock plate underfoot.',
  },
  {
    id: 'tent-basecamp-2',
    name: 'Basecamp 2 Tent',
    category: 'Shelter',
    description: 'Lightweight two-person backpacking tent with a weatherproof rainfly.',
  },
  {
    id: 'jacket-summit-down',
    name: 'Summit Down Jacket',
    category: 'Apparel',
    description: '800-fill down jacket that packs into its own chest pocket.',
  },
]

const ids = (result) => result.map((p) => p.id)

describe('category filtering', () => {
  it('returns everything for All', () => {
    expect(matchProducts(LIST, { category: 'All' })).toHaveLength(4)
  })

  it('returns everything when no options are given', () => {
    expect(matchProducts(LIST)).toHaveLength(4)
  })

  it('narrows to a single category', () => {
    expect(ids(matchProducts(LIST, { category: 'Footwear' }))).toEqual([
      'boot-ridgeline',
      'shoe-approach-trail',
    ])
  })

  it('returns nothing for a category with no products', () => {
    expect(matchProducts(LIST, { category: 'Cooking' })).toEqual([])
  })
})

describe('search', () => {
  it('matches on name', () => {
    expect(ids(matchProducts(LIST, { search: 'basecamp' }))).toEqual(['tent-basecamp-2'])
  })

  it('matches on description', () => {
    expect(ids(matchProducts(LIST, { search: 'rock plate' }))).toEqual([
      'shoe-approach-trail',
    ])
  })

  it('matches on category name', () => {
    expect(ids(matchProducts(LIST, { search: 'apparel' }))).toEqual(['jacket-summit-down'])
  })

  it('is case insensitive', () => {
    expect(ids(matchProducts(LIST, { search: 'RIDGELINE' }))).toEqual(['boot-ridgeline'])
  })

  it('ignores surrounding whitespace', () => {
    expect(ids(matchProducts(LIST, { search: '   tent   ' }))).toEqual(['tent-basecamp-2'])
  })

  it('returns everything for an empty search', () => {
    expect(matchProducts(LIST, { search: '' })).toHaveLength(4)
    expect(matchProducts(LIST, { search: '   ' })).toHaveLength(4)
  })

  it('returns nothing when nothing matches', () => {
    expect(matchProducts(LIST, { search: 'kayak' })).toEqual([])
  })
})

describe('category and search together', () => {
  it('narrows within the selected category', () => {
    expect(ids(matchProducts(LIST, { category: 'Footwear', search: 'trail' }))).toEqual([
      'shoe-approach-trail',
    ])
  })

  it('returns nothing when the search matches outside the category', () => {
    expect(matchProducts(LIST, { category: 'Shelter', search: 'jacket' })).toEqual([])
  })
})
