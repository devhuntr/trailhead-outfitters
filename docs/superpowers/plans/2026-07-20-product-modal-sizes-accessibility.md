# Product Modal, Size Selection, and Accessibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the standalone product detail page with an accessible native `<dialog>` modal, add data-driven size selection for footwear, animate the Add to Cart button, and fix the accessibility defects found during rubric grading.

**Architecture:** The existing hash router stays the single source of truth — `#/product/{id}` renders the catalog and opens the modal over it, so deep links, refresh, and the back button work unchanged. Cart lines are re-keyed from `id` to `id + size` so the same product in two sizes becomes two independent lines. All animation is CSS keyframes driven by a class toggle, with a `prefers-reduced-motion` path that skips motion without losing information.

**Tech Stack:** Vanilla JS (ES modules), Vite 8, Vitest (new dev dependency, test-only). No runtime dependencies.

## Global Constraints

- Vanilla JS and ES modules only. No framework, no runtime dependencies.
- The size selector must remain a native `<select>` element — it is what satisfies the Drop-down Menu rubric criterion.
- `#/product/{id}` must keep transferring the product id through the URL — it is what satisfies the URL Parameters rubric criterion.
- Unsized products use `size: null`, never `undefined` or `""`, so there is one code path.
- Every animation must have a `@media (prefers-reduced-motion: reduce)` fallback that preserves the information the motion conveyed.
- Contrast target is WCAG AA 4.5:1 for normal text. Approved palette value: `--color-orange: #c74600`.
- Each task must leave the app in a working state.

---

### Task 1: Size-keyed cart with Vitest coverage

The riskiest change, done first and under test. Cart lines gain a `size` field and every cart function is re-keyed on `id + size`. Call sites are updated in the same task so the app keeps working — no product has sizes yet, so every line is `size: null` and behavior is externally unchanged.

**Files:**
- Modify: `package.json` (add vitest + test scripts)
- Modify: `src/js/storage.js` (migrate old carts)
- Modify: `src/js/cart.js` (re-key on id + size)
- Modify: `src/js/render.js:103-122` (cart rows carry data-size)
- Modify: `src/js/main.js:76-87` (pass size to cart functions)
- Create: `tests/cart.test.js`

**Interfaces:**
- Consumes: nothing (first task)
- Produces:
  - `addToCart(id, size = null)` → void
  - `removeFromCart(id, size = null)` → void
  - `updateQty(id, size, change)` → void
  - `getCartLines()` → `Array<{ product: Product, size: string|null, qty: number }>`
  - `getCartCount()` → number, `getSubtotal()` → number, `clearCart()` → void
  - `loadCart()` → `Array<{ id: string, size: string|null, qty: number }>`

- [ ] **Step 1: Install Vitest and add test scripts**

```bash
npm install --save-dev vitest
```

Then edit `package.json` scripts to:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 2: Write the failing tests**

Create `tests/cart.test.js`. Note the two mocks: `localStorage` does not exist in Node, and `data.js` is mocked so tests never touch `fetch`.

