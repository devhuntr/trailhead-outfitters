import './css/style.css'
import {
  loadProducts,
  findProduct,
  findProducts,
  getProducts,
  getCategories,
} from './js/data.js'
import {
  renderCatalog,
  renderResults,
  resultCountText,
  renderModalContent,
  renderCart,
  renderCheckout,
  renderConfirmation,
  renderErrorSummary,
} from './js/render.js'
import { validateOrder, hasErrors, ORDER_FIELDS } from './js/validate.js'
import {
  addToCart,
  removeFromCart,
  updateQty,
  clearCart,
  getCartCount,
  getCartLines,
  getSubtotal,
} from './js/cart.js'

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

// Pending "Added" -> "Add to Cart" label resets, keyed by button. A WeakMap so
// buttons discarded by a re-render do not leak.
const resetTimers = new WeakMap()

const view = document.querySelector('#view')
const modal = document.querySelector('#product-modal')
const modalContent = document.querySelector('#modal-content')
const announcer = document.querySelector('#cart-announcer')

// All view state lives in the query string, so any view is linkable and
// survives a refresh: ?view=cart, ?category=Footwear&search=boot&product=<id>
function readState() {
  const params = new URLSearchParams(window.location.search)

  return {
    view: params.get('view') || 'catalog',
    product: params.get('product'),
    category: params.get('category') || 'All',
    search: params.get('search') || '',
  }
}

function buildUrl(updates) {
  const params = new URLSearchParams(window.location.search)

  Object.entries(updates).forEach(([key, value]) => {
    if (value === null || value === '') params.delete(key)
    else params.set(key, value)
  })

  const query = params.toString()
  return query ? `${window.location.pathname}?${query}` : window.location.pathname
}

function navigate(updates, { replace = false } = {}) {
  const url = buildUrl(updates)

  if (replace) window.history.replaceState({}, '', url)
  else window.history.pushState({}, '', url)

  router()
}

// True when the page was loaded straight onto a product URL, so there is no
// history entry to go back to when the modal closes.
let deepLinked = new URLSearchParams(window.location.search).has('product')
// The product id whose card opened the modal. Stored as an id rather than the
// element itself because the catalog is re-rendered underneath the modal, which
// detaches the original node.
let modalTriggerId = null
// Set on close, consumed by router() once the catalog has been re-rendered.
let pendingFocusId = null
// Debounce handle for the search box.
let searchTimer = null

function updateCartCount() {
  document.querySelector('#cart-count').textContent = getCartCount()
}

function openModal(product) {
  modalContent.innerHTML = renderModalContent(product)
  if (!modal.open) modal.showModal()
}

function closeModal() {
  if (modal.open) modal.close()
}

// Swaps only the grid and the result count, so the search input keeps focus and
// caret position while the shopper is typing.
function updateResults() {
  const state = readState()
  const matches = findProducts(state)
  const total = getProducts().length

  const grid = document.querySelector('#grid')
  const count = document.querySelector('#result-count')
  if (!grid || !count) return

  grid.innerHTML = renderResults(matches, total, state)
  count.textContent = resultCountText(matches.length, total)
}

function router() {
  const state = readState()

  if (state.view === 'cart') {
    closeModal()
    view.innerHTML = renderCart(getCartLines(), getSubtotal())
  } else if (state.view === 'checkout') {
    closeModal()
    view.innerHTML = renderCheckout(getCartLines(), getSubtotal())
  } else {
    const product = state.product ? findProduct(state.product) : null

    if (state.product && !product) {
      closeModal()
      view.innerHTML = `<div class="page"><h1>Product Not Found</h1>
        <p><a class="link" href="/">Back to the shop</a></p></div>`
    } else {
      // The catalog stays rendered underneath the modal.
      view.innerHTML = renderCatalog(
        findProducts(state),
        getCategories(),
        getProducts().length,
        state
      )

      if (product) openModal(product)
      else closeModal()
    }
  }

  window.scrollTo(0, 0)
  updateCartCount()

  // Return focus to the card that opened the modal, now that the catalog has
  // been re-rendered and the original link node replaced.
  if (pendingFocusId) {
    const link = view.querySelector(
      `.card-name a[href*="product=${pendingFocusId}"],
       .btn-card-link[href*="product=${pendingFocusId}"]`
    )
    if (link) link.focus()
    pendingFocusId = null
  }
}

