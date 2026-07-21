// Cart logic. I only save the id, size, and quantity so the saved data stays
// small and the price is never out of date.
import { loadCart, saveCart } from './storage.js'
import { findProduct } from './data.js'

// A cart line is identified by product AND size, so the same boot in a 9 and a
// 10 are two separate lines. Unsized products use null.
function sameLine(item, id, size) {
  return item.id === id && item.size === size
}

export function getCart() {
  return loadCart()
}

export function addToCart(id, size = null) {
  const cart = loadCart()
  const line = cart.find((item) => sameLine(item, id, size))

  if (line) {
    line.qty += 1
  } else {
    cart.push({ id, size, qty: 1 })
  }

  saveCart(cart)
}

export function removeFromCart(id, size = null) {
  const cart = loadCart().filter((item) => !sameLine(item, id, size))
  saveCart(cart)
}

export function updateQty(id, size, change) {
  const cart = loadCart()
  const line = cart.find((item) => sameLine(item, id, size))
  if (!line) return

  line.qty += change

  if (line.qty < 1) {
    removeFromCart(id, size)
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
      return { product, size: item.size, qty: item.qty }
    })
    .filter((line) => line !== null)
}

export function getSubtotal() {
  return getCartLines().reduce(
    (total, line) => total + line.product.price * line.qty,
    0
  )
}
