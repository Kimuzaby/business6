import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

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

// Proteger la ruta
if (!window.location.pathname.includes('login.html')) {
    onAuthStateChanged(auth, (user) => {
        if (!user) window.location.href = "login.html";
    });
}

// Global scope bindings
window.logout = function() {
    signOut(auth).then(() => {
        window.location.href = "login.html";
    });
};

window.addItemRow = function() {
    const container = document.getElementById('items-container');
    if (!container) return; // Por si estamos en la página de login
    
    const rowId = 'row-' + Date.now();
    
    const rowHTML = `
        <div class="item-row" id="${rowId}">
            <input type="text" class="field-input item-name" placeholder="Ej. Ramo de novia" onchange="window.calculateTotal()">
            <input type="text" class="field-input item-desc" placeholder="Rosas y peonías..." onchange="window.calculateTotal()">
            <input type="number" class="field-input item-qty" placeholder="Cant." value="1" min="1" oninput="window.calculateTotal()">
            <input type="number" class="field-input item-price" placeholder="0.00" step="0.01" oninput="window.calculateTotal()">
            <button type="button" class="btn-remove" onclick="window.removeRow('${rowId}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', rowHTML);
};

window.removeRow = function(rowId) {
    document.getElementById(rowId).remove();
    window.calculateTotal();
};

window.calculateTotal = function() {
    let total = 0;
    const rows = document.querySelectorAll('.item-row');
    
    rows.forEach(row => {
        const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        total += (qty * price);
    });
    
    const totalElement = document.getElementById('grand-total');
    if(totalElement) totalElement.innerText = total.toFixed(2);
    return total.toFixed(2);
};

// Insertar la primera fila al cargar el script en el panel admin
if (!window.location.pathname.includes('login.html')) {
    setTimeout(() => {
        if(document.getElementById('items-container') && document.getElementById('items-container').children.length === 0) {
            window.addItemRow();
        }
    }, 100); // Pequeño retraso para asegurar que el DOM pintó el contenedor
}

window.generateInvoicePDF = async function() {
    const clientName = document.getElementById('client-name').value || 'Cliente General';
    const date = document.getElementById('client-date').value;
    const event = document.getElementById('client-event').value || 'Evento Especial';
    const validity = document.getElementById('client-validity').value;
    const total = window.calculateTotal();

    let itemsHTML = '';
    const rows = document.querySelectorAll('.item-row');
    rows.forEach(row => {
        const name = row.querySelector('.item-name').value;
        const desc = row.querySelector('.item-desc').value;
        const qty = row.querySelector('.item-qty').value;
        const price = parseFloat(row.querySelector('.item-price').value || 0).toFixed(2);
        const subtotal = (qty * price).toFixed(2);

        if (name) {
            itemsHTML += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 15px 0;">
                        <strong style="color:#1a1a1a;">${name}</strong><br>
                        <span style="font-size:11px; color:#666;">${desc}</span>
                    </td>
                    <td style="padding: 15px 0; text-align:center;">${qty}</td>
                    <td style="padding: 15px 0; text-align:right;">$${price}</td>
                    <td style="padding: 15px 0; text-align:right;"><strong>$${subtotal}</strong></td>
                </tr>
            `;
        }
    });

    const element = document.getElementById('pdf-template');
    element.style.display = 'block';

    element.innerHTML = `
        <div style="padding: 50px; font-family: 'Helvetica', sans-serif; color: #333; background: #fff; width: 100%; box-sizing: border-box;">
            <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #f2e7e7; padding-bottom: 20px; margin-bottom: 30px;">
                <div>
                    <h1 style="font-family: 'Georgia', serif; font-size: 26px; margin: 0; color: #1a1a1a;">La Casa de las Flores</h1>
                    <p style="font-size: 11px; color: #8b5cf6; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">Propuesta Floral & Cotización</p>
                </div>
                <div style="text-align: right; font-size: 12px; color: #666;">
                    <p style="margin: 0;"><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</p>
                    <p style="margin: 5px 0 0 0;"><strong>Válido por:</strong> ${validity}</p>
                </div>
            </div>

            <div style="background: #fdf6f6; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <p style="margin: 0; font-size: 14px;">Propuesta preparada para:</p>
                <h2 style="font-family: 'Georgia', serif; font-style: italic; color: #1a1a1a; margin: 5px 0 10px 0;">${clientName}</h2>
                <p style="margin: 0; font-size: 12px; color: #555;"><strong>Evento:</strong> ${event} | <strong>Fecha del evento:</strong> ${date || 'A confirmar'}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 30px;">
                <thead>
                    <tr style="border-bottom: 2px solid #eee; color: #888; text-transform: uppercase; font-size: 10px;">
                        <th style="padding: 10px 0; text-align: left;">Descripción del Arreglo</th>
                        <th style="padding: 10px 0; text-align: center;">Cant.</th>
                        <th style="padding: 10px 0; text-align: right;">Precio Unit.</th>
                        <th style="padding: 10px 0; text-align: right;">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHTML}
                </tbody>
            </table>

            <div style="text-align: right; margin-bottom: 50px;">
                <p style="font-size: 14px; color: #666; margin: 0;">Total Estimado</p>
                <h2 style="font-family: 'Georgia', serif; font-size: 28px; color: #8b5cf6; margin: 5px 0 0 0;">$${total} USD</h2>
            </div>

            <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; font-size: 11px; color: #aaa;">
                <p style="margin: 0 0 5px 0;">Gracias por permitirnos ser parte de tu historia.</p>
                <p style="margin: 0;">@lacasadelasflores_sv | WhatsApp: +503 7048-3939 | Jorge Hernández</p>
            </div>
        </div>
    `;

    const opt = {
        margin:       0,
        filename:     `Cotizacion_${clientName.replace(/ /g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    await html2pdf().set(opt).from(element).save();
    element.style.display = 'none';
};
