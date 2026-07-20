import './css/style.css'
import {
  loadProducts,
  findProduct,
  getCategories,
  filterByCategory,
} from './js/data.js'
import {
  renderCatalog,
  renderModalContent,
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
const modal = document.querySelector('#product-modal')
const modalContent = document.querySelector('#modal-content')

// True when the page was loaded straight onto a product URL, so there is no
// history entry to go back to when the modal closes.
let deepLinked = window.location.hash.startsWith('#/product/')
// The product id whose card opened the modal. Stored as an id rather than the
// element itself because the catalog is re-rendered underneath the modal, which
// detaches the original node.
let modalTriggerId = null
// Set on close, consumed by router() once the catalog has been re-rendered.
let pendingFocusId = null

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

function router() {
  const hash = window.location.hash || '#/'

  if (hash.startsWith('#/product/')) {
    const id = hash.replace('#/product/', '')
    const product = findProduct(id)

    // The catalog stays rendered underneath the modal.
    view.innerHTML = renderCatalog(
      filterByCategory(activeCategory),
      getCategories(),
      activeCategory
    )

    if (product) {
      openModal(product)
    } else {
      closeModal()
      view.innerHTML = `<div class="page"><h1>Product Not Found</h1>
        <p><a class="link" href="#/">Back to the shop</a></p></div>`
    }
  } else if (hash === '#/cart') {
    closeModal()
    view.innerHTML = renderCart(getCartLines(), getSubtotal())
  } else if (hash === '#/checkout') {
    closeModal()
    view.innerHTML = renderCheckout(getCartLines(), getSubtotal())
  } else {
    closeModal()
    view.innerHTML = renderCatalog(
      filterByCategory(activeCategory),
      getCategories(),
      activeCategory
    )
  }

  window.scrollTo(0, 0)
  updateCartCount()

  // Return focus to the card that opened the modal, now that the catalog has
  // been re-rendered and the original link node replaced.
  if (pendingFocusId) {
    const link = view.querySelector(`a[href="#/product/${pendingFocusId}"]`)
    if (link) link.focus()
    pendingFocusId = null
  }
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

    const label = addButton.querySelector('.btn-label')
    label.textContent = 'Added'
    setTimeout(() => {
      label.textContent = 'Add to Cart'
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

  // Remember which card opened the modal so focus can go back to it. The id is
  // stored rather than the element, because router() replaces view.innerHTML
  // and detaches the node before the modal ever closes.
  view.addEventListener('click', (event) => {
    const productLink = event.target.closest('a[href^="#/product/"]')
    if (productLink) {
      modalTriggerId = productLink.getAttribute('href').replace('#/product/', '')
    }
  })

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
    if (!window.location.hash.startsWith('#/product/')) {
      // router() closed the modal while navigating elsewhere. Leave focus alone.
      modalTriggerId = null
      return
    }

    pendingFocusId = modalTriggerId
    modalTriggerId = null

    if (deepLinked) {
      deepLinked = false
      window.location.hash = '#/'
    } else {
      history.back()
    }
  })

  router()
}

start()