```js
import { describe, it, expect, beforeEach, vi } from 'vitest'

const PRODUCTS = [
  { id: 'boot-ridgeline', name: 'Ridgeline Hiking Boots', price: 100, category: 'Footwear' },
  { id: 'tent-basecamp-2', name: 'Basecamp 2 Tent', price: 250, category: 'Shelter' },
]

vi.mock('../src/js/data.js', () => ({
  findProduct: (id) => PRODUCTS.find((p) => p.id === id),
}))

const {
  addToCart, removeFromCart, updateQty, clearCart,
  getCartCount, getCartLines, getSubtotal,
} = await import('../src/js/cart.js')

const { loadCart } = await import('../src/js/storage.js')

const CART_KEY = 'trailhead-cart'

beforeEach(() => {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  }
})

describe('size-keyed cart lines', () => {
  it('creates two lines for the same product in different sizes', () => {
    addToCart('boot-ridgeline', '9')
    addToCart('boot-ridgeline', '10')

    const lines = getCartLines()
    expect(lines).toHaveLength(2)
    expect(lines.map((l) => l.size)).toEqual(['9', '10'])
  })

  it('increments one line when the same product and size is added twice', () => {
    addToCart('boot-ridgeline', '9')
    addToCart('boot-ridgeline', '9')

    const lines = getCartLines()
    expect(lines).toHaveLength(1)
    expect(lines[0].qty).toBe(2)
  })

  it('removes only the targeted size', () => {
    addToCart('boot-ridgeline', '9')
    addToCart('boot-ridgeline', '10')
    removeFromCart('boot-ridgeline', '9')

    const lines = getCartLines()
    expect(lines).toHaveLength(1)
    expect(lines[0].size).toBe('10')
  })

  it('decrementing to zero removes only that size', () => {
    addToCart('boot-ridgeline', '9')
    addToCart('boot-ridgeline', '10')
    updateQty('boot-ridgeline', '9', -1)

    const lines = getCartLines()
    expect(lines).toHaveLength(1)
    expect(lines[0].size).toBe('10')
  })
})

describe('unsized products', () => {
  it('adds, increments, and removes with a null size', () => {
    addToCart('tent-basecamp-2')
    addToCart('tent-basecamp-2')
    expect(getCartCount()).toBe(2)

    const lines = getCartLines()
    expect(lines).toHaveLength(1)
    expect(lines[0].size).toBeNull()

    removeFromCart('tent-basecamp-2')
    expect(getCartLines()).toHaveLength(0)
  })

  it('keeps a sized and an unsized product on separate lines', () => {
    addToCart('boot-ridgeline', '9')
    addToCart('tent-basecamp-2')
    expect(getCartLines()).toHaveLength(2)
  })
})

describe('totals', () => {
  it('sums mixed sized and unsized lines', () => {
    addToCart('boot-ridgeline', '9')   // 100
    addToCart('boot-ridgeline', '10')  // 100
    addToCart('tent-basecamp-2')       // 250

    expect(getSubtotal()).toBe(450)
    expect(getCartCount()).toBe(3)
  })

  it('clearCart empties everything', () => {
    addToCart('boot-ridgeline', '9')
    clearCart()
    expect(getCartLines()).toHaveLength(0)
    expect(getSubtotal()).toBe(0)
  })

  it('skips lines whose product no longer exists', () => {
    localStorage.setItem(CART_KEY, JSON.stringify([{ id: 'deleted-item', size: null, qty: 2 }]))
    expect(getCartLines()).toHaveLength(0)
  })
})

describe('migration of pre-size carts', () => {
  it('normalizes entries with no size field to null', () => {
    localStorage.setItem(CART_KEY, JSON.stringify([{ id: 'boot-ridgeline', qty: 3 }]))

    const cart = loadCart()
    expect(cart[0].size).toBeNull()
    expect(cart[0].qty).toBe(3)
  })

  it('returns an empty cart for corrupt data', () => {
    localStorage.setItem(CART_KEY, 'not json{{')
    expect(loadCart()).toEqual([])
  })

  it('returns an empty cart when stored data is not an array', () => {
    localStorage.setItem(CART_KEY, JSON.stringify({ id: 'boot-ridgeline' }))
    expect(loadCart()).toEqual([])
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — the size-keyed tests fail because `addToCart` ignores its second argument and lines have no `size` field.

- [ ] **Step 4: Migrate `loadCart` in `src/js/storage.js`**

Replace the whole file:

```js
// Small helper for reading and writing localStorage.
const CART_KEY = 'trailhead-cart'

export function loadCart() {
  try {
    const saved = localStorage.getItem(CART_KEY)
    if (!saved) return []

    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed)) return []

    // Carts saved before sizes existed have no size field. Spreading after the
    // default leaves an existing size untouched and fills in null otherwise.
    return parsed.map((item) => ({ size: null, ...item }))
  } catch {
    // If the saved data is corrupted, start over with an empty cart.
    return []
  }
}

