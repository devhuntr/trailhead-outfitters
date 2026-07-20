# Product Modal, Size Selection, and Accessibility — Design

**Date:** 2026-07-20
**Status:** Approved

## Goal

Replace the standalone product detail page with a modal, add size selection for
footwear, and fix the accessibility defects found during the rubric grading pass.

Three of the changes map directly to graded criteria that currently score zero or
are at risk:

| Criterion | Before | After |
| --- | --- | --- |
| Drop-down Menu | 0 / 5 | 5 / 5 |
| CSS Animation | 0 / 5 | 5 / 5 |
| Accessibility | ~7.5 / 10 | 10 / 10 |
| URL Parameters | 5 / 5 | 5 / 5 (preserved — see below) |

Estimated total: ~82 → ~97.

## Constraints

- Vanilla JS, ES modules, Vite. No framework, no runtime dependencies.
- The modal must not break URL-based data transfer, which is what earns the
  URL Parameters criterion.
- Existing carts in `localStorage` must not break.

---

## 1. Product Modal

### Approach

Native `<dialog>` element, chosen over a custom `<div>` overlay. The browser
supplies focus trapping, Esc-to-close, background inerting, `::backdrop`, and
correct `role="dialog"` semantics. Hand-rolled modals are a common source of
Lighthouse accessibility failures; this avoids that class of bug entirely and
requires less code.

### Structure

A single empty `<dialog id="product-modal">` lives in `index.html` next to
`#view`. `render.js` gains `renderModalContent(product)`, which produces the
markup previously produced by `renderDetail`.

### Routing

The router remains the single source of truth for modal state:

- `#/product/{id}` — render the catalog into `#view`, then `dialog.showModal()`
  with that product's content.
- Any other route — `dialog.close()` if currently open.

Deep links, page refresh, and the browser back button therefore all work with no
special-casing.

Closing the modal calls `history.back()` when the modal was opened by clicking a
product (so back/forward history stays clean), and otherwise sets
`location.hash = '#/'` (the deep-link case, where there is no prior entry).

### Removals

`renderDetail` is deleted, along with the router's full-page product branch.
There is exactly one product rendering path.

### Accessibility

- `aria-labelledby` on the dialog points at the product `<h1>` inside it.
- Focus returns to the originating card link on close.
- A close button with a real accessible name (`aria-label="Close"`), not a bare
  `×` glyph.

---

## 2. Size Selection

### Data

`products.json` gains an optional `sizes` array. Only `boot-ridgeline` has one
initially:

```json
"sizes": ["8", "8.5", "9", "9.5", "10", "10.5", "11", "12"]
```

Data-driven rather than hardcoded by category, so sizes can be added to other
products later without touching JS.

### UI

The modal renders a labelled `<select>` only when `product.sizes` is present. It
opens on a placeholder option:

```html
<label for="size-select">Size</label>
<select id="size-select">
  <option value="">Choose a size</option>
  ...
</select>
```

`Add to Cart` is `disabled` until a real size is chosen; a `change` listener
enables it. Products without sizes are unaffected and add to the cart directly.

This `<select>` is what satisfies the Drop-down Menu criterion — it must remain a
native `<select>`, not a styled button group.

### Cart identity

Cart lines are keyed by `id + size`. Two sizes of the same boot are two rows,
each with an independent quantity.

```js
[{ id: "boot-ridgeline", size: "9",  qty: 1 },
 { id: "boot-ridgeline", size: "10", qty: 2 },
 { id: "tent-basecamp-2", size: null, qty: 1 }]
```

Every function in `cart.js` — `addToCart`, `removeFromCart`, `updateQty`,
`getCartLines` — takes a size alongside the id. The cart row `data-*` attributes
in `render.js` carry both. Sized lines display `Size 9` beneath the product name.

Unsized products use `size: null`, so there is one code path, not two.

### Migration

Carts saved before this change have no `size` field. `loadCart()` normalizes any
entry missing `size` to `size: null` on read. It already swallows corrupt JSON
and returns an empty cart, so no saved state can break the app.

---

## 3. CSS Animation

### Add to Cart fill

On click the button receives `.is-adding`. An `::after` layer sweeps left to
right via `transform: scaleX(0 → 1)` with `transform-origin: left`, reading as a
loading bar filling across the button.

An `animationend` listener — not a `setTimeout` — swaps the label to `Added`,
then reverts. This replaces the current hardcoded 900ms timer in `main.js`, so
the label and the animation cannot drift out of sync.

### Modal entrance

Fade plus slight scale-in on the dialog, with a backdrop fade.

### Reduced motion

Both animations sit inside `@media (prefers-reduced-motion: reduce)` guards that
skip the motion and apply the end state immediately. The `Added` label still
changes, so no information is conveyed by motion alone.

---

## 4. Accessibility Fixes

Contrast ratios below are computed against the WCAG 2.1 relative luminance
formula and the 4.5:1 normal-text threshold.

| Issue | Fix | Result |
| --- | --- | --- |
| `--color-orange: #ff5a00` on white — **3.13:1**, fails | `#c74600` | **4.88:1** on buttons, **4.69:1** as text on canvas |
| Placeholder text `opacity: .55` — **3.33:1**, fails | `opacity: .8` | **6.94:1** |
| Stepper `-` / `+` buttons have no accessible name | `aria-label="Increase quantity of {name}"` | Named |
| Cart, checkout, and confirmation views start at `<h2>` with no `<h1>` (only the catalog hero has one) | Each view's main heading becomes `<h1>` | Sequential |
| Form errors are not announced | `role="alert"` on `#form-error`; `aria-invalid` on failing inputs | Announced |
| Checkout inputs lack `autocomplete` | `name`, `email`, `street-address`, `address-level2`, `postal-code` | Audit passes |
| Cart count updates silently | Visually-hidden `aria-live="polite"` region announcing "{product} added to cart" | Announced |

The single `--color-orange` token change fixes the buttons and the orange
`.card-category` / `.link` text simultaneously — no per-rule edits needed.

The live region also gives the Add to Cart animation a non-visual equivalent.

---

## 5. Testing

The project currently has no tests and no test runner. Vitest will be added as a
single dev dependency (native to Vite, no extra config).

Scope is deliberately narrow — **`cart.js` only**, because the size-keying
rewrite is the one genuinely error-prone piece:

- Adding the same product in two sizes creates two lines.
- Adding the same product in the same size increments one line.
- Decrementing to zero removes only that size, leaving the other intact.
- Unsized products still add, update, and remove correctly.
- Carts saved without a `size` field load as `size: null`.
- `getSubtotal` is correct across mixed sized and unsized lines.

The modal, routing, animations, and contrast changes are verified by driving the
app in a browser rather than by unit test.

---

## Out of Scope

- Real product images (placeholders remain).
- Sizes for products other than the boots.
- Any change to the checkout flow beyond the accessibility fixes listed above.
- Persisting the selected category filter across reloads.
