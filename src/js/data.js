// Loads the product data and handles looking things up and filtering.
import products from '../data/products.json'

export function getProducts() {
  return products
}

export function getProductById(id) {
  return products.find((product) => product.id === id)
}

export function getCategories() {
  const categories = products.map((product) => product.category)
  return ['All', ...new Set(categories)]
}

export function filterByCategory(category) {
  if (category === 'All') {
    return products
  }
  return products.filter((product) => product.category === category)
}