export function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items))
}
```

- [ ] **Step 5: Re-key `src/js/cart.js` on id + size**

Replace the whole file:

```js
// Cart logic. I only save the id, size, and quantity so the saved data stays
// small and the price is never out of date.
import { loadCart, saveCart } from './storage.js'
import { findProduct } from './data.js'

// A cart line is identified by product AND size, so the same boot in a 9 and a
// 10 are two separate lines. Unsized products use null.
function sameLine(item, id, size) {
  return item.id === id && item.size === size
}

export function getCart() {
  return loadCart()
}

export function addToCart(id, size = null) {
  const cart = loadCart()
  const line = cart.find((item) => sameLine(item, id, size))

  if (line) {
    line.qty += 1
  } else {
    cart.push({ id, size, qty: 1 })
  }

  saveCart(cart)
}

export function removeFromCart(id, size = null) {
  const cart = loadCart().filter((item) => !sameLine(item, id, size))
  saveCart(cart)
}

export function updateQty(id, size, change) {
  const cart = loadCart()
  const line = cart.find((item) => sameLine(item, id, size))
  if (!line) return

  line.qty += change

  if (line.qty < 1) {
    removeFromCart(id, size)
    return
  }

  saveCart(cart)
}

export function clearCart() {
  saveCart([])
}

export function getCartCount() {
  return loadCart().reduce((total, item) => total + item.qty, 0)
}

// Match the saved ids back up with the full product info so we can show
// names and prices.
export function getCartLines() {
  return loadCart()
    .map((item) => {
      const product = findProduct(item.id)
      if (!product) return null
      return { product, size: item.size, qty: item.qty }
    })
    .filter((line) => line !== null)
}

export function getSubtotal() {
  return getCartLines().reduce(
    (total, line) => total + line.product.price * line.qty,
    0
  )
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all 12 tests green.

- [ ] **Step 7: Update cart row markup in `src/js/render.js`**

In `renderCart`, replace the `rows` mapping (currently lines 103-122) so each control carries both id and size, and sized lines show their size:

```js
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
          <button data-step="-1" data-id="${line.product.id}" data-size="${sizeAttr}">-</button>
          <span>${line.qty}</span>
          <button data-step="1" data-id="${line.product.id}" data-size="${sizeAttr}">+</button>
        </div>
        <p class="cart-line-total">${money(line.product.price * line.qty)}</p>
        <button class="remove" data-remove="${line.product.id}" data-size="${sizeAttr}">Remove</button>
      </li>
    `
    })
    .join('')
```

In `renderCheckout`, update the `summary` mapping so the order summary shows sizes too:

```js
  const summary = lines
    .map((line) => {
      const sizeLabel = line.size ? ` (Size ${line.size})` : ''
      return `<li><span>${line.product.name}${sizeLabel} x ${line.qty}</span>
         <span>${money(line.product.price * line.qty)}</span></li>`
    })
    .join('')
```

- [ ] **Step 8: Pass size through the click handler in `src/js/main.js`**

Add this helper above `handleClick`:

```js
// data-size is "" for unsized products; the cart uses null for those.
function readSize(element) {
  return element.dataset.size ? element.dataset.size : null
}
```

Then update the stepper and remove branches inside `handleClick`:

```js
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
```

- [ ] **Step 9: Add the cart size style to `src/css/style.css`**

Add after the `.cart-details p` rule:

```css
.cart-size {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-forest);
}
```

- [ ] **Step 10: Verify the app still works**

Run: `npm run dev`
Open the app, add a few products, change quantities, remove one, and check out. Behavior should be identical to before — no product has sizes yet.
Expected: no console errors; cart totals correct.

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json tests/cart.test.js src/js/storage.js src/js/cart.js src/js/render.js src/js/main.js src/css/style.css
git commit -m "feat: key cart lines by product and size, with Vitest coverage"
```

---

### Task 2: Accessibility contrast fixes

