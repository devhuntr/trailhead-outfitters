// Small helper for reading and writing localStorage.
const CART_KEY = 'trailhead-cart'

export function loadCart() {
  try {
    const saved = localStorage.getItem(CART_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    // If the saved data is corrupted, start over with an empty cart.
    return []
  }
}

export function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items))
}
