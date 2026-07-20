import './css/style.css'
import {
  loadProducts,
  findProduct,
  getCategories,
  filterByCategory,
} from './js/data.js'
import {
  renderCatalog,
  renderDetail,
  renderCart,
  renderCheckout,
  renderConfirmation,
} from './js/render.js'
import {
  addToCart,
  removeFromCart,
  updateQty,
  clearCart,
  getCartCount,
  getCartLines,
  getSubtotal,
} from './js/cart.js'

let activeCategory = 'All'

const view = document.querySelector('#view')

function updateCartCount() {
  document.querySelector('#cart-count').textContent = getCartCount()
}

function router() {
  const hash = window.location.hash || '#/'

  if (hash.startsWith('#/product/')) {
    const id = hash.replace('#/product/', '')
    view.innerHTML = renderDetail(findProduct(id))
  } else if (hash === '#/cart') {
    view.innerHTML = renderCart(getCartLines(), getSubtotal())
  } else if (hash === '#/checkout') {
    view.innerHTML = renderCheckout(getCartLines(), getSubtotal())
  } else {
    view.innerHTML = renderCatalog(
      filterByCategory(activeCategory),
      getCategories(),
      activeCategory
    )
  }

  window.scrollTo(0, 0)
  updateCartCount()
}

// data-size is "" for unsized products; the cart uses null for those.
function readSize(element) {
  return element.dataset.size ? element.dataset.size : null
}

// One click listener on the view instead of one on every button, because the
// buttons get rebuilt every time the page re-renders.
function handleClick(event) {
  const addButton = event.target.closest('[data-add]')
  if (addButton) {
    addToCart(addButton.dataset.add)
    updateCartCount()
    addButton.textContent = 'Added'
    setTimeout(() => {
      addButton.textContent = 'Add to Cart'
    }, 900)
    return
  }

  const filterButton = event.target.closest('[data-category]')
  if (filterButton) {
    activeCategory = filterButton.dataset.category
    router()
    return
  }

  const stepButton = event.target.closest('[data-step]')
  if (stepButton) {
    updateQty(
      stepButton.dataset.id,
      readSize(stepButton),
      Number(stepButton.dataset.step)
    )
    router()
    return
  }

  const removeButton = event.target.closest('[data-remove]')
  if (removeButton) {
    removeFromCart(removeButton.dataset.remove, readSize(removeButton))
    router()
  }
}

function handleSubmit(event) {
  if (event.target.id !== 'order-form') return
  event.preventDefault()

  const form = event.target
  const data = new FormData(form)
  const name = data.get('name').trim()
  const email = data.get('email').trim()
  const address = data.get('address').trim()
  const city = data.get('city').trim()
  const zip = data.get('zip').trim()
  const error = document.querySelector('#form-error')

  if (!name || !email || !address || !city || !zip) {
    error.textContent = 'Please fill out every field.'
    return
  }

  if (!email.includes('@') || !email.includes('.')) {
    error.textContent = 'Please enter a valid email address.'
    return
  }

  if (!/^\d{5}$/.test(zip)) {
    error.textContent = 'Zip code needs to be 5 numbers.'
    return
  }

  clearCart()
  view.innerHTML = renderConfirmation(name)
  updateCartCount()
}

async function start() {
  try {
    await loadProducts()
  } catch {
    view.innerHTML =
      '<div class="page"><h2>Something went wrong</h2><p>The product list could not be loaded.</p></div>'
    return
  }

  view.addEventListener('click', handleClick)
  view.addEventListener('submit', handleSubmit)
  window.addEventListener('hashchange', router)

  router()
}

start()
