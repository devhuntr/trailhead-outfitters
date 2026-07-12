// Builds the HTML for each view.

function money(amount) {
  return '$' + amount.toFixed(2)
}

export function renderFilters(categories, active) {
  return categories
    .map((category) => {
      const activeClass = category === active ? ' is-active' : ''
      return `<button class="filter${activeClass}" data-category="${category}">${category}</button>`
    })
    .join('')
}

function productCard(product) {
  const soldOut = !product.inStock

  return `
    <article class="card">
      <a class="card-image" href="#/product/${product.id}">${product.category}</a>
      <div class="card-body">
        <p class="card-category">${product.category}</p>
        <h3 class="card-name">
          <a href="#/product/${product.id}">${product.name}</a>
        </h3>
        <p class="card-desc">${product.description}</p>
        <div class="card-meta">
          <span class="card-price">${money(product.price)}</span>
          <span class="card-rating">${product.rating} / 5</span>
        </div>
        <button class="btn" data-add="${product.id}" ${soldOut ? 'disabled' : ''}>
          ${soldOut ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </article>
  `
}

export function renderCatalog(products, categories, active) {
  const grid =
    products.length === 0
      ? '<p class="empty">No gear in this category yet.</p>'
      : products.map(productCard).join('')

  return `
    <section class="hero">
      <h1>Gear Up For The Trail</h1>
      <p>Tested equipment for hiking, camping, and climbing.</p>
    </section>

    <div class="page">
      <h2>Shop All Gear</h2>
      <div class="filters" id="filters">${renderFilters(categories, active)}</div>
      <div class="grid">${grid}</div>
    </div>
  `
}

export function renderDetail(product) {
  if (!product) {
    return `<div class="page"><h2>Product Not Found</h2>
      <p><a class="link" href="#/">Back to the shop</a></p></div>`
  }

  const soldOut = !product.inStock

  return `
    <div class="page">
      <p><a class="link" href="#/">Back to the shop</a></p>
      <div class="detail">
        <div class="detail-image">${product.category}</div>
        <div class="detail-info">
          <p class="card-category">${product.category}</p>
          <h2>${product.name}</h2>
          <p class="detail-price">${money(product.price)}</p>
          <p>${product.description}</p>
          <ul class="specs">
            <li><strong>Rating:</strong> ${product.rating} out of 5</li>
            <li><strong>Availability:</strong> ${soldOut ? 'Out of stock' : 'In stock'}</li>
            <li><strong>Item number:</strong> ${product.id}</li>
          </ul>
          <button class="btn btn-wide" data-add="${product.id}" ${soldOut ? 'disabled' : ''}>
            ${soldOut ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  `
}

export function renderCart(lines, subtotal) {
  if (lines.length === 0) {
    return `
      <div class="page">
        <h2>Your Cart</h2>
        <p class="empty">Your cart is empty.</p>
        <p><a class="link" href="#/">Back to the shop</a></p>
      </div>
    `
  }

  const rows = lines
    .map(
      (line) => `
      <li class="cart-row">
        <div class="cart-thumb">${line.product.category}</div>
        <div class="cart-details">
          <h3>${line.product.name}</h3>
          <p>${money(line.product.price)} each</p>
        </div>
        <div class="stepper">
          <button data-step="-1" data-id="${line.product.id}">-</button>
          <span>${line.qty}</span>
          <button data-step="1" data-id="${line.product.id}">+</button>
        </div>
        <p class="cart-line-total">${money(line.product.price * line.qty)}</p>
        <button class="remove" data-remove="${line.product.id}">Remove</button>
      </li>
    `
    )
    .join('')

  return `
    <div class="page">
      <h2>Your Cart</h2>
      <ul class="cart-list">${rows}</ul>
      <div class="cart-summary">
        <p class="subtotal">Subtotal: <strong>${money(subtotal)}</strong></p>
        <a class="btn btn-link" href="#/checkout">Checkout</a>
      </div>
    </div>
  `
}

export function renderCheckout(lines, subtotal) {
  if (lines.length === 0) {
    return `
      <div class="page">
        <h2>Checkout</h2>
        <p class="empty">You need something in your cart before you can check out.</p>
        <p><a class="link" href="#/">Back to the shop</a></p>
      </div>
    `
  }

  const summary = lines
    .map(
      (line) =>
        `<li><span>${line.product.name} x ${line.qty}</span>
         <span>${money(line.product.price * line.qty)}</span></li>`
    )
    .join('')

  return `
    <div class="page">
      <h2>Checkout</h2>
      <div class="checkout">
        <form class="order-form" id="order-form" novalidate>
          <label>
            Full name
            <input type="text" name="name" required />
          </label>
          <label>
            Email
            <input type="email" name="email" required />
          </label>
          <label>
            Shipping address
            <input type="text" name="address" required />
          </label>
          <div class="form-row">
            <label>
              City
              <input type="text" name="city" required />
            </label>
            <label>
              Zip code
              <input type="text" name="zip" required pattern="\\d{5}" />
            </label>
          </div>
          <p class="form-error" id="form-error"></p>
          <button class="btn btn-wide" type="submit">Place Order</button>
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
      <h2>Order Placed</h2>
      <p>Thanks, ${name}. Your gear is on the way.</p>
      <p><a class="link" href="#/">Keep shopping</a></p>
    </div>
  `
}