CSS-only, independent of everything else. Fixes the two measured contrast failures.

**Files:**
- Modify: `src/css/style.css:6` (orange token)
- Modify: `src/css/style.css:188` (placeholder opacity)

**Interfaces:**
- Consumes: nothing
- Produces: `--color-orange: #c74600` for all later tasks

- [ ] **Step 1: Darken the orange token**

In the `:root` block, replace the orange line:

```css
  --color-orange: #c74600; /* buttons and highlights - 4.88:1 on white */
```

Measured: 4.88:1 with white text (buttons), 4.69:1 as text on `--color-canvas`. Both clear the 4.5:1 AA threshold. The previous `#ff5a00` measured 3.13:1 and failed.

- [ ] **Step 2: Raise the placeholder text opacity**

In the shared `.card-image, .detail-image, .cart-thumb` rule, change:

```css
  opacity: 0.8;
```

Measured: `#1b3022` at 0.8 over `--color-stone` gives 6.94:1. At the previous 0.55 it measured 3.33:1 and failed.

- [ ] **Step 3: Verify in the browser**

Run: `npm run dev`
Open DevTools, run a Lighthouse accessibility audit on the catalog page.
Expected: the "Background and foreground colors do not have a sufficient contrast ratio" audit no longer fails.

- [ ] **Step 4: Commit**

```bash
git add src/css/style.css
git commit -m "fix: darken orange and placeholder text to meet WCAG AA contrast"
```

---

### Task 3: Product modal via native `<dialog>`

Replaces the full-page product view. `renderDetail` is deleted; the router opens the modal instead.

**Files:**
- Modify: `index.html` (add the dialog element)
- Modify: `src/js/render.js` (replace `renderDetail` with `renderModalContent`)
- Modify: `src/js/main.js` (modal open/close + routing)
- Modify: `src/css/style.css` (modal styles)

**Interfaces:**
- Consumes: `findProduct(id)` from `data.js`
- Produces: `renderModalContent(product)` → HTML string for the dialog body

- [ ] **Step 1: Add the dialog element to `index.html`**

Immediately after the closing `</div>` of `#app`, before the `<script>` tag:

```html
    <dialog id="product-modal" class="modal" aria-labelledby="modal-title">
      <div id="modal-content"></div>
    </dialog>
```

- [ ] **Step 2: Replace `renderDetail` with `renderModalContent` in `src/js/render.js`**

Delete the entire `renderDetail` function and put this in its place:

```js
export function renderModalContent(product) {
  const soldOut = !product.inStock

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
        <button class="btn btn-wide" data-add="${product.id}" ${soldOut ? 'disabled' : ''}>
          <span class="btn-label">${soldOut ? 'Out of Stock' : 'Add to Cart'}</span>
        </button>
      </div>
    </div>
  `
}
```

Note the `<span class="btn-label">` wrapper — Task 5's fill animation needs it to sit above the animated layer. Add the same wrapper to the catalog card button in `productCard`:

```js
        <button class="btn" data-add="${product.id}" ${soldOut ? 'disabled' : ''}>
          <span class="btn-label">${soldOut ? 'Out of Stock' : 'Add to Cart'}</span>
        </button>
```

- [ ] **Step 3: Wire the modal into `src/js/main.js`**

Update the import from `render.js` — swap `renderDetail` for `renderModalContent`:

```js
import {
  renderCatalog,
  renderModalContent,
  renderCart,
  renderCheckout,
  renderConfirmation,
} from './js/render.js'
```

Add these module-level constants below `const view = ...`:

```js
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
```

Add the open/close helpers above `router`:

```js
function openModal(product) {
  modalContent.innerHTML = renderModalContent(product)
  if (!modal.open) modal.showModal()
}

function closeModal() {
  if (modal.open) modal.close()
}
```

Replace the product branch of `router` and add a `closeModal()` to the other branches:

```js
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
```

- [ ] **Step 4: Handle close, backdrop click, and focus return in `src/js/main.js`**

Add inside `start()`, before `router()`:

```js
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
```

Both navigation paths fire `hashchange`, so `router()` runs next and consumes `pendingFocusId` after the catalog is back in the DOM.

- [ ] **Step 5: Style the modal in `src/css/style.css`**

Append to the file:

```css
/* Modal */

