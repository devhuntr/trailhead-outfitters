// Builds the HTML for each view.
import { ORDER_FIELDS, FIELD_LABELS } from './validate.js'

function money(amount) {
  return '$' + amount.toFixed(2)
}

// Product data is ours, but the search query comes from the user and lands in
// both element text and an attribute value, so it has to be escaped.
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Every link carries the current filter state, so closing a product returns to
// the same filtered catalog the shopper was looking at.
function withParams(extra = {}, state = {}) {
  const params = new URLSearchParams()

  if (state.category && state.category !== 'All') params.set('category', state.category)
  if (state.search) params.set('search', state.search)

  Object.entries(extra).forEach(([key, value]) => {
    if (value === null || value === '') params.delete(key)
    else params.set(key, value)
  })

  const query = params.toString()
  return query ? `?${query}` : '/'
}

export function renderFilters(categories, active) {
  return categories
    .map((category) => {
      const isActive = category === active
      return `<button class="filter${isActive ? ' is-active' : ''}"
        data-category="${escapeHtml(category)}"
        aria-pressed="${isActive}">${escapeHtml(category)}</button>`
    })
    .join('')
}

function productCard(product, state) {
  const soldOut = !product.inStock
  const href = withParams({ product: product.id }, state)

  // A sized product cannot be added straight from the catalog, because the size
  // picker only exists in the modal. Send the shopper there to choose one.
  const action =
    product.sizes && !soldOut
      ? `<a class="btn btn-card-link" href="${href}">
           <span class="btn-label">Select Size</span>
         </a>`
      : `<button class="btn" data-add="${product.id}" ${soldOut ? 'disabled' : ''}>
           <span class="btn-label">${soldOut ? 'Out of Stock' : 'Add to Cart'}</span>
         </button>`

  return `
    <article class="card">
      <a class="card-image" href="${href}" tabindex="-1" aria-hidden="true">${product.category}</a>
      <div class="card-body">
        <p class="card-category">${product.category}</p>
        <h3 class="card-name">
          <a href="${href}">${product.name}</a>
        </h3>
        <p class="card-desc">${product.description}</p>
        <div class="card-meta">
          <span class="card-price">${money(product.price)}</span>
          <span class="card-rating" aria-label="Rated ${product.rating} out of 5">${product.rating} / 5</span>
        </div>
        ${action}
      </div>
    </article>
  `
}

// The grid and the result count are updated together as the shopper types, so
// they are built here rather than inline in renderCatalog.
export function renderResults(products, total, state) {
  if (products.length === 0) {
    const query = state.search
      ? ` matching “${escapeHtml(state.search)}”`
      : ''
    return `<p class="empty">No gear${query} in this category yet.</p>`
  }

  return products.map((product) => productCard(product, state)).join('')
}

export function resultCountText(shown, total) {
  if (shown === total) {
    return `Showing all ${total} items`
  }
  return `Showing ${shown} of ${total} items`
}

export function renderCatalog(products, categories, total, state) {
  return `
    <section class="hero">
      <h1>Gear Up For The Trail</h1>
      <p>Tested equipment for hiking, camping, and climbing.</p>
    </section>

    <div class="page">
      <h2>Shop All Gear</h2>

      <div class="toolbar">
        <form class="search" role="search" id="search-form" autocomplete="off">
          <label class="visually-hidden" for="search-input">Search gear</label>
          <input
            type="search"
            id="search-input"
            name="search"
            class="search-input"
            placeholder="Search gear…"
            value="${escapeHtml(state.search)}"
            aria-describedby="result-count"
          />
        </form>

        <div class="filters" id="filters" role="group" aria-label="Filter by category">
          ${renderFilters(categories, state.category)}
        </div>
      </div>

      <p class="result-count" id="result-count" role="status" aria-live="polite">
        ${resultCountText(products.length, total)}
      </p>

      <div class="grid" id="grid">${renderResults(products, total, state)}</div>
    </div>
  `
}

export function renderModalContent(product) {
  const soldOut = !product.inStock

  const sizeField = product.sizes
    ? `
      <div class="size-field">
        <label for="size-select">Size</label>
        <select id="size-select" name="size">
          <option value="">Choose a size</option>
          ${product.sizes.map((size) => `<option value="${size}">${size}</option>`).join('')}
        </select>
      </div>
    `
    : ''

  return `
    <button class="modal-close" type="button" data-close-modal aria-label="Close">&times;</button>
    <div class="detail">
      <div class="detail-image">${product.category}</div>
      <div class="detail-info">
        <p class="card-category">${product.category}</p>
        <h1 id="modal-title">${product.name}</h1>
        <p class="detail-price">${money(product.price)}</p>
        <p>${product.description}</p>
        <ul class="specs">
          <li><strong>Rating:</strong> ${product.rating} out of 5</li>
          <li><strong>Availability:</strong> ${soldOut ? 'Out of stock' : 'In stock'}</li>
          <li><strong>Item number:</strong> ${product.id}</li>
        </ul>
        ${sizeField}
        <button class="btn btn-wide" data-add="${product.id}"
          ${soldOut || product.sizes ? 'disabled' : ''}>
          <span class="btn-label">${soldOut ? 'Out of Stock' : 'Add to Cart'}</span>
        </button>
      </div>
    </div>
  `
}

