// Cart state. Only the product id and quantity get saved, so the cart data
// stays small and prices never go stale.
import { loadCart, saveCart } from './storage.js'

export function getCart() {
  return loadCart()
}

export function addToCart(id) {
  const cart = loadCart()
  const existing = cart.find((item) => item.id === id)

  if (existing) {
    existing.qty += 1
  } else {
    cart.push({ id, qty: 1 })
  }

  saveCart(cart)
  return cart
}

export function removeFromCart(id) {
  const cart = loadCart().filter((item) => item.id !== id)
  saveCart(cart)
  return cart
}

export function getCartCount() {
  return loadCart().reduce((total, item) => total + item.qty, 0)
}
