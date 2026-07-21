// Checkout form validation, kept separate from the DOM so it can be tested
// directly and so main.js only deals with displaying the results.

export const ORDER_FIELDS = ['name', 'email', 'address', 'city', 'zip']

export const FIELD_LABELS = {
  name: 'Full name',
  email: 'Email',
  address: 'Shipping address',
  city: 'City',
  zip: 'Zip code',
}

// Returns { fieldName: message } for every field that failed, so the form can
// show all problems at once instead of revealing them one submit at a time.
export function validateOrder(values) {
  const errors = {}

  const get = (field) => (values[field] ?? '').trim()

  const name = get('name')
  const email = get('email')
  const address = get('address')
  const city = get('city')
  const zip = get('zip')

  if (!name) {
    errors.name = 'Please enter your full name.'
  }

  if (!email) {
    errors.email = 'Please enter your email address.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Please enter a valid email address, like name@example.com.'
  }

  if (!address) {
    errors.address = 'Please enter your shipping address.'
  }

  if (!city) {
    errors.city = 'Please enter your city.'
  }

  if (!zip) {
    errors.zip = 'Please enter your zip code.'
  } else if (!/^\d{5}$/.test(zip)) {
    errors.zip = 'Zip code needs to be exactly 5 numbers, like 84604.'
  }

  return errors
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0
}
