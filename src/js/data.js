// Loads the product data and filters it.

const DATA_URL = '/data/products.json'

let products = []

export async function loadProducts() {
  const response = await fetch(DATA_URL)

  if (!response.ok) {
    throw new Error('Could not load products.json')
  }

  products = await response.json()
  return products
}

export function getProducts() {
  return products
}

export function findProduct(id) {
  return products.find((product) => product.id === id)
}

export function getCategories() {
  const names = products.map((product) => product.category)
  return ['All', ...new Set(names)]
}

export function filterByCategory(category) {
  if (category === 'All') {
    return products
  }
  return products.filter((product) => product.category === category)
}