export function renderCart(lines, subtotal) {
  if (lines.length === 0) {
    return `
      <div class="page">
        <h1>Your Cart</h1>
        <p class="empty">Your cart is empty.</p>
        <p><a class="link" href="/">Back to the shop</a></p>
      </div>
    `
  }

  const rows = lines
    .map((line) => {
      const sizeAttr = line.size ?? ''
      const sizeLabel = line.size ? `<p class="cart-size">Size ${line.size}</p>` : ''

      return `
      <li class="cart-row">
        <div class="cart-thumb">${line.product.category}</div>
        <div class="cart-details">
          <h3>${line.product.name}</h3>
          ${sizeLabel}
          <p>${money(line.product.price)} each</p>
        </div>
        <div class="stepper">
          <button data-step="-1" data-id="${line.product.id}" data-size="${sizeAttr}"
            aria-label="Decrease quantity of ${line.product.name}">-</button>
          <span>${line.qty}</span>
          <button data-step="1" data-id="${line.product.id}" data-size="${sizeAttr}"
            aria-label="Increase quantity of ${line.product.name}">+</button>
        </div>
        <p class="cart-line-total">${money(line.product.price * line.qty)}</p>
        <button class="remove" data-remove="${line.product.id}" data-size="${sizeAttr}"
          aria-label="Remove ${line.product.name} from cart">Remove</button>
      </li>
    `
    })
    .join('')

  return `
    <div class="page">
      <h1>Your Cart</h1>
      <ul class="cart-list">${rows}</ul>
      <div class="cart-summary">
        <p class="subtotal">Subtotal: <strong>${money(subtotal)}</strong></p>
        <a class="btn btn-link" href="?view=checkout">Checkout</a>
      </div>
    </div>
  `
}

// The error message sits outside the label on purpose: a wrapping label would
// fold the error text into the input's accessible name.
function orderField(field, { type = 'text', autocomplete, inputmode } = {}) {
  return `
    <div class="field">
      <label for="checkout-${field}">${FIELD_LABELS[field]}</label>
      <input
        type="${type}"
        id="checkout-${field}"
        name="${field}"
        ${autocomplete ? `autocomplete="${autocomplete}"` : ''}
        ${inputmode ? `inputmode="${inputmode}"` : ''}
        required
        aria-describedby="error-${field}"
      />
      <p class="field-error" id="error-${field}"></p>
    </div>
  `
}

// A summary above the form, so the shopper sees every problem at once and can
// jump straight to any of them.
export function renderErrorSummary(errors) {
  const failed = ORDER_FIELDS.filter((field) => errors[field])
  if (failed.length === 0) return ''

  const items = failed
    .map(
      (field) => `
      <li>
        <button type="button" class="summary-link" data-goto="${field}">
          ${FIELD_LABELS[field]}: ${escapeHtml(errors[field])}
        </button>
      </li>`
    )
    .join('')

  const noun = failed.length === 1 ? 'problem' : 'problems'

  return `
    <p class="form-summary-title">
      Please fix ${failed.length} ${noun} before placing your order
    </p>
    <ul class="form-summary-list">${items}</ul>
  `
}

export function renderCheckout(lines, subtotal) {
  if (lines.length === 0) {
    return `
      <div class="page">
        <h1>Checkout</h1>
        <p class="empty">You need something in your cart before you can check out.</p>
        <p><a class="link" href="/">Back to the shop</a></p>
      </div>
    `
  }

  const summary = lines
    .map((line) => {
      const sizeLabel = line.size ? ` (Size ${line.size})` : ''
      return `<li><span>${line.product.name}${sizeLabel} x ${line.qty}</span>
         <span>${money(line.product.price * line.qty)}</span></li>`
    })
    .join('')

  return `
    <div class="page">
      <h1>Checkout</h1>
      <div class="checkout">
        <form class="order-form" id="order-form" novalidate>
          <div class="form-summary" id="form-error" role="alert" tabindex="-1" hidden></div>

          ${orderField('name', { autocomplete: 'name' })}
          ${orderField('email', { type: 'email', autocomplete: 'email' })}
          ${orderField('address', { autocomplete: 'street-address' })}

          <div class="form-row">
            ${orderField('city', { autocomplete: 'address-level2' })}
            ${orderField('zip', { autocomplete: 'postal-code', inputmode: 'numeric' })}
          </div>

          <button class="btn btn-wide" type="submit">
            <span class="btn-label">Place Order</span>
          </button>
        </form>

        <aside class="order-summary">
          <h3>Order Summary</h3>
          <ul>${summary}</ul>
          <p class="subtotal">Total: <strong>${money(subtotal)}</strong></p>
        </aside>
      </div>
    </div>
  `
}

export function renderConfirmation(name) {
  return `
    <div class="page confirmation">
      <svg class="check" viewBox="0 0 52 52" role="img"
        aria-label="Order confirmed" focusable="false">
        <circle class="check-circle" cx="26" cy="26" r="24" />
        <path class="check-mark" d="M14 27 l8 8 l16 -16" />
      </svg>
      <h1>Order Placed</h1>
      <p>Thanks, ${escapeHtml(name)}. Your gear is on the way.</p>
      <p><a class="link" href="/">Keep shopping</a></p>
    </div>
  `
}
