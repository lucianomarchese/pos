import { STORAGE_KEY, createSeed } from './data.js';
import { activeCashSession, applyAction, cashExpected, dashboardStats, priceSale, roundMoney, sum, supplierBalance } from './domain.js';

const app = document.querySelector('#app');
let state;
try {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  state = stored?.version === 1 ? stored : createSeed();
} catch {
  state = createSeed();
}
let view = 'inicio';
let role = sessionStorage.getItem('pos-demo-role') || 'admin';
let cart = [];
let search = '';
let areaFilter = 'Todas';
let modal = null;
let toastTimer;

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const money = (amount) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: state.settings.currency, maximumFractionDigits: 2 }).format(Number(amount || 0));
const date = (value) => value ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const shortDate = (value) => value ? new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short' }).format(new Date(value)) : '—';
const percent = (part, whole) => whole ? Math.min(100, Math.round(part / whole * 100)) : 0;
const productName = (id) => state.products.find((product) => product.id === id)?.name || 'Producto retirado';
const supplierName = (id) => state.suppliers.find((supplier) => supplier.id === id)?.name || 'Sin proveedor';
const employeeName = (id) => state.employees.find((employee) => employee.id === id)?.name || 'Equipo';
const isAdmin = () => role === 'admin';

function notify(message, kind = 'success') {
  const holder = document.querySelector('#toast-holder');
  if (!holder) return;
  holder.innerHTML = `<div class="toast ${kind}"><span>${kind === 'success' ? '✓' : '!'}</span>${esc(message)}</div>`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { if (holder) holder.innerHTML = ''; }, 4200);
}

function dispatch(action, payload, success) {
  try {
    const outcome = applyAction(state, action, payload);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(outcome.state));
    state = outcome.state;
    modal = null;
    render();
    if (success) notify(success);
    return outcome.result;
  } catch (error) {
    notify(error.message || 'No se pudo completar la acción.', 'error');
    return null;
  }
}

const icon = {
  inicio: '◫', ventas: '▦', inventario: '▤', proveedores: '◇', caja: '▣', transacciones: '⇄', equipo: '♙', reportes: '▥', configuracion: '⚙',
};
const nav = [
  ['inicio', 'Inicio'], ['ventas', 'Punto de venta'], ['inventario', 'Inventario'], ['proveedores', 'Proveedores'],
  ['caja', 'Caja'], ['transacciones', 'Transacciones'], ['equipo', 'Equipo'], ['reportes', 'Reportes'], ['configuracion', 'Configuración'],
];

function shell() {
  const labels = { inicio: 'Centro de operaciones', ventas: 'Punto de venta', inventario: 'Inventario', proveedores: 'Proveedores', caja: 'Control de caja', transacciones: 'Transacciones', equipo: 'Equipo y comisiones', reportes: 'Reportes', configuracion: 'Personalización' };
  const logo = state.settings.logoDataUrl && /^data:image\/(png|jpeg|webp);base64,/i.test(state.settings.logoDataUrl)
    ? `<img src="${esc(state.settings.logoDataUrl)}" alt="" />` : null;
  return `
    <div class="app-shell" data-preset="${esc(state.preset)}" style="--accent:${esc(state.settings.accent)}">
      <aside class="sidebar">
        <div class="brand"><div class="brand-mark">${logo || 'P<span>·</span>'}</div><div><strong>POS Studio</strong><small>DEMO INTERACTIVA</small></div></div>
        <div class="workspace-switch"><div class="workspace-avatar">${logo || esc(state.settings.businessName.slice(0, 1))}</div><div><strong>${esc(state.settings.businessName)}</strong><small>${esc(state.settings.subtitle)}</small></div><span>⌄</span></div>
        <div class="nav-label">ESPACIO DE TRABAJO</div>
        <nav class="nav">${nav.map(([key, label]) => `<button data-view="${key}" class="nav-item ${view === key ? 'active' : ''}"><span class="nav-icon">${icon[key]}</span>${label}</button>`).join('')}<button class="nav-item mobile-more" data-modal="more"><span class="nav-icon">⋯</span>Más</button></nav>
        <div class="sidebar-bottom"><div class="demo-card"><span class="demo-pulse"></span><strong>Modo demostración</strong><p>Datos ficticios guardados en este navegador.</p><button data-view="configuracion">Cambiar negocio <span>↗</span></button></div><div class="sidebar-foot">Diseñado para operaciones reales<br><span>Versión de muestra · 2026</span></div></div>
      </aside>
      <div class="main-column">
        <header class="topbar"><div class="mobile-brand">POS Studio</div><div class="breadcrumb">ESPACIO / <strong>${esc(labels[view])}</strong></div><div class="top-actions"><span class="live-badge"><i></i> Demo en vivo</span><label class="role-select"><span>Ver como</span><select id="role-select"><option value="admin" ${role === 'admin' ? 'selected' : ''}>Administrador</option><option value="seller" ${role === 'seller' ? 'selected' : ''}>Vendedor</option></select></label><div class="avatar">${role === 'admin' ? 'AD' : 'VE'}</div></div></header>
        <main class="content">${renderView()}</main>
      </div>
      <div id="toast-holder" aria-live="polite"></div>
      ${modal ? renderModal() : ''}
    </div>`;
}

function heading(kicker, title, description, actions = '') {
  return `<div class="page-head"><div><div class="eyebrow">${esc(kicker)}</div><h1>${esc(title)}</h1><p>${esc(description)}</p></div><div class="head-actions">${actions}</div></div>`;
}
function metric(label, value, note, symbol, tone = '') {
  return `<div class="metric-card ${tone}"><div class="metric-icon">${symbol}</div><span>${esc(label)}</span><strong>${value}</strong><small>${esc(note)}</small></div>`;
}
function empty(title, description, action = '') {
  return `<div class="empty-state"><div>◌</div><strong>${esc(title)}</strong><p>${esc(description)}</p>${action}</div>`;
}
function badge(text, tone = '') { return `<span class="badge ${tone}">${esc(text)}</span>`; }

