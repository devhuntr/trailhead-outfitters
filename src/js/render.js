// Builds the HTML for the catalog.

export function renderFilters(categories, activeCategory) {
  return categories
    .map((category) => {
      const isActive = category === activeCategory ? ' is-active' : ''
      return `<button class="filter${isActive}" data-category="${category}">${category}</button>`
    })
    .join('')
}

export function renderProductCard(product) {
  const price = product.price.toFixed(2)
  const soldOut = !product.inStock

  return `
    <article class="card">
      <div class="card-image">${product.category}</div>
      <div class="card-body">
        <p class="card-category">${product.category}</p>
        <h3 class="card-name">${product.name}</h3>
        <p class="card-desc">${product.description}</p>
        <div class="card-meta">
          <span class="card-price">$${price}</span>
          <span class="card-rating">${product.rating} / 5</span>
        </div>
        <button
          class="btn-add"
          data-id="${product.id}"
          ${soldOut ? 'disabled' : ''}
        >${soldOut ? 'Out of Stock' : 'Add to Cart'}</button>
      </div>
    </article>
  `
}

export function renderProductGrid(products) {
  if (products.length === 0) {
    return '<p class="empty">No gear in this category yet.</p>'
  }
  return products.map(renderProductCard).join('')
}
