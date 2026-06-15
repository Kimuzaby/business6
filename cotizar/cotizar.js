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

    const btn = document.querySelector('.btn-generate');
    const originalText = btn.innerHTML;
    btn.innerHTML = "Generando PDF...";
    btn.disabled = true;

    try {
        // Inicializar jsPDF nativo
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'letter'); // Tamaño carta
        const pageWidth = doc.internal.pageSize.getWidth();

        // 1. Cabecera
        doc.setFont("times", "bold");
        doc.setFontSize(24);
        doc.setTextColor(26, 26, 26);
        doc.text("La Casa de las Flores", 20, 30);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(139, 92, 246); // Color morado aesthetic (#8b5cf6)
        doc.text("PROPUESTA EXCLUSIVA", 20, 36);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, pageWidth - 20, 30, { align: 'right' });
        doc.text(`Válido por: ${validity}`, pageWidth - 20, 36, { align: 'right' });

        doc.setDrawColor(238, 238, 238);
        doc.setLineWidth(0.5);
        doc.line(20, 42, pageWidth - 20, 42);

        // 2. Datos del cliente (Caja de fondo sutil)
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
        doc.text(`Evento: ${event}   |   Fecha: ${date || 'A confirmar'}`, 25, 75);

        // 3. Preparar datos para la tabla dinámica
        const tableData = [];
        const rows = document.querySelectorAll('.item-row');
        rows.forEach(row => {
            const name = row.querySelector('.item-name').value;
            const desc = row.querySelector('.item-desc').value;
            const qty = row.querySelector('.item-qty').value;
            const price = parseFloat(row.querySelector('.item-price').value || 0).toFixed(2);
            const subtotal = (qty * price).toFixed(2);

            if (name) {
                tableData.push([
                    `${name}\n${desc}`,
                    qty,
                    `$${price}`,
                    `$${subtotal}`
                ]);
            }
        });

        // 4. Dibujar tabla (Nativa y sin conflictos)
        doc.autoTable({
            startY: 90,
            head: [['Descripción del Arreglo', 'Cant.', 'Precio Unit.', 'Subtotal']],
            body: tableData,
            theme: 'plain',
            headStyles: {
                textColor: [136, 136, 136],
                fontSize: 9,
                fontStyle: 'bold',
                halign: 'left'
            },
            bodyStyles: {
                fontSize: 10,
                textColor: [51, 51, 51],
            },
            columnStyles: {
                0: { cellWidth: 90 },
                1: { halign: 'center' },
                2: { halign: 'right' },
                3: { halign: 'right', fontStyle: 'bold' }
            },
            alternateRowStyles: {
                fillColor: [250, 250, 250]
            },
            margin: { left: 20, right: 20 }
        });

        // 5. Total Estimado
        const finalY = doc.lastAutoTable.finalY + 15;
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        doc.text("Total Estimado", pageWidth - 20, finalY, { align: 'right' });

        doc.setFont("times", "bold");
        doc.setFontSize(22);
        doc.setTextColor(139, 92, 246);
        doc.text(`$${total} USD`, pageWidth - 20, finalY + 8, { align: 'right' });

        // 6. Footer
        doc.setDrawColor(238, 238, 238);
        doc.line(20, 260, pageWidth - 20, 260);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(153, 153, 153);
        doc.text("Gracias por permitirnos ser parte de tu historia.", pageWidth / 2, 266, { align: 'center' });
        doc.text("@lacasadelasflores_sv | WhatsApp: +503 7048-3939 | Jorge Hernández", pageWidth / 2, 271, { align: 'center' });

        // 7. Descargar
        doc.save(`Cotizacion_${clientName.replace(/ /g, '_')}.pdf`);
        
    } catch (error) {
        console.error("Error nativo PDF:", error);
        alert("Ocurrió un error al generar el documento.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};
