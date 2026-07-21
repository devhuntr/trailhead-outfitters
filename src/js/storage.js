// Small helper for reading and writing localStorage.
const CART_KEY = 'trailhead-cart'

export function loadCart() {
  try {
    const saved = localStorage.getItem(CART_KEY)
    if (!saved) return []

    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed)) return []

    // Carts saved before sizes existed have no size field. Spreading after the
    // default leaves an existing size untouched and fills in null otherwise.
    return parsed.map((item) => ({ size: null, ...item }))
  } catch {
    // If the saved data is corrupted, start over with an empty cart.
    return []
  }
}

export function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items))
}
