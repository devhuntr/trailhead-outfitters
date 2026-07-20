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

// Pure so it can be tested without a DOM: the caller passes the list in.
// Category and search stack, so "Footwear" + "trail" narrows within Footwear.
export function matchProducts(list, { category = 'All', search = '' } = {}) {
  const query = search.trim().toLowerCase()

  return list.filter((product) => {
    if (category !== 'All' && product.category !== category) {
      return false
    }

    if (!query) return true

    return (
      product.name.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query)
    )
  })
}

// Convenience wrapper over the module's loaded products.
export function findProducts(options) {
  return matchProducts(products, options)
}
