import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyApqXnIJO8YxbZki879_WliO4w8IaPnccQ",
  authDomain: "la-casa-de-las-flores-6519b.firebaseapp.com",
  projectId: "la-casa-de-las-flores-6519b",
  storageBucket: "la-casa-de-las-flores-6519b.firebasestorage.app",
  messagingSenderId: "276633472408",
  appId: "1:276633472408:web:c3c132939d238f9f282fed"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ─── AUTH GUARD ───
if (!window.location.pathname.includes('login.html')) {
  onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = "login.html";
  });
}

window.logout = function () {
  signOut(auth).then(() => { window.location.href = "login.html"; });
};

// ─── TABS ───
window.switchTab = function (tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('panel-' + tab).classList.add('active');
  if (tab === 'historial') window.loadHistorial();
};

// ─── ITEM ROWS ───
window.addItemRow = function () {
  const container = document.getElementById('items-container');
  if (!container) return;
  const rowId = 'row-' + Date.now();
  container.insertAdjacentHTML('beforeend', `
    <div class="item-row" id="${rowId}">
      <input type="text" class="field-input item-name" placeholder="Ej. Ramo de novia" oninput="window.calculateTotal()">
      <input type="text" class="field-input item-desc" placeholder="Rosas y peonías...">
      <input type="number" class="field-input item-qty" placeholder="1" value="1" min="1" oninput="window.calculateTotal()">
      <input type="number" class="field-input item-price" placeholder="0.00" step="0.01" oninput="window.calculateTotal()">
      <button type="button" class="btn-remove" onclick="window.removeRow('${rowId}')" title="Eliminar">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    </div>
  `);
};

window.removeRow = function (rowId) {
  document.getElementById(rowId)?.remove();
  window.calculateTotal();
};

window.calculateTotal = function () {
  let total = 0;
  document.querySelectorAll('.item-row').forEach(row => {
    const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
    const price = parseFloat(row.querySelector('.item-price').value) || 0;
    total += qty * price;
  });
  const el = document.getElementById('grand-total');
  if (el) el.innerText = total.toFixed(2);
  return total.toFixed(2);
};

// ─── RESET FORM ───
function resetForm() {
  document.getElementById('client-name').value = '';
  document.getElementById('client-date').value = '';
  document.getElementById('client-event').value = '';
  document.getElementById('client-validity').value = '15 días';
  document.getElementById('items-container').innerHTML = '';
  window.addItemRow();
  window.calculateTotal();
}

// ─── FIRESTORE: GUARDAR COTIZACIÓN ───
async function saveCotizacion(data) {
  try {
    await addDoc(collection(db, 'cotizaciones'), {
      ...data,
      createdAt: serverTimestamp()
    });
    await window.updateHistorialCount();
  } catch (e) {
    console.warn('No se pudo guardar en Firestore:', e);
  }
}

