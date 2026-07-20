import { describe, it, expect, beforeEach, vi } from 'vitest'

const PRODUCTS = [
  { id: 'boot-ridgeline', name: 'Ridgeline Hiking Boots', price: 100, category: 'Footwear' },
  { id: 'tent-basecamp-2', name: 'Basecamp 2 Tent', price: 250, category: 'Shelter' },
]

vi.mock('../src/js/data.js', () => ({
  findProduct: (id) => PRODUCTS.find((p) => p.id === id),
}))

const {
  addToCart, removeFromCart, updateQty, clearCart,
  getCartCount, getCartLines, getSubtotal,
} = await import('../src/js/cart.js')

const { loadCart } = await import('../src/js/storage.js')

const CART_KEY = 'trailhead-cart'

beforeEach(() => {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  }
})

describe('size-keyed cart lines', () => {
  it('creates two lines for the same product in different sizes', () => {
    addToCart('boot-ridgeline', '9')
    addToCart('boot-ridgeline', '10')

    const lines = getCartLines()
    expect(lines).toHaveLength(2)
    expect(lines.map((l) => l.size)).toEqual(['9', '10'])
  })

  it('increments one line when the same product and size is added twice', () => {
    addToCart('boot-ridgeline', '9')
    addToCart('boot-ridgeline', '9')

    const lines = getCartLines()
    expect(lines).toHaveLength(1)
    expect(lines[0].qty).toBe(2)
  })

  it('removes only the targeted size', () => {
    addToCart('boot-ridgeline', '9')
    addToCart('boot-ridgeline', '10')
    removeFromCart('boot-ridgeline', '9')

    const lines = getCartLines()
    expect(lines).toHaveLength(1)
    expect(lines[0].size).toBe('10')
  })

  it('decrementing to zero removes only that size', () => {
    addToCart('boot-ridgeline', '9')
    addToCart('boot-ridgeline', '10')
    updateQty('boot-ridgeline', '9', -1)

    const lines = getCartLines()
    expect(lines).toHaveLength(1)
    expect(lines[0].size).toBe('10')
  })
})

describe('unsized products', () => {
  it('adds, increments, and removes with a null size', () => {
    addToCart('tent-basecamp-2')
    addToCart('tent-basecamp-2')
    expect(getCartCount()).toBe(2)

    const lines = getCartLines()
    expect(lines).toHaveLength(1)
    expect(lines[0].size).toBeNull()

    removeFromCart('tent-basecamp-2')
    expect(getCartLines()).toHaveLength(0)
  })

  it('keeps a sized and an unsized product on separate lines', () => {
    addToCart('boot-ridgeline', '9')
    addToCart('tent-basecamp-2')
    expect(getCartLines()).toHaveLength(2)
  })
})

describe('totals', () => {
  it('sums mixed sized and unsized lines', () => {
    addToCart('boot-ridgeline', '9')   // 100
    addToCart('boot-ridgeline', '10')  // 100
    addToCart('tent-basecamp-2')       // 250

    expect(getSubtotal()).toBe(450)
    expect(getCartCount()).toBe(3)
  })

  it('clearCart empties everything', () => {
    addToCart('boot-ridgeline', '9')
    clearCart()
    expect(getCartLines()).toHaveLength(0)
    expect(getSubtotal()).toBe(0)
  })

  it('skips lines whose product no longer exists', () => {
    localStorage.setItem(CART_KEY, JSON.stringify([{ id: 'deleted-item', size: null, qty: 2 }]))
    expect(getCartLines()).toHaveLength(0)
  })
})

describe('migration of pre-size carts', () => {
  it('normalizes entries with no size field to null', () => {
    localStorage.setItem(CART_KEY, JSON.stringify([{ id: 'boot-ridgeline', qty: 3 }]))

    const cart = loadCart()
    expect(cart[0].size).toBeNull()
    expect(cart[0].qty).toBe(3)
  })

  it('returns an empty cart for corrupt data', () => {
    localStorage.setItem(CART_KEY, 'not json{{')
    expect(loadCart()).toEqual([])
  })

  it('returns an empty cart when stored data is not an array', () => {
    localStorage.setItem(CART_KEY, JSON.stringify({ id: 'boot-ridgeline' }))
    expect(loadCart()).toEqual([])
  })
})