function renderHome() {
  const stats = dashboardStats(state);
  const recent = state.sales.slice(0, 4);
  const cash = stats.cash;
  const modules = [
    ['ventas', '01', 'Ventas', 'Abre el POS y registra una comanda.', '▦', 'primary'],
    ['caja', '02', 'Caja', 'Aperturas, movimientos y cierres.', '▣', 'primary'],
    ['equipo', '03', 'Equipo y checador', 'Entradas, salidas y comisiones.', '◷', ''],
    ['inventario', '04', 'Inventario', 'Productos, existencias y ajustes.', '▤', ''],
    ['transacciones', '05', 'Transacciones', 'Consulta ventas y devoluciones.', '⇄', ''],
    ['proveedores', '06', 'Proveedores', 'Entregas, pagos y saldos.', '◇', ''],
    ['reportes', '07', 'Reportes', 'Mira la actividad del negocio.', '▥', ''],
    ['configuracion', '08', 'Personalizar', 'Adapta el sistema a otro negocio.', '⚙', ''],
  ];
  return `${heading('CENTRO DE OPERACIONES', state.settings.businessName, 'Entra a cada área con un toque. Los datos de esta demo son ficticios.')}
    <section class="home-intro" aria-label="Estado del negocio"><div><span class="home-intro-kicker">${esc(state.settings.subtitle)}</span><h2>La operación diaria,<br><em>a un toque.</em></h2><p>Ventas, caja, inventario y equipo conectados para trabajar sin perder el ritmo.</p></div><div class="home-intro-status"><span>ESTADO DE CAJA</span><strong>${cash ? 'Abierta' : 'Pendiente de apertura'}</strong><small>${stats.salesCount} ventas registradas en esta demo</small></div></section>
    <section class="home-modules" aria-label="Accesos principales"><div class="section-head"><div><span class="eyebrow">ACCESOS RÁPIDOS</span><h2>Flujos del día</h2></div><span class="soft-tag">Elige un área</span></div><div class="module-grid">${modules.map(([target, number, title, description, symbol, tone]) => `<button class="module-card ${tone}" data-view="${target}"><span class="module-card-top"><span class="module-symbol" aria-hidden="true">${symbol}</span><span class="module-number">${number}</span></span><strong>${title}</strong><small>${description}</small><span class="module-arrow" aria-hidden="true">↗</span></button>`).join('')}</div></section>
    <section class="home-overview" aria-label="Resumen del negocio"><div class="section-head"><div><span class="eyebrow">EN ESTE MOMENTO</span><h2>Panorama del negocio</h2></div></div><div class="metrics-grid">${metric('Ventas totales', money(stats.revenue), `${stats.salesCount} transacciones activas`, '↗')}${metric('Ventas de hoy', money(stats.todayRevenue), 'Se actualiza con cada operación', '◉')}${metric('Productos por reponer', String(stats.lowStock.length).padStart(2, '0'), 'Según el umbral configurado', '▤', stats.lowStock.length ? 'alert' : '')}${metric('Saldo a proveedores', money(stats.supplierDue), cash ? 'Caja abierta' : 'Caja pendiente de apertura', '◇')}</div></section>
    <section class="panel home-activity"><div class="section-head"><div><span class="eyebrow">ACTIVIDAD RECIENTE</span><h2>Últimas ventas</h2></div><button class="text-link" data-view="transacciones">Ver todas ↗</button></div>${recent.length ? `<div class="activity-list">${recent.map((sale) => `<div class="activity-row"><div class="activity-icon">↗</div><div><strong>${sale.items.map((item) => item.name).slice(0, 2).map(esc).join(', ')}</strong><small>${date(sale.at)} · ${esc(sale.paymentMethod)}</small></div><span>${money(sale.total)}</span></div>`).join('')}</div>` : empty('Todavía no hay ventas', 'Registra una venta para ver actividad aquí.')}</section>`;
}

function renderProductCard(product) {
  const unavailable = product.trackStock && product.stock <= 0 && !state.settings.allowNegativeStock;
  return `<button class="product-card ${unavailable ? 'unavailable' : ''}" data-add-product="${esc(product.id)}" ${unavailable ? 'disabled' : ''}>
    <div class="product-visual" style="background:${esc(product.color || '#ded6c8')}"><span>${esc(product.emoji || '◈')}</span><small>${esc(product.area)}</small></div>
    <div class="product-info"><small>${esc(product.category)}</small><strong>${esc(product.name)}</strong><div><span>${money(product.price)}</span>${product.trackStock ? `<em>${product.stock} disponibles</em>` : '<em>Servicio</em>'}</div></div></button>`;
}

function renderCart() {
  const lines = cart.map((line) => ({ ...line, product: line.custom || state.products.find((product) => product.id === line.productId) })).filter((line) => line.product);
  let quote;
  try { quote = lines.length ? priceSale(state, cartLinesForSale(), 0, 0) : null; } catch { quote = null; }
  return `<aside class="cart-panel"><div class="cart-title"><div><span class="eyebrow">COMANDA ACTUAL</span><h2>Nueva venta</h2></div><span class="cart-count">${lines.reduce((n, line) => n + line.quantity, 0)}</span></div>
    <div class="cart-body">${lines.length ? lines.map((line) => `<div class="cart-line"><div class="cart-product-icon" style="background:${esc(line.product.color)}">${esc(line.product.emoji)}</div><div class="cart-product-info"><strong>${esc(line.product.name)}</strong><small>${money(line.product.price)} c/u</small><div class="quantity-control"><button data-cart-minus="${esc(line.productId)}">−</button><span>${line.quantity}</span><button data-cart-plus="${esc(line.productId)}">+</button></div></div><strong>${money(line.product.price * line.quantity)}</strong></div>`).join('') : `<div class="cart-empty"><div>▦</div><strong>Tu comanda está vacía</strong><p>Selecciona productos para empezar una venta.</p></div>`}</div>
    <form id="sale-form" class="cart-footer"><div class="cart-subtotal"><span>Subtotal</span><strong>${money(quote?.subtotal || 0)}</strong></div><div class="cart-fields"><label>Descuento %<input type="number" name="discountPct" min="0" max="100" step="1" value="0" /></label><label>Propina<input type="number" name="tip" min="0" step="0.01" value="0" /></label></div><div class="cart-fields"><label>Responsable<select name="employeeId">${state.employees.filter((employee) => employee.active).map((employee) => `<option value="${esc(employee.id)}">${esc(employee.name)}</option>`).join('')}</select></label><label>Pago<select name="paymentMethod">${state.settings.paymentMethods.map((method) => `<option>${esc(method)}</option>`).join('')}</select></label></div><div class="cart-total"><span>Total estimado <small>Impuesto configurado: ${state.settings.taxRate}%</small></span><strong>${money(quote?.total || 0)}</strong></div><button class="button primary wide" type="submit" ${!lines.length ? 'disabled' : ''}>Registrar venta <span>→</span></button><p class="cart-note">${activeCashSession(state) ? 'Caja abierta · cobros en efectivo disponibles' : 'Abre caja para aceptar efectivo'}</p></form></aside>`;
}