.modal {
  width: min(900px, calc(100vw - 2rem));
  padding: 2rem;
  border: 2px solid var(--color-forest);
  background: var(--color-canvas);
  color: var(--color-charcoal);
}

.modal::backdrop {
  background: rgba(27, 48, 34, 0.55);
}

.modal .detail {
  margin-top: 0.5rem;
}

.modal h1 {
  font-family: 'Oswald', system-ui, sans-serif;
  font-weight: 600;
  font-size: 1.75rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin: 0 0 0.25rem;
  color: var(--color-forest);
}

.modal-close {
  position: absolute;
  top: 0.5rem;
  right: 0.75rem;
  width: 40px;
  height: 40px;
  font-size: 1.75rem;
  line-height: 1;
  background: none;
  border: none;
  color: var(--color-forest);
  cursor: pointer;
}

.modal-close:hover {
  color: var(--color-orange);
}

@media (max-width: 800px) {
  .modal {
    padding: 1.5rem;
  }
}
```

- [ ] **Step 6: Verify modal behavior in the browser**

Run: `npm run dev`

Check each of these:
- Clicking a product card opens the modal and the URL becomes `#/product/{id}`.
- Esc closes it and the URL returns to `#/`.
- The close button and a backdrop click both close it.
- Focus returns to the card link after closing.
- Pasting `http://localhost:5173/#/product/boot-ridgeline` into a fresh tab opens the modal directly.
- The browser back button closes the modal.
- Tab cycles only within the modal while it is open.

Expected: all pass, no console errors.

- [ ] **Step 7: Commit**

```bash
git add index.html src/js/render.js src/js/main.js src/css/style.css
git commit -m "feat: replace product detail page with native dialog modal"
```

---

### Task 4: Size dropdown

Adds the `<select>` that satisfies the Drop-down Menu criterion and wires the chosen size into the cart.

**Files:**
- Modify: `public/data/products.json` (sizes on the boots)
- Modify: `src/js/render.js` (size select in the modal)
- Modify: `src/js/main.js` (enable button on change, pass size to addToCart)
- Modify: `src/css/style.css` (select styles)

**Interfaces:**
- Consumes: `addToCart(id, size)` from Task 1, `renderModalContent(product)` from Task 3
- Produces: `product.sizes?: string[]` as an optional field on product data

- [ ] **Step 1: Add sizes to the boots in `public/data/products.json`**

Add a `sizes` key to the `boot-ridgeline` object only:

```json
  {
    "id": "boot-ridgeline",
    "name": "Ridgeline Hiking Boots",
    "category": "Footwear",
    "price": 139.95,
    "image": "/src/images/boot-ridgeline.jpg",
    "description": "Waterproof mid-cut boots with aggressive grip for rocky terrain.",
    "rating": 4.5,
    "inStock": true,
    "sizes": ["8", "8.5", "9", "9.5", "10", "10.5", "11", "12"]
  },
```

- [ ] **Step 2: Render the select in `renderModalContent`**

In `src/js/render.js`, add this above the `return` in `renderModalContent`:

```js
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
```

Then insert `${sizeField}` between the `</ul>` and the Add to Cart button, and make the button start disabled when sizes exist:

```js
        ${sizeField}
        <button class="btn btn-wide" data-add="${product.id}"
          ${soldOut || product.sizes ? 'disabled' : ''}>
          <span class="btn-label">${soldOut ? 'Out of Stock' : 'Add to Cart'}</span>
        </button>
```

- [ ] **Step 3: Enable the button when a size is chosen, in `src/js/main.js`**

Add inside `start()`:

