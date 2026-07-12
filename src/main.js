import './css/style.css'
import { getCategories, filterByCategory } from './js/data.js'
import { renderFilters, renderProductGrid } from './js/render.js'
import { addToCart, getCartCount } from './js/cart.js'

let activeCategory = 'All'

function buildPage() {
  const categories = getCategories()

  document.querySelector('#app').innerHTML = `
    <header class="site-header">
      <a class="logo" href="/">Trailhead Outfitters</a>
      <nav class="site-nav">
        <a href="/">Shop</a>
        <a href="/">Cart (<span id="cart-count">0</span>)</a>
      </nav>
    </header>

    <section class="hero">
      <h1>Gear Up For The Trail</h1>
      <p>Tested equipment for hiking, camping, and climbing.</p>
    </section>

    <main class="catalog">
      <div class="catalog-head">
        <h2>Shop All Gear</h2>
        <div class="filters" id="filters">
          ${renderFilters(categories, activeCategory)}
        </div>
      </div>
      <div class="grid" id="grid"></div>
    </main>

    <footer class="site-footer">
      <p>&copy; ${new Date().getFullYear()} Trailhead Outfitters</p>
    </footer>
  `
}

function updateCartCount() {
  document.querySelector('#cart-count').textContent = getCartCount()
}

function updateGrid() {
  const products = filterByCategory(activeCategory)
  document.querySelector('#grid').innerHTML = renderProductGrid(products)
}

function handleFilterClick(event) {
  const button = event.target.closest('.filter')
  if (!button) return

  activeCategory = button.dataset.category
  document.querySelectorAll('.filter').forEach((filter) => {
    filter.classList.toggle('is-active', filter.dataset.category === activeCategory)
  })
  updateGrid()
}

function handleGridClick(event) {
  const button = event.target.closest('.btn-add')
  if (!button) return

  addToCart(button.dataset.id)
  updateCartCount()

  button.textContent = 'Added'
  setTimeout(() => {
    button.textContent = 'Add to Cart'
  }, 900)
}

buildPage()
updateGrid()
updateCartCount()

document.querySelector('#filters').addEventListener('click', handleFilterClick)
document.querySelector('#grid').addEventListener('click', handleGridClick)