// The fill animation drives the label swap so the two can never drift apart.
// With reduced motion the animation never runs, so the label swaps immediately.
function playAddedFeedback(button) {
  const label = button.querySelector('.btn-label')

  // Screen readers get the same confirmation the animation gives sighted users.
  const card = button.closest('.card, .detail')
  const heading = card && card.querySelector('.card-name, h1')
  const productName = heading ? heading.textContent.trim() : 'Item'
  const sizeSelect = document.querySelector('#size-select')
  const sizeNote = sizeSelect && sizeSelect.value ? `, size ${sizeSelect.value}` : ''
  announcer.textContent = `${productName}${sizeNote} added to cart`

  const showAdded = () => {
    label.textContent = 'Added'
    button.classList.remove('is-adding')
    // Clear any pending reset so a rapid second click cannot revert the label
    // early, while the sweep from that second click is still running.
    clearTimeout(resetTimers.get(button))
    resetTimers.set(
      button,
      setTimeout(() => {
        label.textContent = 'Add to Cart'
      }, 900)
    )
  }

  if (prefersReducedMotion.matches) {
    showAdded()
    return
  }

  // Removing the class and forcing a reflow restarts the sweep from the left
  // when the button is clicked again mid-animation.
  button.classList.remove('is-adding')
  void button.offsetWidth
  button.classList.add('is-adding')
  button.addEventListener('animationend', showAdded, { once: true })
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
    const sizeSelect = document.querySelector('#size-select')
    const size = sizeSelect && sizeSelect.value ? sizeSelect.value : null

    addToCart(addButton.dataset.add, size)
    updateCartCount()
    playAddedFeedback(addButton)
    return
  }

  // Jump from a summary entry straight to the field it describes.
  const gotoButton = event.target.closest('[data-goto]')
  if (gotoButton) {
    const input = document.querySelector(`[name="${gotoButton.dataset.goto}"]`)
    if (input) input.focus()
    return
  }

  const filterButton = event.target.closest('[data-category]')
  if (filterButton) {
    const category = filterButton.dataset.category
    navigate({ category: category === 'All' ? null : category })
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

// Internal links are plain hrefs so they work without JS and can be opened in a
// new tab, but a normal click is handled in place via the History API.
function handleLinkClick(event) {
  const link = event.target.closest('a[href^="?"], a[href="/"]')
  if (!link) return

  // Let the browser handle modified clicks and anything already cancelled.
  if (event.defaultPrevented) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  if (event.button !== 0) return

  const href = link.getAttribute('href')

  // Remember which card opened the modal so focus can return to it later.
  const params = new URLSearchParams(href.split('?')[1] || '')
  if (params.has('product')) modalTriggerId = params.get('product')

  event.preventDefault()
  window.history.pushState({}, '', href)
  router()
}

function handleSearchInput(event) {
  if (event.target.id !== 'search-input') return

  const { value } = event.target
  clearTimeout(searchTimer)

  // Debounced, and replaceState rather than pushState, so typing a query does
  // not bury the previous page under one history entry per keystroke.
  searchTimer = setTimeout(() => {
    window.history.replaceState({}, '', buildUrl({ search: value.trim() }))
    updateResults()
  }, 250)
}

function handleSubmit(event) {
  // The search box filters as you type; Enter should not reload the page.
  if (event.target.id === 'search-form') {
    event.preventDefault()
    return
  }

  if (event.target.id !== 'order-form') return
  event.preventDefault()

  const form = event.target
  const values = Object.fromEntries(new FormData(form).entries())
  const errors = validateOrder(values)

  showErrors(form, errors)

  if (hasErrors(errors)) {
    // Focus the summary rather than the first bad field, so a screen reader
    // hears the full list of problems before landing on any one of them.
    form.querySelector('#form-error').focus()
    return
  }

  clearCart()
  view.innerHTML = renderConfirmation(values.name.trim())
  updateCartCount()
}

// Paints validation results onto the form: a summary at the top, a message
// under each bad field, and aria-invalid for assistive tech.
function showErrors(form, errors) {
  const summary = form.querySelector('#form-error')
  summary.innerHTML = renderErrorSummary(errors)
  summary.hidden = !hasErrors(errors)

  ORDER_FIELDS.forEach((field) => {
    const input = form.querySelector(`[name="${field}"]`)
    const message = form.querySelector(`#error-${field}`)
    if (!input || !message) return

    if (errors[field]) {
      input.setAttribute('aria-invalid', 'true')
      message.textContent = errors[field]
    } else {
      input.removeAttribute('aria-invalid')
      message.textContent = ''
    }
  })
}

async function start() {
  try {
    await loadProducts()
  } catch {
    view.innerHTML =
      '<div class="page"><h1>Something went wrong</h1><p>The product list could not be loaded.</p></div>'
    return
  }

  // Link interception is document-level so it covers the header nav, the
  // catalog, and anything rendered inside the modal.
  document.addEventListener('click', handleLinkClick)

  view.addEventListener('click', handleClick)
  view.addEventListener('input', handleSearchInput)
  view.addEventListener('submit', handleSubmit)
  window.addEventListener('popstate', router)

  // One click listener for the modal: the close button, the backdrop, and the
  // shared cart/size handlers. The dialog element itself is the backdrop area,
  // so a click landing directly on it means the user missed the content.
  modal.addEventListener('click', (event) => {
    if (event.target === modal || event.target.closest('[data-close-modal]')) {
      closeModal()
      return
    }
    handleClick(event)
  })

  // Sized products start with Add to Cart disabled until a size is picked.
  modal.addEventListener('change', (event) => {
    if (event.target.id !== 'size-select') return

    const addButton = modal.querySelector('[data-add]')
    addButton.disabled = event.target.value === ''
  })

  // Fires for Esc, the close button, and backdrop clicks alike.
  modal.addEventListener('close', () => {
    if (!readState().product) {
      // router() closed the modal while navigating elsewhere. Leave focus alone.
      modalTriggerId = null
      return
    }

    pendingFocusId = modalTriggerId
    modalTriggerId = null

    if (deepLinked) {
      // Nothing to go back to, so drop the product param in place.
      deepLinked = false
      navigate({ product: null }, { replace: true })
    } else {
      window.history.back()
    }
  })

  router()
}

start()