```js
  // Sized products start with Add to Cart disabled until a size is picked.
  modal.addEventListener('change', (event) => {
    if (event.target.id !== 'size-select') return

    const addButton = modal.querySelector('[data-add]')
    addButton.disabled = event.target.value === ''
  })
```

- [ ] **Step 4: Pass the selected size to `addToCart`**

In `handleClick`, update the add branch to read the select when one is present:

```js
  const addButton = event.target.closest('[data-add]')
  if (addButton) {
    const sizeSelect = document.querySelector('#size-select')
    const size = sizeSelect && sizeSelect.value ? sizeSelect.value : null

    addToCart(addButton.dataset.add, size)
    updateCartCount()
    // Task 5 replaces this label swap with the fill animation.
    const label = addButton.querySelector('.btn-label')
    label.textContent = 'Added'
    setTimeout(() => {
      label.textContent = 'Add to Cart'
    }, 900)
    return
  }
```

- [ ] **Step 5: Style the select in `src/css/style.css`**

Append:

```css
/* Size selector */

.size-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin: 1rem 0;
  max-width: 200px;
}

.size-field label {
  font-weight: 600;
  font-size: 0.9rem;
}

.size-field select {
  padding: 0.7rem;
  font-family: inherit;
  font-size: 1rem;
  border: 2px solid var(--color-forest);
  background: #ffffff;
  color: var(--color-charcoal);
  cursor: pointer;
}

.size-field select:focus {
  outline: 2px solid var(--color-orange);
  outline-offset: 1px;
}
```

- [ ] **Step 6: Verify in the browser**

Run: `npm run dev`

Check:
- The boots modal shows a Size dropdown; no other product does.
- Add to Cart is disabled until a size is selected.
- Adding size 9 then size 10 produces two separate cart rows, each labelled with its size.
- Adding size 9 twice produces one row with quantity 2.
- Removing the size 9 row leaves the size 10 row intact.
- The tent still adds with no size and no dropdown.

Expected: all pass.

- [ ] **Step 7: Run the cart tests to confirm nothing regressed**

Run: `npm test`
Expected: PASS — all 12 tests still green.

- [ ] **Step 8: Commit**

```bash
git add public/data/products.json src/js/render.js src/js/main.js src/css/style.css
git commit -m "feat: add size dropdown for footwear"
```

---

### Task 5: Add to Cart fill animation

Replaces the label-swap timer with a CSS keyframe fill that sweeps left to right, plus a modal entrance animation. Both have reduced-motion fallbacks.

**Files:**
- Modify: `src/css/style.css` (keyframes and reduced-motion guards)
- Modify: `src/js/main.js:57-67` (class toggle + animationend)

**Interfaces:**
- Consumes: `.btn-label` span from Task 3, `.modal` from Task 3
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Add the keyframes and button layer to `src/css/style.css`**

Append:

```css
/* Animation */

@keyframes fill-sweep {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}

@keyframes modal-in {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes backdrop-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.btn {
  position: relative;
  overflow: hidden;
}

/* The fill layer sweeps across the button while the item is added. */
.btn::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--color-forest);
  transform: scaleX(0);
  transform-origin: left;
  pointer-events: none;
}

.btn.is-adding::after {
  animation: fill-sweep 600ms ease-out forwards;
}

/* Keeps the label above the fill layer. */
.btn-label {
  position: relative;
  z-index: 1;
}

.modal[open] {
  animation: modal-in 220ms ease-out;
}

.modal[open]::backdrop {
  animation: backdrop-in 220ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .btn.is-adding::after,
  .modal[open],
  .modal[open]::backdrop {
    animation: none;
  }
}
```

- [ ] **Step 2: Drive the animation from `src/js/main.js`**

Add this module-level constant near the top, below `let activeCategory = 'All'`:

```js
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
```

Then replace the add branch of `handleClick` written in Task 4:

```js
  const addButton = event.target.closest('[data-add]')
  if (addButton) {
    const sizeSelect = document.querySelector('#size-select')
    const size = sizeSelect && sizeSelect.value ? sizeSelect.value : null

    addToCart(addButton.dataset.add, size)
    updateCartCount()
    playAddedFeedback(addButton)
    return
  }
```