function renderPOS() {
  const categories = ['Todas', ...new Set(state.products.map((product) => product.area))];
  const products = state.products.filter((product) => product.active !== false && (areaFilter === 'Todas' || product.area === areaFilter) && `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(search.toLowerCase()));
  return `${heading('VENTAS', 'Punto de venta', 'Una experiencia rápida y clara para vender desde escritorio o iPad.', `<button class="button secondary" data-modal="customItem">+ Cargo manual</button>`)}
    <div class="pos-layout"><div class="catalog"><div class="catalog-toolbar"><div class="search-box"><span>⌕</span><input id="product-search" type="search" placeholder="Buscar producto, categoría o SKU" value="${esc(search)}" /></div><span>${products.length} productos</span></div><div class="tabs">${categories.map((category) => `<button class="tab ${areaFilter === category ? 'active' : ''}" data-area="${esc(category)}">${esc(category)}</button>`).join('')}</div><div class="product-grid">${products.map(renderProductCard).join('') || empty('Sin resultados', 'Prueba otra búsqueda o agrega un producto.')}</div></div>${renderCart()}</div>`;
}

function renderInventory() {
  const low = state.products.filter((product) => product.trackStock && product.stock <= state.settings.lowStockAt);
  return `${heading('CATÁLOGO Y EXISTENCIAS', 'Inventario', 'Productos, precios y movimientos organizados por SKU.', `${isAdmin() ? '<button class="button primary" data-modal="product">+ Nuevo producto</button>' : ''}`)}
    <div class="summary-strip"><div><span>Productos activos</span><strong>${state.products.length}</strong></div><div><span>Con control de stock</span><strong>${state.products.filter((product) => product.trackStock).length}</strong></div><div><span>Necesitan atención</span><strong>${low.length}</strong></div></div>
    <section class="panel table-panel"><div class="section-head"><div><span class="eyebrow">VISTA DE CATÁLOGO</span><h2>Todos los productos</h2></div>${badge(`${state.settings.areas.length} áreas`, 'neutral')}</div><div class="table-wrap"><table><thead><tr><th>PRODUCTO</th><th>SKU / ÁREA</th><th>PRECIO</th><th>COSTO</th><th>STOCK</th><th>PROVEEDOR</th><th></th></tr></thead><tbody>${state.products.map((product) => `<tr><td><div class="table-product"><span class="mini-product" style="background:${esc(product.color)}">${esc(product.emoji)}</span><div><strong>${esc(product.name)}</strong><small>${esc(product.category)}${product.active === false ? ' · Inactivo' : ''}</small></div></div></td><td><strong>${esc(product.sku)}</strong><small>${esc(product.area)}</small></td><td>${money(product.price)}</td><td>${money(product.cost)}</td><td>${product.trackStock ? badge(`${product.stock} unidades`, product.stock <= state.settings.lowStockAt ? 'warning' : 'good') : badge('Sin control', 'neutral')}</td><td>${esc(supplierName(product.supplierId))}</td><td>${isAdmin() ? `<div class="row-actions"><button data-modal="product" data-id="${esc(product.id)}" title="Editar">✎</button>${product.trackStock ? `<button data-modal="stock" data-id="${esc(product.id)}" title="Ajustar stock">±</button>` : ''}</div>` : ''}</td></tr>`).join('')}</tbody></table></div></section>
    <section class="panel"><div class="section-head"><div><span class="eyebrow">TRAZABILIDAD</span><h2>Movimientos recientes</h2></div></div><div class="simple-list">${state.stockMovements.slice(0, 5).map((movement) => `<div><span class="movement-sign ${movement.quantity > 0 ? 'positive' : ''}">${movement.quantity > 0 ? '+' : ''}${movement.quantity}</span><strong>${esc(productName(movement.productId))}</strong><span>${esc(movement.reason)}</span><small>${date(movement.at)}</small></div>`).join('') || empty('Sin movimientos', 'Las ventas y entregas aparecerán aquí.')}</div></section>`;
}

function renderSuppliers() {
  return `${heading('RELACIONES COMERCIALES', 'Proveedores', 'Entrega de mercadería, consignación y saldos en una misma vista.', `${isAdmin() ? '<button class="button secondary" data-modal="supplier">+ Proveedor</button><button class="button secondary" data-modal="withdrawal">− Retiro</button><button class="button primary" data-modal="delivery">+ Registrar entrega</button>' : ''}`)}
    <div class="supplier-grid">${state.suppliers.map((supplier) => { const balance = supplierBalance(state, supplier.id); const products = state.products.filter((product) => product.supplierId === supplier.id); return `<section class="supplier-card"><div class="supplier-card-top"><span class="supplier-icon">◇</span>${badge(balance > 0 ? 'Saldo pendiente' : balance < 0 ? 'Saldo a favor' : 'Al día', balance > 0 ? 'warning' : 'good')}</div><h2>${esc(supplier.name)}</h2><p>${esc(supplier.notes || 'Proveedor activo')}</p><div class="supplier-card-stats"><div><span>Productos</span><strong>${products.length}</strong></div><div><span>Saldo</span><strong>${money(balance)}</strong></div></div><div class="supplier-card-footer"><span>${esc(supplier.contact || 'Sin contacto')}</span>${isAdmin() ? `<button data-modal="supplierPayment" data-id="${esc(supplier.id)}" ${balance <= 0 ? 'disabled' : ''}>Registrar pago ↗</button>` : ''}</div></section>`; }).join('')}</div>
    <section class="panel table-panel"><div class="section-head"><div><span class="eyebrow">CUENTAS POR PAGAR</span><h2>Movimientos con proveedores</h2></div></div><div class="table-wrap"><table><thead><tr><th>FECHA</th><th>PROVEEDOR</th><th>TIPO</th><th>REFERENCIA</th><th>IMPORTE</th></tr></thead><tbody>${state.supplierLedger.map((entry) => `<tr><td>${date(entry.at)}</td><td><strong>${esc(supplierName(entry.supplierId))}</strong></td><td>${badge(entry.type, entry.amount < 0 ? 'good' : 'neutral')}</td><td>${esc(entry.referenceId || '—')}</td><td class="${entry.amount < 0 ? 'amount-negative' : ''}">${entry.amount > 0 ? '+' : ''}${money(entry.amount)}</td></tr>`).join('') || `<tr><td colspan="5">${empty('Sin movimientos', 'Registra una entrega o una venta en consignación.')}</td></tr>`}</tbody></table></div></section>`;
}

function renderCash() {
  const session = activeCashSession(state);
  const expected = session ? cashExpected(state, session.id) : 0;
  const movements = session ? state.cashMovements.filter((movement) => movement.sessionId === session.id) : state.cashMovements;
  return `${heading('CONTROL DE EFECTIVO', 'Caja', 'Aperturas, entradas, salidas y cierres con diferencias visibles.', `${isAdmin() ? session ? '<button class="button secondary" data-modal="cashMovement">± Movimiento</button><button class="button primary" data-modal="cashClose">Cerrar caja</button>' : '<button class="button primary" data-modal="cashOpen">Abrir caja</button>' : ''}`)}
    <div class="cash-hero"><div><span class="eyebrow">ESTADO ACTUAL</span><h2>${session ? 'Caja abierta' : 'Caja cerrada'}</h2><p>${session ? `Abierta ${date(session.openedAt)}` : 'Abre una sesión para registrar cobros en efectivo.'}</p></div><div><span>SALDO ESPERADO</span><strong>${money(expected)}</strong><small>${session ? `Fondo inicial ${money(session.openingAmount)}` : 'Sin sesión activa'}</small></div><div class="cash-orbit">◎</div></div>
    <div class="two-columns"><section class="panel"><div class="section-head"><div><span class="eyebrow">SESIÓN ACTUAL</span><h2>Movimientos de efectivo</h2></div></div><div class="activity-list">${movements.slice(0, 8).map((movement) => `<div class="activity-row"><div class="activity-icon ${movement.amount < 0 ? 'out' : ''}">${movement.amount > 0 ? '↓' : '↑'}</div><div><strong>${esc(movement.type)}</strong><small>${esc(movement.note)} · ${date(movement.at)}</small></div><span class="${movement.amount < 0 ? 'amount-negative' : ''}">${movement.amount > 0 ? '+' : ''}${money(movement.amount)}</span></div>`).join('') || empty('Sin movimientos', 'Las ventas en efectivo aparecerán aquí.')}</div></section><section class="panel"><div class="section-head"><div><span class="eyebrow">HISTORIAL</span><h2>Aperturas y cierres</h2></div></div><div class="session-list">${state.cashSessions.map((item) => `<div><div><strong>${shortDate(item.openedAt)}</strong><small>${date(item.openedAt)}</small></div><div><strong>${money(item.closedAt ? item.expectedAmount : cashExpected(state, item.id))}</strong>${badge(item.closedAt ? `Diferencia ${money(item.difference)}` : 'Abierta', item.closedAt ? (item.difference ? 'warning' : 'good') : 'neutral')}</div></div>`).join('') || empty('Sin sesiones', 'La primera apertura de caja se registrará aquí.')}</div></section></div>`;
}

function renderTransactions() {
  const rows = state.sales;
  return `${heading('HISTORIAL OPERATIVO', 'Transacciones', 'Cada venta conserva sus productos, responsable, forma de pago y estado.', '<button class="button secondary" id="export-csv">↓ Exportar CSV</button>')}
    <section class="panel table-panel"><div class="section-head"><div><span class="eyebrow">REGISTRO DE VENTAS</span><h2>Todas las transacciones</h2></div>${badge(`${rows.length} registros`, 'neutral')}</div><div class="table-wrap"><table><thead><tr><th>FECHA / ID</th><th>PRODUCTOS</th><th>RESPONSABLE</th><th>PAGO</th><th>TOTAL</th><th>ESTADO</th><th></th></tr></thead><tbody>${rows.map((sale) => `<tr><td><strong>${date(sale.at)}</strong><small>${esc(sale.id)}</small></td><td>${esc(sale.items.map((item) => `${item.quantity}× ${item.name}`).join(', '))}</td><td>${esc(employeeName(sale.employeeId))}</td><td>${esc(sale.paymentMethod)}</td><td><strong>${money(sale.total)}</strong></td><td>${badge(sale.status === 'completed' ? 'Completada' : 'Devuelta', sale.status === 'completed' ? 'good' : 'warning')}</td><td>${isAdmin() && sale.status === 'completed' ? `<button class="table-link" data-modal="refund" data-id="${esc(sale.id)}">Devolver</button>` : ''}</td></tr>`).join('')}</tbody></table></div></section>`;
}

function renderTeam() {
  const activeSales = state.sales.filter((sale) => sale.status === 'completed');
  return `${heading('PERSONAS Y RESULTADOS', 'Equipo', 'Horarios, ventas asignadas y comisiones calculadas por persona.', `${isAdmin() ? '<button class="button primary" data-modal="employee">+ Integrante</button>' : ''}`)}
    <div class="employee-grid">${state.employees.map((employee) => { const open = state.timeEntries.find((entry) => entry.employeeId === employee.id && !entry.outAt); const sales = activeSales.filter((sale) => sale.employeeId === employee.id); const hours = sum(state.timeEntries.filter((entry) => entry.employeeId === employee.id).map((entry) => entry.hours)); return `<section class="employee-card"><div class="employee-top"><div class="employee-avatar">${esc(employee.name.slice(0, 2).toUpperCase())}</div>${badge(open ? 'En turno' : employee.active ? 'Activo' : 'Inactivo', open ? 'good' : 'neutral')}</div><h2>${esc(employee.name)}</h2><p>${esc(employee.role)}</p><div class="employee-stats"><div><span>Ventas</span><strong>${sales.length}</strong></div><div><span>Comisiones</span><strong>${money(sum(sales.map((sale) => sale.commission)))}</strong></div><div><span>Horas</span><strong>${hours.toFixed(2)}</strong></div></div><div class="employee-actions"><button class="button secondary small" data-clock="${open ? 'out' : 'in'}" data-id="${esc(employee.id)}" ${!employee.active ? 'disabled' : ''}>${open ? 'Registrar salida' : 'Registrar entrada'}</button>${isAdmin() ? `<button class="icon-button" data-modal="employee" data-id="${esc(employee.id)}">✎</button>` : ''}</div></section>`; }).join('')}</div>
    <section class="panel table-panel"><div class="section-head"><div><span class="eyebrow">CHECADOR</span><h2>Horas registradas</h2></div></div><div class="table-wrap"><table><thead><tr><th>PERSONA</th><th>ENTRADA</th><th>SALIDA</th><th>HORAS</th><th>PAGO ESTIMADO</th></tr></thead><tbody>${state.timeEntries.map((entry) => `<tr><td><strong>${esc(employeeName(entry.employeeId))}</strong></td><td>${date(entry.inAt)}</td><td>${date(entry.outAt)}</td><td>${entry.hours == null ? 'En curso' : entry.hours.toFixed(2)}</td><td>${entry.pay == null ? '—' : money(entry.pay)}</td></tr>`).join('') || `<tr><td colspan="5">${empty('Sin turnos registrados', 'Marca una entrada para empezar.')}</td></tr>`}</tbody></table></div></section>`;
}

function renderReports() {
  const sales = state.sales.filter((sale) => sale.status === 'completed');
  const revenue = sum(sales.map((sale) => sale.total));
  const netSales = sum(sales.map((sale) => sale.subtotal - sale.discount));
  const cost = sum(sales.flatMap((sale) => sale.items.map((item) => item.unitCost * item.quantity)));
  const areaRows = state.settings.areas.map((area) => ({ name: area, amount: sum(sales.flatMap((sale) => sale.items.filter((item) => item.area === area).map((item) => item.quantity * item.unitPrice))) }));
  const paymentRows = state.settings.paymentMethods.map((method) => ({ name: method, amount: sum(sales.filter((sale) => sale.paymentMethod === method).map((sale) => sale.total)) }));
  return `${heading('LECTURA DEL NEGOCIO', 'Reportes', 'Indicadores conectados directamente a las acciones de la demo.', '')}
    <div class="metrics-grid">${metric('Ingresos registrados', money(revenue), 'Ventas completadas', '↗')}${metric('Margen estimado', money(netSales - cost), 'Venta neta menos costo de producto', '◇')}${metric('Comisiones calculadas', money(sum(sales.map((sale) => sale.commission))), 'Según la persona responsable', '♙')}${metric('Ticket promedio', money(sales.length ? revenue / sales.length : 0), `${sales.length} ventas`, '◉')}</div>
    <div class="two-columns"><section class="panel"><div class="section-head"><div><span class="eyebrow">COMPOSICIÓN</span><h2>Ventas por área</h2></div></div><div class="bar-list">${areaRows.map((row) => `<div><div><strong>${esc(row.name)}</strong><span>${money(row.amount)}</span></div><div class="bar-track"><span style="width:${percent(row.amount, sum(areaRows.map((x) => x.amount)))}%"></span></div></div>`).join('')}</div></section><section class="panel"><div class="section-head"><div><span class="eyebrow">COBROS</span><h2>Medios de pago</h2></div></div><div class="bar-list">${paymentRows.map((row) => `<div><div><strong>${esc(row.name)}</strong><span>${money(row.amount)}</span></div><div class="bar-track green"><span style="width:${percent(row.amount, revenue)}%"></span></div></div>`).join('')}</div></section></div>
    <section class="panel"><div class="section-head"><div><span class="eyebrow">TRAZA DE OPERACIÓN</span><h2>Actividad del sistema</h2></div></div><div class="simple-list audit-list">${state.audit.slice(0, 12).map((item) => `<div><span class="audit-dot"></span><strong>${esc(item.type)}</strong><span>${esc(item.detail)}</span><small>${date(item.at)}</small></div>`).join('') || empty('Aún no hay actividad', 'Prueba una acción para verla aquí.')}</div></section>`;
}

function renderIntegrationPanel() {
  const events = state.integrationEvents || [];
  const pending = events.filter((entry) => entry.status === 'pendiente').length;
  return `<div class="integration-events"><div class="integration-actions"><button class="button secondary small" id="sync-demo" ${pending ? '' : 'disabled'}>Simular sincronización ${pending ? `(${pending})` : ''}</button><button class="text-link" data-modal="balancePreview">Vista previa de balance ↗</button></div>${events.slice(0, 4).map((entry) => `<div class="integration-event"><div><strong>${esc(entry.detail)}</strong><small>${date(entry.at)}</small></div>${badge(entry.status === 'pendiente' ? 'Pendiente' : 'Simulado', entry.status === 'pendiente' ? 'warning' : 'good')}</div>`).join('')}</div>`;
}

function renderSettings() {
  if (!isAdmin()) return `${heading('ACCESO', 'Configuración', 'La personalización corresponde al rol administrador.')}${empty('Vista restringida', 'Cambia al rol administrador para explorar las opciones.')}`;
  const methods = ['Efectivo', 'Tarjeta', 'Transferencia'];
  return `${heading('ADAPTA EL SISTEMA', 'Personalización', 'Configura reglas de operación y observa el efecto en toda la demo.', '')}
    <div class="settings-grid"><section class="panel"><div class="section-head"><div><span class="eyebrow">IDENTIDAD Y OPERACIÓN</span><h2>Configuración del negocio</h2></div></div><form id="settings-form" class="form-grid"><label>Nombre del negocio<input name="businessName" value="${esc(state.settings.businessName)}" required /></label><label>Descripción breve<input name="subtitle" value="${esc(state.settings.subtitle)}" /></label><label>Color principal<input name="accent" type="color" value="${esc(state.settings.accent)}" /></label><label class="wide-field">Logo opcional (PNG, JPEG o WebP; máximo 500 KB)<input name="logoFile" type="file" accept="image/png,image/jpeg,image/webp" /></label><label class="check wide-field"><input name="removeLogo" type="checkbox" /> Quitar logo actual</label><label>Moneda de visualización<select name="currency">${['MXN', 'USD', 'EUR'].map((currency) => `<option ${state.settings.currency === currency ? 'selected' : ''}>${currency}</option>`).join('')}</select></label><label>Áreas (separadas por coma)<input name="areas" value="${esc(state.settings.areas.join(', '))}" required /></label><label>Impuesto %<input name="taxRate" type="number" min="0" max="100" step="0.01" value="${state.settings.taxRate}" /></label><label>Alerta de stock bajo<input name="lowStockAt" type="number" min="0" step="1" value="${state.settings.lowStockAt}" /></label><fieldset><legend>Medios de pago</legend>${methods.map((method) => `<label class="check"><input type="checkbox" name="paymentMethods" value="${method}" ${state.settings.paymentMethods.includes(method) ? 'checked' : ''} /> ${method}</label>`).join('')}</fieldset><label class="check wide-field"><input type="checkbox" name="allowNegativeStock" ${state.settings.allowNegativeStock ? 'checked' : ''} /> Permitir stock negativo</label><button class="button primary" type="submit">Guardar configuración</button></form></section>
    <div class="settings-side"><section class="panel"><div class="section-head"><div><span class="eyebrow">ESCENARIOS DE EJEMPLO</span><h2>Prueba otro negocio</h2></div></div><p class="muted">Cada escenario inicia una base ficticia distinta. Al cambiar, se reinicia el progreso actual de la demo.</p><div class="preset-options"><button data-preset="lounge" class="preset ${state.preset === 'lounge' ? 'active' : ''}"><span>✦</span><div><strong>Lounge + boutique</strong><small>Servicios, comida y consignación</small></div></button><button data-preset="retail" class="preset ${state.preset === 'retail' ? 'active' : ''}"><span>◈</span><div><strong>Tienda + café</strong><small>Inventario, compras y mostrador</small></div></button></div><button class="text-link danger" id="reset-demo">Restablecer escenario actual</button></section><section class="panel"><div class="section-head"><div><span class="eyebrow">INTEGRACIONES</span><h2>Conexiones posibles</h2></div></div><div class="integration"><span>W</span><div><strong>Catálogo web / Wix</strong><small>Conector de muestra · sin cuenta real</small></div>${badge('Demo', 'neutral')}</div><div class="integration"><span>✉</span><div><strong>Balances por correo</strong><small>Vista previa en reportes</small></div>${badge('Demo', 'neutral')}</div><p class="fine-print">En un proyecto para un cliente, estos conectores se diseñan según sus herramientas y permisos.</p>${renderIntegrationPanel()}</section></div></div>`;
}

function renderView() {
  return ({ inicio: renderHome, ventas: renderPOS, inventario: renderInventory, proveedores: renderSuppliers, caja: renderCash, transacciones: renderTransactions, equipo: renderTeam, reportes: renderReports, configuracion: renderSettings }[view] || renderHome)();
}

function render() {
  document.title = `${state.settings.businessName} · POS Studio Demo`;
  app.innerHTML = shell();
}

function field(label, name, value = '', type = 'text', extra = '') {
  return `<label>${esc(label)}<input name="${esc(name)}" type="${type}" value="${esc(value)}" ${extra} /></label>`;
}
function selectField(label, name, options, selected) {
  return `<label>${esc(label)}<select name="${esc(name)}">${options.map(([value, text]) => `<option value="${esc(value)}" ${String(value) === String(selected) ? 'selected' : ''}>${esc(text)}</option>`).join('')}</select></label>`;
}

function modalContent() {
  const { type, id } = modal;
  if (type === 'more') return { title: 'Más secciones', note: 'Explora el resto de la operación.', body: `<div class="more-links">${[['proveedores', 'Proveedores'], ['transacciones', 'Transacciones'], ['equipo', 'Equipo'], ['reportes', 'Reportes']].map(([target, label]) => `<button data-view="${target}"><span>${icon[target]}</span>${label}<strong>→</strong></button>`).join('')}</div>` };
  if (type === 'product') {
    const item = state.products.find((product) => product.id === id) || {};
    return { title: id ? 'Editar producto' : 'Nuevo producto', note: 'El catálogo se refleja de inmediato en el POS.', body: `<form data-form="product" class="form-grid">${field('Nombre', 'name', item.name, 'text', 'required')}${field('SKU', 'sku', item.sku, 'text', 'required')}${field('Categoría', 'category', item.category, 'text', 'required')}${selectField('Área', 'area', state.settings.areas.map((area) => [area, area]), item.area)}${field('Precio', 'price', item.price ?? '', 'number', 'min="0.01" step="0.01" required')}${field('Costo', 'cost', item.cost ?? 0, 'number', 'min="0" step="0.01" required')}${selectField('Proveedor', 'supplierId', [['', 'Sin proveedor'], ...state.suppliers.map((supplier) => [supplier.id, supplier.name])], item.supplierId)}${selectField('Modalidad', 'acquisition', [['purchase', 'Compra'], ['consignment', 'Consignación']], item.acquisition)}${field('Símbolo', 'emoji', item.emoji || '◈')}${field('Color', 'color', item.color || '#d9d3c5', 'color')}<label class="check wide-field"><input name="trackStock" type="checkbox" ${item.trackStock ? 'checked' : ''} /> Controlar existencias</label><label class="check wide-field"><input name="active" type="checkbox" ${item.active !== false ? 'checked' : ''} /> Disponible para venta</label><div class="form-actions"><button type="button" class="button secondary" data-close>Cancelar</button><button class="button primary">Guardar producto</button></div></form>` };
  }
  if (type === 'stock') {
    const product = state.products.find((item) => item.id === id);
    return { title: 'Ajustar stock', note: `${product?.name || ''} · Actual: ${product?.stock ?? '—'}`, body: `<form data-form="stock" class="form-grid">${field('Cantidad (+ entrada / − salida)', 'quantity', '', 'number', 'step="1" required')}${field('Motivo', 'reason', '', 'text', 'required')}<div class="form-actions"><button type="button" class="button secondary" data-close>Cancelar</button><button class="button primary">Registrar ajuste</button></div></form>` };
  }
  if (type === 'supplier') {
    const item = state.suppliers.find((supplier) => supplier.id === id) || {};
    return { title: id ? 'Editar proveedor' : 'Nuevo proveedor', note: 'Organiza contactos y cuentas por pagar.', body: `<form data-form="supplier" class="form-grid">${field('Nombre', 'name', item.name, 'text', 'required')}${field('Contacto', 'contact', item.contact)}<label class="wide-field">Notas<textarea name="notes">${esc(item.notes || '')}</textarea></label><div class="form-actions"><button type="button" class="button secondary" data-close>Cancelar</button><button class="button primary">Guardar proveedor</button></div></form>` };
  }
  if (type === 'delivery') {
    const supplier = state.suppliers[0];
    const products = state.products.filter((product) => product.supplierId === supplier?.id);
    return { title: 'Registrar entrega', note: 'Una entrega aumenta stock; una compra también crea saldo por pagar.', body: `<form data-form="delivery" class="form-grid">${selectField('Proveedor', 'supplierId', state.suppliers.map((item) => [item.id, item.name]), supplier?.id)}${selectField('Producto', 'productId', products.map((product) => [product.id, product.name]), products[0]?.id)}${field('Cantidad', 'quantity', 1, 'number', 'min="1" step="1" required')}${field('Costo unitario', 'unitCost', products[0]?.cost ?? 0, 'number', 'min="0" step="0.01" required')}<div class="form-actions"><button type="button" class="button secondary" data-close>Cancelar</button><button class="button primary">Registrar entrega</button></div></form>` };
  }
  if (type === 'withdrawal') {
    const supplier = state.suppliers[0];
    const products = state.products.filter((product) => product.supplierId === supplier?.id && product.trackStock);
    return { title: 'Retiro de proveedor', note: 'Reduce existencias y ajusta el saldo si fue una compra.', body: `<form data-form="withdrawal" class="form-grid">${selectField('Proveedor', 'supplierId', state.suppliers.map((item) => [item.id, item.name]), supplier?.id)}${selectField('Producto', 'productId', products.map((product) => [product.id, product.name]), products[0]?.id)}${field('Cantidad', 'quantity', 1, 'number', 'min="1" step="1" required')}<div class="form-actions"><button type="button" class="button secondary" data-close>Cancelar</button><button class="button primary">Registrar retiro</button></div></form>` };
  }
  if (type === 'supplierPayment') {
    const supplier = state.suppliers.find((entry) => entry.id === id);
    return { title: 'Pagar proveedor', note: `${supplier?.name} · Saldo ${money(supplierBalance(state, id))}`, body: `<form data-form="supplierPayment" class="form-grid">${field('Monto', 'amount', supplierBalance(state, id), 'number', 'min="0.01" step="0.01" required')}${field('Referencia', 'reference', '')}<div class="form-actions"><button type="button" class="button secondary" data-close>Cancelar</button><button class="button primary">Registrar pago</button></div></form>` };
  }
  if (type === 'cashOpen') return { title: 'Abrir caja', note: 'Registra el efectivo inicial antes de cobrar.', body: `<form data-form="cashOpen" class="form-grid">${field('Fondo inicial', 'openingAmount', 1000, 'number', 'min="0" step="0.01" required')}<div class="form-actions"><button type="button" class="button secondary" data-close>Cancelar</button><button class="button primary">Abrir caja</button></div></form>` };
  if (type === 'cashMovement') return { title: 'Movimiento de caja', note: 'Usa un monto negativo para una salida.', body: `<form data-form="cashMovement" class="form-grid">${field('Importe (+ ingreso / − egreso)', 'amount', '', 'number', 'step="0.01" required')}${field('Motivo', 'note', '', 'text', 'required')}<div class="form-actions"><button type="button" class="button secondary" data-close>Cancelar</button><button class="button primary">Guardar movimiento</button></div></form>` };
  if (type === 'cashClose') return { title: 'Cerrar caja', note: `Saldo esperado: ${money(cashExpected(state, activeCashSession(state).id))}`, body: `<form data-form="cashClose" class="form-grid">${field('Efectivo contado', 'countedAmount', cashExpected(state, activeCashSession(state).id), 'number', 'min="0" step="0.01" required')}<div class="form-actions"><button type="button" class="button secondary" data-close>Cancelar</button><button class="button primary">Cerrar y comparar</button></div></form>` };
  if (type === 'refund') {
    const sale = state.sales.find((entry) => entry.id === id);
    return { title: 'Devolver venta', note: `${sale?.id} · ${money(sale?.total)}. Se revertirán stock y saldos relacionados.`, body: `<form data-form="refund" class="form-grid">${field('Motivo de devolución', 'reason', '', 'text', 'required')}<div class="form-actions"><button type="button" class="button secondary" data-close>Cancelar</button><button class="button danger-button">Confirmar devolución</button></div></form>` };
  }
  if (type === 'employee') {
    const item = state.employees.find((employee) => employee.id === id) || {};
    return { title: id ? 'Editar integrante' : 'Nuevo integrante', note: 'La comisión se calcula sobre venta neta antes de impuestos.', body: `<form data-form="employee" class="form-grid">${field('Nombre', 'name', item.name, 'text', 'required')}${field('Rol', 'role', item.role || 'Vendedor', 'text', 'required')}${field('Tarifa por hora', 'hourlyRate', item.hourlyRate ?? 0, 'number', 'min="0" step="0.01" required')}${field('Comisión %', 'commissionRate', item.commissionRate ?? 0, 'number', 'min="0" max="100" step="0.01" required')}<label class="check wide-field"><input name="active" type="checkbox" ${item.active !== false ? 'checked' : ''} /> Integrante activo</label><div class="form-actions"><button type="button" class="button secondary" data-close>Cancelar</button><button class="button primary">Guardar integrante</button></div></form>` };
  }
  if (type === 'customItem') return { title: 'Cargo manual', note: 'Útil para servicios o ajustes de venta.', body: `<form data-form="customItem" class="form-grid">${field('Concepto', 'name', '', 'text', 'required')}${field('Precio', 'unitPrice', '', 'number', 'min="0.01" step="0.01" required')}<div class="form-actions"><button type="button" class="button secondary" data-close>Cancelar</button><button class="button primary">Agregar a comanda</button></div></form>` };
  if (type === 'receipt') {
    const sale = state.sales.find((entry) => entry.id === id);
    return { title: 'Venta registrada', note: `Comprobante ${sale?.id}`, body: `<div class="receipt"><div class="receipt-head"><strong>${esc(state.settings.businessName)}</strong><small>${date(sale?.at)}</small></div>${sale?.items.map((item) => `<div><span>${item.quantity} × ${esc(item.name)}</span><strong>${money(item.quantity * item.unitPrice)}</strong></div>`).join('') || ''}<div><span>Descuento</span><strong>− ${money(sale?.discount)}</strong></div><div><span>Impuesto</span><strong>${money(sale?.tax)}</strong></div><div><span>Propina</span><strong>${money(sale?.tip)}</strong></div><div class="receipt-total"><span>Total · ${esc(sale?.paymentMethod)}</span><strong>${money(sale?.total)}</strong></div></div><button class="button primary wide" data-close>Listo</button>` };
  }
  if (type === 'balancePreview') {
    const sales = state.sales.filter((sale) => sale.status === 'completed');
    const today = new Date().toDateString();
    const todays = sales.filter((sale) => new Date(sale.at).toDateString() === today);
    return { title: 'Balance diario · vista previa', note: 'Este contenido no se envía por correo.', body: `<div class="balance-preview"><p><strong>${esc(state.settings.businessName)}</strong><br>Resumen de ${new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(new Date())}</p><div><span>Ventas de hoy</span><strong>${todays.length}</strong></div><div><span>Ingresos de hoy</span><strong>${money(sum(todays.map((sale) => sale.total)))}</strong></div><div><span>Pagos en efectivo</span><strong>${money(sum(todays.filter((sale) => sale.paymentMethod === 'Efectivo').map((sale) => sale.total)))}</strong></div><div><span>Productos con stock bajo</span><strong>${state.products.filter((product) => product.trackStock && product.stock <= state.settings.lowStockAt).length}</strong></div></div><button class="button primary wide" data-close>Cerrar vista previa</button>` };
  }
  return { title: 'Detalle', note: '', body: '' };
}

function renderModal() {
  const content = modalContent();
  return `<div class="modal-backdrop" data-backdrop><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(content.title)}"><div class="modal-head"><div><span class="eyebrow">POS STUDIO</span><h2>${esc(content.title)}</h2><p>${esc(content.note)}</p></div><button class="close-button" data-close aria-label="Cerrar">×</button></div>${content.body}</div></div>`;
}

