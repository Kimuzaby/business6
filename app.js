// ─── CART STATE ───
let cart = JSON.parse(localStorage.getItem('cart_flores')) || [];

const cartSidebar   = document.getElementById('cart-sidebar');
const cartOverlay   = document.getElementById('cart-overlay');
const cartItems     = document.getElementById('cart-items');
const cartCount     = document.getElementById('cart-count');
const cartTotal     = document.getElementById('cart-total');
const btnWA         = document.getElementById('btn-whatsapp');

window.addEventListener('DOMContentLoaded', renderCart);

function toggleCart() {
  cartSidebar.classList.toggle('active');
  cartOverlay.classList.toggle('active');
}

function toggleDelivery() {
  const method = document.getElementById('delivery-method').value;
  const extra  = document.getElementById('delivery-extra');
  if (extra) extra.style.display = method === 'delivery' ? 'block' : 'none';
}

function addToCart(id, name, price) {
  const existing = cart.find(i => i.id === id);
  if (existing) { existing.quantity += 1; }
  else { cart.push({ id, name, price, quantity: 1 }); }
  save();
  if (!cartSidebar.classList.contains('active')) toggleCart();
}

function updateQuantity(id, delta) {
  const idx = cart.findIndex(i => i.id === id);
  if (idx > -1) {
    cart[idx].quantity += delta;
    if (cart[idx].quantity <= 0) cart.splice(idx, 1);
  }
  save();
}

function emptyCart() {
  if (!confirm('¿Vaciar el carrito?')) return;
  cart = [];
  save();
}

function save() {
  localStorage.setItem('cart_flores', JSON.stringify(cart));
  renderCart();
}

function renderCart() {
  if (!cartItems) return;
  cartItems.innerHTML = '';
  let total = 0, count = 0;

  if (cart.length === 0) {
    cartItems.innerHTML = `
      <div style="text-align:center;padding:2rem;color:var(--muted-fg);">
        <div style="font-size:2rem;margin-bottom:.5rem;">🌸</div>
        <p style="font-size:.85rem;">Tu carrito está vacío</p>
      </div>`;
    if (btnWA) { btnWA.disabled = true; btnWA.style.opacity = '0.5'; }
  } else {
    if (btnWA) { btnWA.disabled = false; btnWA.style.opacity = '1'; }
    cart.forEach(item => {
      const sub = item.price * item.quantity;
      total += sub; count += item.quantity;
      cartItems.innerHTML += `
        <div class="cart-item">
          <div class="cart-item-title">${item.name}</div>
          <div class="cart-item-controls">
            <div class="qty-controls">
              <button class="qty-btn" onclick="updateQuantity('${item.id}', -1)">−</button>
              <span style="font-weight:600;font-size:.85rem;">${item.quantity}</span>
              <button class="qty-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
            </div>
            <div class="item-price">$${sub.toFixed(2)}</div>
          </div>
        </div>`;
    });
  }

  if (cartCount) cartCount.textContent = count;
  if (cartTotal) cartTotal.textContent = `$${total.toFixed(2)}`;
}

function sendWhatsApp() {
  const name   = document.getElementById('client-name')?.value?.trim();
  const method = document.getElementById('delivery-method')?.value;
  const addr   = document.getElementById('delivery-address')?.value?.trim();
  const notes  = document.getElementById('order-notes')?.value?.trim();

  if (!cart.length)  { alert('Tu carrito está vacío.'); return; }
  if (!name)         { alert('Por favor ingresa tu nombre.'); return; }
  if (!method)       { alert('Selecciona el método de entrega.'); return; }
  if (method === 'delivery' && !addr) { alert('Por favor ingresa tu dirección de entrega.'); return; }

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const phone = '50370483939';

  let msg = `🌸 *PEDIDO - La Casa de las Flores*\n\n`;
  msg += `*Cliente:* ${name}\n`;
  msg += `*Entrega:* ${method === 'delivery' ? `Delivery` : 'Retiro en tienda'}\n`;
  if (method === 'delivery' && addr) msg += `*Dirección:* ${addr}\n`;
  msg += `\n*Productos:*\n`;
  cart.forEach(i => {
    msg += `• ${i.quantity}x ${i.name} — $${(i.price * i.quantity).toFixed(2)}\n`;
  });
  msg += `\n*TOTAL: $${total.toFixed(2)}*`;
  if (notes) msg += `\n*Notas:* ${notes}`;
  msg += `\n\n¡Gracias! 🌺`;

  const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}