And add this function above `handleClick`:

```js
// The fill animation drives the label swap so the two can never drift apart.
// With reduced motion the animation never runs, so the label swaps immediately.
function playAddedFeedback(button) {
  const label = button.querySelector('.btn-label')

  const showAdded = () => {
    label.textContent = 'Added'
    button.classList.remove('is-adding')
    setTimeout(() => {
      label.textContent = 'Add to Cart'
    }, 900)
  }

  if (prefersReducedMotion.matches) {
    showAdded()
    return
  }

  button.classList.add('is-adding')
  button.addEventListener('animationend', showAdded, { once: true })
}
```

- [ ] **Step 3: Verify the animation in the browser**

Run: `npm run dev`

Check:
- Clicking Add to Cart sweeps a dark fill left to right across the button, then the label reads "Added" before reverting.
- The modal fades and scales in; the backdrop fades.
- In DevTools, Rendering panel → "Emulate CSS prefers-reduced-motion: reduce", then click Add to Cart. The label still changes to "Added" with no sweep, and the modal opens with no motion.

Expected: all pass. The reduced-motion check is the important one — it confirms no information is lost when motion is off.

- [ ] **Step 4: Commit**

```bash
git add src/css/style.css src/js/main.js
git commit -m "feat: add fill animation to Add to Cart and modal entrance"
```

---

### Task 6: Remaining accessibility fixes

Heading order, accessible names on icon-only controls, form error announcement, autocomplete, and a live region for cart additions.

**Files:**
- Modify: `index.html` (live region)
- Modify: `src/js/render.js` (headings, aria-labels, form attributes)
- Modify: `src/js/main.js` (announce additions, aria-invalid)
- Modify: `src/css/style.css` (h1 styling, visually-hidden helper)

**Interfaces:**
- Consumes: `playAddedFeedback(button)` from Task 5
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Add the live region to `index.html`**

Inside `#app`, immediately after the closing `</footer>`:

```html
      <p id="cart-announcer" class="visually-hidden" role="status" aria-live="polite"></p>
```

- [ ] **Step 2: Promote page headings to `<h1>` in `src/js/render.js`**

Leave `renderCatalog` alone — its hero already provides the `<h1>` and "Shop All Gear" is correctly an `<h2>` beneath it.

In `renderCart`, change both `<h2>Your Cart</h2>` occurrences (the empty-cart branch and the populated branch) to `<h1>Your Cart</h1>`.

In `renderCheckout`, change both `<h2>Checkout</h2>` occurrences to `<h1>Checkout</h1>`.

In `renderConfirmation`, change `<h2>Order Placed</h2>` to `<h1>Order Placed</h1>`.

- [ ] **Step 3: Name the icon-only controls in `src/js/render.js`**

In the `renderCart` rows mapping, update the stepper and remove buttons to carry accessible names:

```js
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
```

- [ ] **Step 4: Fix the checkout form in `src/js/render.js`**

Replace the `<form>` block in `renderCheckout` with:

```js
        <form class="order-form" id="order-form" novalidate>
          <label>
            Full name
            <input type="text" name="name" autocomplete="name" required />
          </label>
          <label>
            Email
            <input type="email" name="email" autocomplete="email" required />
          </label>
          <label>
            Shipping address
            <input type="text" name="address" autocomplete="street-address" required />
          </label>
          <div class="form-row">
            <label>
              City
              <input type="text" name="city" autocomplete="address-level2" required />
            </label>
            <label>
              Zip code
              <input type="text" name="zip" autocomplete="postal-code"
                inputmode="numeric" required pattern="\\d{5}" />
            </label>
          </div>
          <p class="form-error" id="form-error" role="alert"></p>
          <button class="btn btn-wide" type="submit">
            <span class="btn-label">Place Order</span>
          </button>
        </form>
```

- [ ] **Step 5: Mark invalid fields and announce additions in `src/js/main.js`**