function formPayload(form) {
  const data = new FormData(form);
  return Object.fromEntries(data.entries());
}

function cartLinesForSale() {
  return cart.map((line) => line.custom
    ? { name: line.custom.name, unitPrice: line.custom.price, quantity: line.quantity }
    : { productId: line.productId, quantity: line.quantity });
}

function exportSalesCsv() {
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = [['ID', 'Fecha', 'Estado', 'Responsable', 'Pago', 'Productos', 'Subtotal', 'Descuento', 'Impuesto', 'Propina', 'Total'],
    ...state.sales.map((sale) => [sale.id, sale.at, sale.status, employeeName(sale.employeeId), sale.paymentMethod,
      sale.items.map((item) => `${item.quantity}x ${item.name}`).join('; '), sale.subtotal, sale.discount, sale.tax, sale.tip, sale.total])];
  const csv = '\ufeff' + rows.map((row) => row.map(quote).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'pos-studio-transacciones.csv';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify('CSV descargado.');
}

app.addEventListener('click', (event) => {
  const target = event.target.closest('button');
  if (!target) {
    if (event.target.matches('[data-backdrop]')) { modal = null; render(); }
    return;
  }
  if (target.dataset.view) { view = target.dataset.view; modal = null; render(); return; }
  if (target.dataset.close !== undefined) { modal = null; render(); return; }
  if (target.dataset.modal) { modal = { type: target.dataset.modal, id: target.dataset.id || null }; render(); return; }
  if (target.dataset.area) { areaFilter = target.dataset.area; render(); return; }
  if (target.dataset.addProduct) {
    const existing = cart.find((line) => line.productId === target.dataset.addProduct);
    if (existing) existing.quantity += 1; else cart.push({ productId: target.dataset.addProduct, quantity: 1 });
    render(); return;
  }
  if (target.dataset.cartPlus) { cart.find((line) => line.productId === target.dataset.cartPlus).quantity += 1; render(); return; }
  if (target.dataset.cartMinus) {
    const line = cart.find((item) => item.productId === target.dataset.cartMinus);
    line.quantity -= 1;
    if (!line.quantity) cart = cart.filter((item) => item !== line);
    render(); return;
  }
  if (target.dataset.clock) {
    dispatch(target.dataset.clock === 'in' ? 'clockIn' : 'clockOut', { employeeId: target.dataset.id }, target.dataset.clock === 'in' ? 'Entrada registrada.' : 'Salida registrada.');
    return;
  }
  if (target.dataset.preset) {
    if (confirm('Se reiniciará la demo y se perderán los cambios de este navegador. ¿Continuar?')) {
      cart = []; view = 'inicio'; dispatch('reset', { preset: target.dataset.preset }, 'Escenario cargado.');
    }
    return;
  }
  if (target.id === 'reset-demo') {
    if (confirm('¿Restablecer los datos ficticios del escenario actual?')) { cart = []; view = 'inicio'; dispatch('reset', { preset: state.preset }, 'Demo restablecida.'); }
  }
  if (target.id === 'sync-demo') dispatch('simulateSync', {}, 'Sincronización simulada.');
  if (target.id === 'export-csv') exportSalesCsv();
});

app.addEventListener('input', (event) => {
  if (event.target.id === 'product-search') {
    search = event.target.value;
    const position = event.target.selectionStart;
    render();
    const input = document.querySelector('#product-search');
    input?.focus();
    input?.setSelectionRange(position, position);
    return;
  }
  const saleForm = event.target.closest('#sale-form');
  if (saleForm && cart.length) {
    try {
      const data = formPayload(saleForm);
      const quote = priceSale(state, cartLinesForSale(), data.discountPct, data.tip);
      saleForm.querySelector('.cart-total strong').textContent = money(quote.total);
    } catch { /* La validación final muestra el error al guardar. */ }
  }
});

app.addEventListener('change', (event) => {
  if (event.target.id === 'role-select') {
    role = event.target.value;
    sessionStorage.setItem('pos-demo-role', role);
    view = 'inicio';
    render();
  }
  if (event.target.name === 'supplierId' && event.target.closest('[data-form="delivery"], [data-form="withdrawal"]')) {
    const form = event.target.closest('form');
    const options = state.products.filter((product) => product.supplierId === event.target.value && (form.dataset.form !== 'withdrawal' || product.trackStock));
    const select = form.querySelector('[name="productId"]');
    select.innerHTML = options.map((product) => `<option value="${esc(product.id)}">${esc(product.name)}</option>`).join('');
    const costInput = form.querySelector('[name="unitCost"]');
    if (costInput) costInput.value = options[0]?.cost ?? 0;
  }
  if (event.target.name === 'productId' && event.target.closest('[data-form="delivery"]')) {
    const form = event.target.closest('form');
    form.querySelector('[name="unitCost"]').value = state.products.find((product) => product.id === event.target.value)?.cost ?? 0;
  }
});

app.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.target;
  const payload = formPayload(form);
  if (form.id === 'sale-form') {
    const lines = cartLinesForSale();
    if (!lines.length) return;
    const result = dispatch('saleCreate', { ...payload, lines }, 'Venta registrada. Inventario y reportes actualizados.');
    if (result) { cart = []; modal = { type: 'receipt', id: result.id }; render(); }
    return;
  }
  if (form.id === 'settings-form') {
    payload.paymentMethods = new FormData(form).getAll('paymentMethods');
    payload.allowNegativeStock = new FormData(form).has('allowNegativeStock');
    const file = form.querySelector('[name="logoFile"]').files[0];
    if (file) {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 500000) {
        notify('El logo debe ser PNG, JPEG o WebP y medir menos de 500 KB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => { payload.logoDataUrl = reader.result; dispatch('settings', payload, 'Configuración guardada.'); };
      reader.onerror = () => notify('No se pudo leer el logo.', 'error');
      reader.readAsDataURL(file);
      return;
    }
    if (new FormData(form).has('removeLogo')) payload.logoDataUrl = '';
    dispatch('settings', payload, 'Configuración guardada.'); return;
  }
  const type = form.dataset.form;
  if (!type) return;
  if (type === 'product') {
    payload.id = modal.id;
    payload.trackStock = new FormData(form).has('trackStock');
    payload.active = new FormData(form).has('active');
    dispatch('productSave', payload, 'Producto guardado.'); return;
  }
  if (type === 'stock') { payload.productId = modal.id; dispatch('stockAdjust', payload, 'Stock actualizado.'); return; }
  if (type === 'supplier') { payload.id = modal.id; dispatch('supplierSave', payload, 'Proveedor guardado.'); return; }
  if (type === 'delivery') { dispatch('delivery', payload, 'Entrega registrada.'); return; }
  if (type === 'withdrawal') { dispatch('supplierWithdrawal', payload, 'Retiro registrado.'); return; }
  if (type === 'supplierPayment') { payload.supplierId = modal.id; dispatch('supplierPayment', payload, 'Pago registrado.'); return; }
  if (type === 'cashOpen') { dispatch('cashOpen', payload, 'Caja abierta.'); return; }
  if (type === 'cashMovement') { dispatch('cashMovement', payload, 'Movimiento registrado.'); return; }
  if (type === 'cashClose') { dispatch('cashClose', payload, 'Caja cerrada.'); return; }
  if (type === 'refund') { payload.saleId = modal.id; dispatch('saleRefund', payload, 'Venta devuelta.'); return; }
  if (type === 'employee') { payload.id = modal.id; payload.active = new FormData(form).has('active'); dispatch('employeeSave', payload, 'Integrante guardado.'); return; }
  if (type === 'customItem') {
    const productId = `manual-${crypto.randomUUID().slice(0, 8)}`;
    const product = { id: productId, sku: '', name: payload.name, category: 'Cargo manual', area: state.settings.areas[0], price: Number(payload.unitPrice), cost: 0, stock: 0, trackStock: false, supplierId: null, acquisition: 'none', color: '#ded6c8', emoji: '✦' };
    // Los cargos manuales son locales a la comanda; al cobrar se envían como líneas sin producto.
    cart.push({ productId, quantity: 1, custom: product });
    modal = null; render(); return;
  }
});

window.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY || !event.newValue) return;
  try { state = JSON.parse(event.newValue); render(); } catch { /* otra pestaña con datos incompletos */ }
});

render();
