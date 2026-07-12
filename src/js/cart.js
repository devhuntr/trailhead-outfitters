// Cart logic. I only save the id and quantity so the saved data stays small
// and the price is never out of date.
import { loadCart, saveCart } from './storage.js'
import { findProduct } from './data.js'

export function getCart() {
  return loadCart()
}

export function addToCart(id) {
  const cart = loadCart()
  const line = cart.find((item) => item.id === id)

  if (line) {
    line.qty += 1
  } else {
    cart.push({ id, qty: 1 })
  }

  saveCart(cart)
}

export function removeFromCart(id) {
  const cart = loadCart().filter((item) => item.id !== id)
  saveCart(cart)
}

export function updateQty(id, change) {
  const cart = loadCart()
  const line = cart.find((item) => item.id === id)
  if (!line) return

  line.qty += change

  if (line.qty < 1) {
    removeFromCart(id)
    return
  }

  saveCart(cart)
}

export function clearCart() {
  saveCart([])
}

export function getCartCount() {
  return loadCart().reduce((total, item) => total + item.qty, 0)
}

// Match the saved ids back up with the full product info so we can show
// names and prices.
export function getCartLines() {
  return loadCart()
    .map((item) => {
      const product = findProduct(item.id)
      if (!product) return null
      return { product, qty: item.qty }
    })
    .filter((line) => line !== null)
}

export function getSubtotal() {
  return getCartLines().reduce(
    (total, line) => total + line.product.price * line.qty,
    0
  )
}