Replace `handleSubmit` with a version that sets `aria-invalid` and focuses the first bad field:

```js
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

  // Clear previous invalid marks before revalidating.
  form.querySelectorAll('input').forEach((input) => {
    input.removeAttribute('aria-invalid')
  })

  const fail = (message, fieldName) => {
    error.textContent = message
    const input = form.querySelector(`[name="${fieldName}"]`)
    input.setAttribute('aria-invalid', 'true')
    input.focus()
  }

  if (!name || !email || !address || !city || !zip) {
    const firstEmpty = ['name', 'email', 'address', 'city', 'zip'].find(
      (field) => !data.get(field).trim()
    )
    fail('Please fill out every field.', firstEmpty)
    return
  }

  if (!email.includes('@') || !email.includes('.')) {
    fail('Please enter a valid email address.', 'email')
    return
  }

  if (!/^\d{5}$/.test(zip)) {
    fail('Zip code needs to be 5 numbers.', 'zip')
    return
  }

  error.textContent = ''
  clearCart()
  view.innerHTML = renderConfirmation(name)
  updateCartCount()
}
```

Add the announcer constant below the other `document.querySelector` constants:

```js
const announcer = document.querySelector('#cart-announcer')
```

And announce inside `playAddedFeedback` — add as its first line:

```js
function playAddedFeedback(button) {
  const label = button.querySelector('.btn-label')

  // Screen readers get the same confirmation the animation gives sighted users.
  const card = button.closest('.card, .detail')
  const productName = card
    ? card.querySelector('.card-name, h1').textContent.trim()
    : 'Item'
  announcer.textContent = `${productName} added to cart`

  const showAdded = () => {
```

(the rest of the function is unchanged)

- [ ] **Step 6: Add the h1 and visually-hidden styles to `src/css/style.css`**

Change the existing `h2` selector to cover page-level `h1`s too:

```css
h2,
.page h1 {
  font-family: 'Oswald', system-ui, sans-serif;
  font-weight: 600;
  font-size: 1.75rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin: 0 0 1rem;
  color: var(--color-forest);
}
```

The `.hero h1` rule appears later in the file and has equal specificity, so it still wins for the hero — leave it alone.

Then append the helper:

```css
/* Visible to screen readers only. */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

- [ ] **Step 7: Run a Lighthouse accessibility audit**

Run: `npm run build && npm run preview`
Open the preview URL, then DevTools → Lighthouse → Accessibility only → Analyze. Run it on the catalog, the cart (with items), and the checkout page.

Expected: 100, or at minimum 90+ on every page. If anything fails, fix it before committing and note what it was.

- [ ] **Step 8: Run the test suite**

Run: `npm test`
Expected: PASS — all 12 tests green.

- [ ] **Step 9: Commit**

```bash
git add index.html src/js/render.js src/js/main.js src/css/style.css
git commit -m "fix: heading order, control names, form announcement, and live region"
```

---

## Final Verification

After all six tasks, confirm the rubric criteria this plan targets:

- [ ] **Drop-down Menu** — the boots modal renders a native `<select>` with eight sizes.
- [ ] **CSS Animation** — Add to Cart sweeps a fill left to right; the modal fades and scales in; both respect `prefers-reduced-motion`.
- [ ] **Accessibility** — Lighthouse 90%+ on catalog, cart, and checkout.
- [ ] **URL Parameters** — `#/product/boot-ridgeline` pasted into a fresh tab opens that product's modal.
- [ ] **Local Storage** — a cart with two boot sizes survives a page refresh.
- [ ] **Data Fetching** — products still load from `/data/products.json`.
- [ ] **Module Organization** — `data.js`, `render.js`, `cart.js`, `storage.js`, `main.js` all still have single responsibilities.
- [ ] **Form** — checkout still validates empty fields, email shape, and a 5-digit zip, and now announces errors.
- [ ] **Responsive** — check the modal, size field, and cart rows at 375px, 768px, and 1440px.