// ─── FIRESTORE: CARGAR HISTORIAL ───
window.loadHistorial = async function () {
  const container = document.getElementById('historial-list-container');
  container.innerHTML = `<p style="color:var(--muted-fg);font-size:0.85rem;padding:1rem 0;">Cargando...</p>`;
  try {
    const q = query(collection(db, 'cotizaciones'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    window._allCotizaciones = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    window.renderHistorial();
    window.updateHistorialCount();
  } catch (e) {
    container.innerHTML = `<p style="color:#ef4444;font-size:0.85rem;">Error al cargar. Verifica Firestore.</p>`;
  }
};

window.renderHistorial = function () {
  const search = (document.getElementById('search-historial')?.value || '').toLowerCase();
  const all = window._allCotizaciones || [];
  const filtered = search
    ? all.filter(c =>
        (c.clientName || '').toLowerCase().includes(search) ||
        (c.event || '').toLowerCase().includes(search)
      )
    : all;

  const container = document.getElementById('historial-list-container');

  if (!filtered.length) {
    container.innerHTML = `
      <div class="historial-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        <p style="font-family:var(--font-serif);font-size:1.1rem;color:var(--foreground);">
          ${search ? 'Sin resultados para "' + search + '"' : 'Aún no hay cotizaciones guardadas'}
        </p>
        <p>${search ? 'Intenta con otro nombre.' : 'Las propuestas descargadas aparecerán aquí.'}</p>
      </div>`;
    return;
  }

  const list = document.createElement('div');
  list.className = 'historial-list';

  filtered.forEach(cot => {
    const dateLabel = cot.date ? `Evento: ${formatDate(cot.date)}` : 'Fecha por confirmar';
    const savedLabel = cot.createdAt?.toDate
      ? 'Guardada ' + timeAgo(cot.createdAt.toDate())
      : 'Reciente';

    const card = document.createElement('div');
    card.className = 'historial-card';
    card.innerHTML = `
      <div class="historial-card-left">
        <span class="historial-client">${esc(cot.clientName || 'Cliente')}</span>
        <div class="historial-meta">
          <span>${esc(cot.event || 'Evento especial')}</span>
          <span>·</span>
          <span>${dateLabel}</span>
          <span>·</span>
          <span>${savedLabel}</span>
        </div>
      </div>
      <div class="historial-card-right">
        <span class="historial-total">$${parseFloat(cot.total || 0).toFixed(2)}</span>
        <button class="btn-icon" title="Regenerar PDF" onclick="window.regeneratePDF('${cot.id}')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <button class="btn-icon danger" title="Eliminar" onclick="window.deleteCotizacion('${cot.id}', event)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `;
    list.appendChild(card);
  });

  container.innerHTML = '';
  container.appendChild(list);
};

window.deleteCotizacion = async function (id, e) {
  e.stopPropagation();
  if (!confirm('¿Eliminar esta cotización del historial?')) return;
  try {
    await deleteDoc(doc(db, 'cotizaciones', id));
    window._allCotizaciones = (window._allCotizaciones || []).filter(c => c.id !== id);
    window.renderHistorial();
    window.updateHistorialCount();
  } catch (err) {
    alert('Error al eliminar.');
  }
};

window.updateHistorialCount = async function () {
  const badge = document.getElementById('historial-count');
  if (!badge) return;
  try {
    if (window._allCotizaciones) {
      badge.textContent = window._allCotizaciones.length;
    } else {
      const snapshot = await getDocs(collection(db, 'cotizaciones'));
      badge.textContent = snapshot.size;
    }
  } catch (e) { badge.textContent = '?'; }
};

// ─── REGENERAR PDF desde historial ───
window.regeneratePDF = function (id) {
  const cot = (window._allCotizaciones || []).find(c => c.id === id);
  if (!cot) return;
  buildAndDownloadPDF(cot.clientName, cot.date, cot.event, cot.validity, cot.total, cot.items);
};

// ─── MAIN: GENERAR PDF ───
window.generateInvoicePDF = async function () {
  const clientName = document.getElementById('client-name').value.trim() || 'Cliente General';
  const date = document.getElementById('client-date').value;
  const event = document.getElementById('client-event').value.trim() || 'Evento Especial';
  const validity = document.getElementById('client-validity').value.trim() || '15 días';
  const total = window.calculateTotal();

  // Recoger ítems
  const items = [];
  document.querySelectorAll('.item-row').forEach(row => {
    const name = row.querySelector('.item-name').value.trim();
    const desc = row.querySelector('.item-desc').value.trim();
    const qty = row.querySelector('.item-qty').value;
    const price = parseFloat(row.querySelector('.item-price').value || 0).toFixed(2);
    if (name) items.push({ name, desc, qty, price });
  });

  if (!items.length) {
    alert('Agrega al menos un arreglo antes de descargar.');
    return;
  }

  const btn = document.querySelector('.btn-generate');
  btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg> Generando...';
  btn.disabled = true;

  try {
    buildAndDownloadPDF(clientName, date, event, validity, total, items);

    // Guardar en Firestore
    await saveCotizacion({ clientName, date, event, validity, total, items });

    // Reset del formulario después de descargar
    setTimeout(() => { resetForm(); }, 500);

  } catch (error) {
    console.error('Error PDF:', error);
    alert('Ocurrió un error al generar el documento.');
  } finally {
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Descargar Cotización (PDF)`;
    btn.disabled = false;
  }
};

// ─── CONSTRUCTOR DE PDF ───
function buildAndDownloadPDF(clientName, date, event, validity, total, items) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'letter');
  const pageWidth = doc.internal.pageSize.getWidth();

  // Cabecera
  doc.setFont("times", "bold");
  doc.setFontSize(24);
  doc.setTextColor(26, 26, 26);
  doc.text("La Casa de las Flores", 20, 30);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(139, 92, 246);
  doc.text("PROPUESTA EXCLUSIVA", 20, 36);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-SV')}`, pageWidth - 20, 30, { align: 'right' });
  doc.text(`Válido por: ${validity}`, pageWidth - 20, 36, { align: 'right' });

  doc.setDrawColor(238, 238, 238);
  doc.setLineWidth(0.5);
  doc.line(20, 42, pageWidth - 20, 42);

  // Bloque cliente
  doc.setFillColor(253, 246, 246);
  doc.roundedRect(20, 50, pageWidth - 40, 30, 3, 3, 'F');

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(85, 85, 85);
  doc.text("Propuesta preparada para:", 25, 60);

  doc.setFont("times", "italic");
  doc.setFontSize(18);
  doc.setTextColor(26, 26, 26);
  doc.text(clientName, 25, 68);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(85, 85, 85);
  doc.text(`Evento: ${event}   |   Fecha: ${date ? formatDate(date) : 'A confirmar'}`, 25, 75);

  // Tabla
  const tableData = items.map(item => {
    const subtotal = (parseFloat(item.qty) * parseFloat(item.price)).toFixed(2);
    return [
      `${item.name}${item.desc ? '\n' + item.desc : ''}`,
      item.qty,
      `$${item.price}`,
      `$${subtotal}`
    ];
  });

  doc.autoTable({
    startY: 90,
    head: [['Descripción del Arreglo', 'Cant.', 'Precio Unit.', 'Subtotal']],
    body: tableData,
    theme: 'plain',
    headStyles: { textColor: [136, 136, 136], fontSize: 9, fontStyle: 'bold', halign: 'left' },
    bodyStyles: { fontSize: 10, textColor: [51, 51, 51] },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right', fontStyle: 'bold' }
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: 20, right: 20 }
  });

  // Total
  const finalY = doc.lastAutoTable.finalY + 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text("Total Estimado", pageWidth - 20, finalY, { align: 'right' });

  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.setTextColor(139, 92, 246);
  doc.text(`$${total} USD`, pageWidth - 20, finalY + 8, { align: 'right' });

  // Footer
  doc.setDrawColor(238, 238, 238);
  doc.line(20, 260, pageWidth - 20, 260);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(153, 153, 153);
  doc.text("Gracias por permitirnos ser parte de tu historia.", pageWidth / 2, 266, { align: 'center' });
  doc.text("@lacasadelasflores_sv | WhatsApp: +503 7048-3939 | Jorge Hernández", pageWidth / 2, 271, { align: 'center' });

  doc.save(`Cotizacion_${clientName.replace(/\s+/g, '_')}.pdf`);
}

// ─── HELPERS ───
function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

function timeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'hace un momento';
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} h`;
  if (seconds < 604800) return `hace ${Math.floor(seconds / 86400)} días`;
  return date.toLocaleDateString('es-SV');
}

// ─── INIT: primera fila + count ───
if (!window.location.pathname.includes('login.html')) {
  window._allCotizaciones = null;
  setTimeout(() => {
    const c = document.getElementById('items-container');
    if (c && c.children.length === 0) window.addItemRow();
    window.updateHistorialCount();
  }, 100);
}
