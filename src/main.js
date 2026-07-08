import './css/style.css'

// Placeholder home page for now. Catalog, cart, and checkout come later.
document.querySelector('#app').innerHTML = `
  <header class="site-header">
    <a class="logo" href="/">Trailhead Outfitters</a>
    <nav class="site-nav">
      <a href="/">Shop</a>
      <a href="/">Cart</a>
    </nav>
  </header>

  <main class="hero">
    <h1>Trailhead Outfitters</h1>
    <p>Gear up for the trail. Site coming soon.</p>
  </main>

  <footer class="site-footer">
    <p>&copy; ${new Date().getFullYear()} Trailhead Outfitters</p>
  </footer>
`
