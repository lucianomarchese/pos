import { STORAGE_KEY, createSeed } from './data.js';
import { activeCashSession, applyAction, cashExpected, dashboardStats, priceSale, sum, supplierBalance } from './domain.js';
import { PRODUCT_ICONS, icon } from './icons.js';
import { badge, card, chips, dock, empty, esc, field, pageIntro, segmented, selectField, statCard, topbar } from './ui.js';

const app = document.querySelector('#app');
let state;
try {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  state = stored?.version === 2 ? stored : createSeed();
} catch {
  state = createSeed();
}
let view = 'inicio';
let role = 'admin';
try { role = sessionStorage.getItem('pos-demo-role') || 'admin'; } catch { /* sesión sin almacenamiento */ }
let mode = document.documentElement?.dataset.mode === 'night' ? 'night' : 'day';
let cart = [];
let draft = { discountPct: 0, tip: 0, employeeId: null, paymentMethod: null };
let cartOpen = false;
let extrasOpen = false;
let search = '';
let areaFilter = 'Todas';
let modal = null;
let toastTimer;

const MODE_KEY = 'pos-kesar-mode';
const money = (amount) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: state.settings.currency, maximumFractionDigits: 2 }).format(Number(amount || 0));
const date = (value) => value ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const time = (value) => value ? new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—';
const shortDate = (value) => value ? new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short' }).format(new Date(value)) : '—';
const percent = (part, whole) => whole ? Math.min(100, Math.round(part / whole * 100)) : 0;
const productName = (id) => state.products.find((product) => product.id === id)?.name || 'Producto retirado';
const supplierName = (id) => state.suppliers.find((supplier) => supplier.id === id)?.name || 'Sin proveedor';
const employeeName = (id) => state.employees.find((employee) => employee.id === id)?.name || 'Equipo';
const isAdmin = () => role === 'admin';
const areaTone = (area) => `tone-${Math.max(0, state.settings.areas.indexOf(area)) % 4}`;
const activeEmployees = () => state.employees.filter((employee) => employee.active);
const THEME_INFO = [['azafran', 'Azafrán', 'Sindoor, índigo y caléndula'], ['pavo', 'Pavo real', 'Verde pavo real y caléndula'], ['indigo', 'Índigo', 'Índigo, granza y ocre']];
const TITLES = { inicio: 'Inicio', ventas: 'Ventas', inventario: 'Inventario', proveedores: 'Proveedores', caja: 'Caja', transacciones: 'Transacciones', equipo: 'Equipo', reportes: 'Reportes', configuracion: 'Configuración' };

function currentPerson() {
  const people = activeEmployees();
  const match = people.find((employee) => (isAdmin() ? employee.role === 'Administrador' : employee.role !== 'Administrador'));
  return (match || people[0])?.name || 'equipo';
}

function setMode(next) {
  mode = next;
  document.documentElement.dataset.mode = next;
  try { localStorage.setItem(MODE_KEY, next); } catch { /* sin almacenamiento: el modo vive solo en esta pestaña */ }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'night' ? '#0d1f24' : '#f8efe0');
  render();
}

function notify(message, kind = 'success') {
  const holder = document.querySelector('#toast-holder');
  if (!holder) return;
  holder.innerHTML = `<div class="toast ${kind}">${icon(kind === 'success' ? 'check' : 'close')}<span>${esc(message)}</span></div>`;
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

function shell() {
  const logo = state.settings.logoDataUrl && /^data:image\/(png|jpeg|webp);base64,/i.test(state.settings.logoDataUrl)
    ? `<img src="${esc(state.settings.logoDataUrl)}" alt="" />` : null;
  return `
    <div class="app-shell" data-theme="${esc(state.settings.theme || 'azafran')}" data-view="${view}" data-preset="${esc(state.preset)}">
      ${topbar({ home: view === 'inicio', title: TITLES[view], businessName: state.settings.businessName, subtitle: state.settings.subtitle, logo, cashOpen: Boolean(activeCashSession(state)), mode, person: currentPerson(), roleLabel: isAdmin() ? 'Administración' : 'Vendedor' })}
      <main class="content">${renderView()}</main>
      ${view === 'inicio' ? '' : dock(view)}
      <div id="toast-holder" aria-live="polite"></div>
      ${modal ? renderModal() : ''}
    </div>`;
}

function sinceText(value) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value)) / 60000));
  if (minutes < 1) return 'hace un momento';
  if (minutes < 60) return `hace ${minutes} min`;
  if (minutes < 1440) return `hace ${Math.round(minutes / 60)} h`;
  return `hace ${Math.round(minutes / 1440)} d`;
}

function renderHome() {
  const stats = dashboardStats(state);
  const session = activeCashSession(state);
  const today = new Date().toDateString();
  const todays = state.sales.filter((sale) => sale.status === 'completed' && new Date(sale.at).toDateString() === today);
  const now = new Date();
  const dayText = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  const onShift = state.timeEntries.filter((entry) => !entry.outAt).length;
  const tiles = [
    ['ventas', 'hot', 'sale', 'Ventas', 'Abrir comanda y cobrar'],
    ['caja', 'hot2', 'coins', 'Caja', session ? `Abierta · ${money(cashExpected(state, session.id))} esperado` : 'Cerrada · toca para abrir'],
    ['inventario', '', 'box', 'Inventario', stats.lowStock.length ? `${stats.lowStock.length} por reponer` : 'Existencias al día'],
    ['proveedores', '', 'hands', 'Proveedores', stats.supplierDue > 0 ? `${money(stats.supplierDue)} por pagar` : 'Cuentas al día'],
    ['transacciones', '', 'arrows', 'Transacciones', `${state.sales.length} registros`],
    ['equipo', '', 'clock', 'Equipo', onShift ? `${onShift} en turno` : 'Horas y comisiones'],
  ];
  return `<div class="home">
    <section class="welcome">
      <span class="eyebrow">${esc(state.settings.businessName)} · hoy</span>
      <h1>Namaste,<br><em>${esc(currentPerson())}</em></h1>
      <p class="welcome-date">${esc(dayText.charAt(0).toUpperCase() + dayText.slice(1))} · Turno ${now.getHours() < 14 ? 'mañana' : 'tarde'}</p>
      <div class="day-cash"><span>Caja del día</span><strong>${money(stats.todayRevenue)}</strong><small>${todays.length} ${todays.length === 1 ? 'venta' : 'ventas'} hoy${state.sales[0] ? ` · última ${sinceText(state.sales[0].at)}` : ''}</small></div>
      <button class="checador" data-view="equipo">${icon('clock')}<span><strong>Checador</strong><small>Registrar entrada o salida</small></span></button>
    </section>
    <div class="home-main">
      <div class="home-tiles">${tiles.map(([target, tone, iconName, title, note]) => `<button class="home-tile ${tone}" data-view="${target}"><span class="tile-icon">${icon(iconName)}</span><strong>${title}</strong><small>${esc(note)}</small></button>`).join('')}</div>
      <div class="home-links">
        <button class="home-link" data-view="reportes">${icon('chart')}<span><strong>Reportes</strong><small>Ventas, margen y medios de pago</small></span></button>
        ${isAdmin() ? `<button class="home-link" data-view="configuracion">${icon('gear')}<span><strong>Configuración</strong><small>Tema, áreas, impuestos y escenarios</small></span></button>` : ''}
      </div>
    </div>
  </div>`;
}

function renderProductCard(product) {
  const unavailable = product.trackStock && product.stock <= 0 && !state.settings.allowNegativeStock;
  const stockText = product.trackStock ? (product.stock <= 0 ? 'Agotado' : `${product.stock} en stock`) : 'Servicio';
  const low = product.trackStock && product.stock <= state.settings.lowStockAt;
  return `<button class="product-card ${unavailable ? 'unavailable' : ''}" data-add-product="${esc(product.id)}" ${unavailable ? 'disabled' : ''}>
    <span class="product-visual ${areaTone(product.area)}">${icon(product.icon)}</span>
    <span class="product-info"><strong>${esc(product.name)}</strong><span class="product-meta"><b>${money(product.price)}</b><em class="${low ? 'low' : ''}">${stockText}</em></span></span></button>`;
}

function cartLines() {
  return cart.map((line) => ({ ...line, product: line.custom || state.products.find((product) => product.id === line.productId) })).filter((line) => line.product);
}

function currentQuote() {
  try { return cart.length ? priceSale(state, cartLinesForSale(), draft.discountPct || 0, draft.tip || 0) : null; } catch { return null; }
}

function quoteDetail(quote) {
  if (!quote) return `Impuesto configurado: ${state.settings.taxRate}%`;
  return [`Subtotal ${money(quote.subtotal)}`, quote.discount ? `desc. −${money(quote.discount)}` : '', quote.tax ? `imp. ${money(quote.tax)}` : '', quote.tip ? `propina ${money(quote.tip)}` : ''].filter(Boolean).join(' · ');
}

function extrasSummary() {
  const parts = [Number(draft.discountPct) ? `${Number(draft.discountPct)}% desc.` : '', Number(draft.tip) ? `propina ${money(draft.tip)}` : ''].filter(Boolean);
  return parts.join(' · ') || 'Sin ajustes';
}

function renderCart() {
  const lines = cartLines();
  const quote = currentQuote();
  const count = lines.reduce((total, line) => total + line.quantity, 0);
  const total = money(quote?.total || 0);
  return `<aside class="cart-panel ${cartOpen ? 'open' : ''}">
    <button class="cart-summary" data-action="toggle-cart" aria-expanded="${cartOpen}">${icon('receipt')}<span>Ver comanda (${count})</span><strong>${total}</strong></button>
    <div class="cart-sheet">
      <header class="cart-head"><div><h2>Comanda</h2><small>${count ? `${count} ${count === 1 ? 'producto' : 'productos'}` : 'Nueva venta'}</small></div>${lines.length ? '<button class="text-link" data-action="clear-cart">Vaciar</button>' : ''}</header>
      <div class="cart-body">${lines.length ? lines.map((line) => `<div class="cart-line"><span class="qty">${line.quantity}</span><div class="cart-line-info"><strong>${esc(line.product.name)}</strong><small>${money(line.product.price)} c/u</small></div><div class="cart-line-end"><b>${money(line.product.price * line.quantity)}</b><div class="stepper"><button type="button" data-cart-minus="${esc(line.productId)}" aria-label="Quitar uno">${icon('minus')}</button><button type="button" data-cart-plus="${esc(line.productId)}" aria-label="Agregar uno">${icon('plus')}</button></div></div></div>`).join('') : empty('thali', 'Comanda vacía', 'Toca un producto para empezar.')}</div>
      <form id="sale-form" class="cart-footer">
        <div class="cart-row"><span class="cart-label">Atiende</span>${chips('employeeId', activeEmployees().map((employee) => [employee.id, employee.name]), draft.employeeId)}</div>
        <details class="cart-extras" ${extrasOpen ? 'open' : ''}><summary><span>Descuento y propina</span><small>${esc(extrasSummary())}</small></summary>
        <div class="cart-adjust">
          <label>Descuento %<span class="discount-row"><input type="number" name="discountPct" min="0" max="100" step="1" inputmode="decimal" value="${esc(draft.discountPct)}" />${[10, 15].map((value) => `<button type="button" class="mini-chip ${Number(draft.discountPct) === value ? 'active' : ''}" data-discount="${value}">${value}%</button>`).join('')}</span></label>
          <label>Propina<input type="number" name="tip" min="0" step="0.01" inputmode="decimal" value="${esc(draft.tip)}" /></label>
        </div></details>
        ${segmented('paymentMethod', state.settings.paymentMethods.map((method) => [method, method]), draft.paymentMethod)}
        <div class="cart-total"><span>Total<small>${esc(quoteDetail(quote))}</small></span><strong>${total}</strong></div>
        <button class="button primary wide pay-button" type="submit" ${!lines.length ? 'disabled' : ''}>Cobrar ${total}</button>
        <p class="cart-note">${activeCashSession(state) ? 'Caja abierta · efectivo disponible' : 'Abre la caja para cobrar en efectivo'}</p>
      </form>
    </div>
  </aside>`;
}

function renderPOS() {
  const categories = ['Todas', ...state.settings.areas];
  const products = state.products.filter((product) => product.active !== false && (areaFilter === 'Todas' || product.area === areaFilter) && `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(search.toLowerCase()));
  return `<div class="pos-layout"><section class="catalog">
      <div class="catalog-toolbar"><label class="search-box">${icon('search')}<input id="product-search" type="search" placeholder="Buscar producto o SKU" aria-label="Buscar producto" value="${esc(search)}" /></label><button class="button secondary" data-modal="customItem">${icon('plus')}Cargo manual</button></div>
      <div class="tabs" role="tablist">${categories.map((category) => `<button class="tab ${areaFilter === category ? 'active' : ''}" role="tab" aria-selected="${areaFilter === category}" data-area="${esc(category)}">${esc(category)}</button>`).join('')}</div>
      <div class="product-grid">${products.map(renderProductCard).join('') || empty('search', 'Sin resultados', 'Prueba otra búsqueda o agrega un producto.')}</div>
    </section>${renderCart()}</div>`;
}

function renderInventory() {
  const low = state.products.filter((product) => product.trackStock && product.stock <= state.settings.lowStockAt);
  return `${pageIntro('Productos, precios y movimientos organizados por SKU.', isAdmin() ? `<button class="button primary" data-modal="product">${icon('plus')}Nuevo producto</button>` : '')}
    <div class="stats-row">${statCard('box', 'Productos activos', state.products.filter((product) => product.active !== false).length, `${state.settings.areas.length} áreas`)}${statCard('chart', 'Con control de stock', state.products.filter((product) => product.trackStock).length, 'El resto son servicios')}${statCard('spark', 'Necesitan atención', low.length, `Umbral: ${state.settings.lowStockAt} unidades`, low.length ? 'alert' : '')}</div>
    ${card('Todos los productos', `<div class="table-wrap"><table><thead><tr><th>Producto</th><th>SKU / Área</th><th>Precio</th><th>Costo</th><th>Stock</th><th>Proveedor</th><th></th></tr></thead><tbody>${state.products.map((product) => `<tr><td><div class="table-product"><span class="mini-product ${areaTone(product.area)}">${icon(product.icon)}</span><div><strong>${esc(product.name)}</strong><small>${esc(product.category)}${product.active === false ? ' · Inactivo' : ''}</small></div></div></td><td><strong>${esc(product.sku)}</strong><small>${esc(product.area)}</small></td><td>${money(product.price)}</td><td>${money(product.cost)}</td><td>${product.trackStock ? badge(`${product.stock} unidades`, product.stock <= state.settings.lowStockAt ? 'warning' : 'good') : badge('Servicio', 'neutral')}</td><td>${esc(supplierName(product.supplierId))}</td><td>${isAdmin() ? `<div class="row-actions"><button class="icon-button small" data-modal="product" data-id="${esc(product.id)}" aria-label="Editar ${esc(product.name)}">✎</button>${product.trackStock ? `<button class="icon-button small" data-modal="stock" data-id="${esc(product.id)}" aria-label="Ajustar stock de ${esc(product.name)}">±</button>` : ''}</div>` : ''}</td></tr>`).join('')}</tbody></table></div>`, { eyebrow: 'Catálogo', className: 'table-card' })}
    ${card('Movimientos recientes', `<div class="timeline">${state.stockMovements.slice(0, 6).map((movement) => `<div class="timeline-row"><span class="timeline-icon ${movement.quantity > 0 ? 'in' : 'out'}">${icon(movement.quantity > 0 ? 'arrowDown' : 'arrowUp')}</span><div><strong>${esc(productName(movement.productId))}</strong><small>${esc(movement.reason)} · ${date(movement.at)}</small></div><b class="${movement.quantity > 0 ? 'positive' : 'negative'}">${movement.quantity > 0 ? '+' : ''}${movement.quantity}</b></div>`).join('') || empty('box', 'Sin movimientos', 'Las ventas y entregas aparecerán aquí.')}</div>`, { eyebrow: 'Trazabilidad' })}`;
}

function renderSuppliers() {
  return `${pageIntro('Entregas, consignación y saldos en una misma vista.', isAdmin() ? `<button class="button secondary" data-modal="supplier">${icon('plus')}Proveedor</button><button class="button secondary" data-modal="withdrawal">${icon('minus')}Retiro</button><button class="button primary" data-modal="delivery">${icon('box')}Registrar entrega</button>` : '')}
    <div class="supplier-grid">${state.suppliers.map((supplier) => { const balance = supplierBalance(state, supplier.id); const products = state.products.filter((product) => product.supplierId === supplier.id); return `<section class="supplier-card"><div class="supplier-card-top"><span class="round-icon">${icon('hands')}</span>${badge(balance > 0 ? 'Saldo pendiente' : balance < 0 ? 'Saldo a favor' : 'Al día', balance > 0 ? 'warning' : 'good')}</div><h2>${esc(supplier.name)}</h2><p>${esc(supplier.notes || 'Proveedor activo')}</p><div class="mini-stats"><div><span>Productos</span><strong>${products.length}</strong></div><div><span>Saldo</span><strong>${money(balance)}</strong></div></div><div class="supplier-card-footer"><small>${esc(supplier.contact || 'Sin contacto')}</small>${isAdmin() ? `<button class="button secondary small" data-modal="supplierPayment" data-id="${esc(supplier.id)}" ${balance <= 0 ? 'disabled' : ''}>Registrar pago</button>` : ''}</div></section>`; }).join('')}</div>
    ${card('Movimientos con proveedores', `<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Proveedor</th><th>Tipo</th><th>Referencia</th><th>Importe</th></tr></thead><tbody>${state.supplierLedger.map((entry) => `<tr><td>${date(entry.at)}</td><td><strong>${esc(supplierName(entry.supplierId))}</strong></td><td>${badge(entry.type, entry.amount < 0 ? 'good' : 'neutral')}</td><td>${esc(entry.referenceId || '—')}</td><td class="${entry.amount < 0 ? 'negative' : ''}">${entry.amount > 0 ? '+' : ''}${money(entry.amount)}</td></tr>`).join('') || `<tr><td colspan="5">${empty('hands', 'Sin movimientos', 'Registra una entrega o una venta en consignación.')}</td></tr>`}</tbody></table></div>`, { eyebrow: 'Cuentas por pagar', className: 'table-card' })}`;
}

function renderCash() {
  const session = activeCashSession(state);
  const expected = session ? cashExpected(state, session.id) : 0;
  const movements = session ? state.cashMovements.filter((movement) => movement.sessionId === session.id) : [];
  const closed = state.cashSessions.filter((item) => item.closedAt);
  const actions = !isAdmin()
    ? '<p class="cash-hint">La apertura, los movimientos y el cierre de caja corresponden a administración.</p>'
    : session
      ? `<button class="cash-action" data-modal="cashMovement" data-sign="+">${icon('arrowDown')}<span><strong>Ingreso</strong><small>Fondo, cambio, otros</small></span></button><button class="cash-action" data-modal="cashMovement" data-sign="-">${icon('arrowUp')}<span><strong>Egreso</strong><small>Insumos, pagos menores</small></span></button><button class="cash-action primary" data-modal="cashClose">${icon('check')}<span><strong>Cerrar caja</strong><small>Contar y comparar</small></span></button>`
      : `<button class="cash-action primary" data-modal="cashOpen">${icon('coins')}<span><strong>Abrir caja</strong><small>Registrar el fondo inicial</small></span></button>`;
  return `<section class="cash-hero ${session ? 'open' : ''}">
      <div class="cash-state"><span class="eyebrow">${session ? 'Caja abierta' : 'Caja cerrada'}</span><h1>${session ? `Desde las ${time(session.openedAt)}` : 'Sin sesión activa'}</h1><p>${session ? `Fondo inicial ${money(session.openingAmount)} · ${movements.length} ${movements.length === 1 ? 'movimiento' : 'movimientos'}` : 'Abre la caja para registrar cobros en efectivo.'}</p></div>
      <div class="cash-expected"><span>Saldo esperado</span><strong>${money(expected)}</strong></div>
    </section>
    <div class="cash-actions">${actions}</div>
    <div class="two-columns">
      ${card('Movimientos de la sesión', `<div class="timeline">${movements.slice(0, 10).map((movement) => `<div class="timeline-row"><span class="timeline-icon ${movement.amount > 0 ? 'in' : 'out'}">${icon(movement.amount > 0 ? 'arrowDown' : 'arrowUp')}</span><div><strong>${esc(movement.note)}</strong><small>${esc(movement.type)} · ${time(movement.at)}</small></div><b class="${movement.amount > 0 ? 'positive' : 'negative'}">${movement.amount > 0 ? '+' : ''}${money(movement.amount)}</b></div>`).join('') || empty('coins', 'Sin movimientos', session ? 'Las ventas en efectivo aparecerán aquí.' : 'Abre la caja para empezar la sesión.')}</div>`, { eyebrow: 'Efectivo' })}
      ${card('Cierres anteriores', `<div class="timeline">${closed.map((item) => `<div class="timeline-row"><span class="timeline-icon">${icon('receipt')}</span><div><strong>${shortDate(item.openedAt)} · ${time(item.openedAt)}–${time(item.closedAt)}</strong><small>Esperado ${money(item.expectedAmount)} · contado ${money(item.countedAmount)}</small></div>${badge(item.difference === 0 ? 'Cuadra' : item.difference > 0 ? `Sobrante ${money(item.difference)}` : `Faltante ${money(Math.abs(item.difference))}`, item.difference === 0 ? 'good' : item.difference > 0 ? 'warning' : 'danger')}</div>`).join('') || empty('receipt', 'Sin cierres', 'Cada cierre queda registrado con su diferencia.')}</div>`, { eyebrow: 'Historial' })}
    </div>`;
}

function renderTransactions() {
  const rows = state.sales;
  return `${pageIntro('Cada venta conserva productos, responsable, forma de pago y estado.', `<button class="button secondary" id="export-csv">${icon('arrowDown')}Exportar CSV</button>`)}
    ${card('Todas las transacciones', `<div class="table-wrap"><table><thead><tr><th>Fecha / ID</th><th>Productos</th><th>Responsable</th><th>Pago</th><th>Total</th><th>Estado</th><th></th></tr></thead><tbody>${rows.map((sale) => `<tr><td><strong>${date(sale.at)}</strong><small>${esc(sale.id)}</small></td><td>${esc(sale.items.map((item) => `${item.quantity}× ${item.name}`).join(', '))}</td><td>${esc(employeeName(sale.employeeId))}</td><td>${esc(sale.paymentMethod)}</td><td><strong>${money(sale.total)}</strong></td><td>${badge(sale.status === 'completed' ? 'Completada' : 'Devuelta', sale.status === 'completed' ? 'good' : 'warning')}</td><td>${isAdmin() && sale.status === 'completed' ? `<button class="button ghost small" data-modal="refund" data-id="${esc(sale.id)}">Devolver</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`, { eyebrow: 'Registro de ventas', aside: badge(`${rows.length} registros`, 'neutral'), className: 'table-card' })}`;
}

function renderTeam() {
  const activeSales = state.sales.filter((sale) => sale.status === 'completed');
  return `${pageIntro('Turnos, ventas asignadas y comisiones calculadas por persona.', isAdmin() ? `<button class="button primary" data-modal="employee">${icon('plus')}Integrante</button>` : '')}
    <div class="employee-grid">${state.employees.map((employee) => { const open = state.timeEntries.find((entry) => entry.employeeId === employee.id && !entry.outAt); const sales = activeSales.filter((sale) => sale.employeeId === employee.id); const hours = sum(state.timeEntries.filter((entry) => entry.employeeId === employee.id).map((entry) => entry.hours)); return `<section class="employee-card ${open ? 'on-shift' : ''}"><div class="employee-top"><span class="avatar">${esc(employee.name.slice(0, 2).toUpperCase())}</span>${badge(open ? `En turno desde ${time(open.inAt)}` : employee.active ? 'Fuera de turno' : 'Inactivo', open ? 'good' : 'neutral')}</div><h2>${esc(employee.name)}</h2><p>${esc(employee.role)}</p><div class="mini-stats"><div><span>Ventas</span><strong>${sales.length}</strong></div><div><span>Comisiones</span><strong>${money(sum(sales.map((sale) => sale.commission)))}</strong></div><div><span>Horas</span><strong>${hours.toFixed(2)}</strong></div></div><div class="employee-actions"><button class="button secondary" data-clock="${open ? 'out' : 'in'}" data-id="${esc(employee.id)}" ${!employee.active ? 'disabled' : ''}>${icon('clock')}${open ? 'Registrar salida' : 'Registrar entrada'}</button>${isAdmin() ? `<button class="icon-button" data-modal="employee" data-id="${esc(employee.id)}" aria-label="Editar ${esc(employee.name)}">✎</button>` : ''}</div></section>`; }).join('')}</div>
    ${card('Horas registradas', `<div class="table-wrap"><table><thead><tr><th>Persona</th><th>Entrada</th><th>Salida</th><th>Horas</th><th>Pago estimado</th></tr></thead><tbody>${state.timeEntries.map((entry) => `<tr><td><strong>${esc(employeeName(entry.employeeId))}</strong></td><td>${date(entry.inAt)}</td><td>${date(entry.outAt)}</td><td>${entry.hours == null ? 'En curso' : entry.hours.toFixed(2)}</td><td>${entry.pay == null ? '—' : money(entry.pay)}</td></tr>`).join('') || `<tr><td colspan="5">${empty('clock', 'Sin turnos registrados', 'Marca una entrada para empezar.')}</td></tr>`}</tbody></table></div>`, { eyebrow: 'Checador', className: 'table-card' })}`;
}

function renderReports() {
  const sales = state.sales.filter((sale) => sale.status === 'completed');
  const revenue = sum(sales.map((sale) => sale.total));
  const netSales = sum(sales.map((sale) => sale.subtotal - sale.discount));
  const cost = sum(sales.flatMap((sale) => sale.items.map((item) => item.unitCost * item.quantity)));
  const areaRows = state.settings.areas.map((area) => ({ name: area, amount: sum(sales.flatMap((sale) => sale.items.filter((item) => item.area === area).map((item) => item.quantity * item.unitPrice))) }));
  const areaTotal = sum(areaRows.map((row) => row.amount));
  const paymentRows = state.settings.paymentMethods.map((method) => ({ name: method, amount: sum(sales.filter((sale) => sale.paymentMethod === method).map((sale) => sale.total)) }));
  const bars = (rows, total, tone) => `<div class="bar-list">${rows.map((row, index) => `<div class="bar-row"><div><strong>${esc(row.name)}</strong><span>${money(row.amount)} · ${percent(row.amount, total)}%</span></div><div class="bar-track ${tone}"><span class="${tone === 'area' ? `tone-${index % 4}` : ''}" style="width:${percent(row.amount, total)}%"></span></div></div>`).join('')}</div>`;
  return `${pageIntro('Indicadores conectados directamente a cada acción de la demo.')}
    <div class="stats-row four">${statCard('chart', 'Ingresos registrados', money(revenue), 'Ventas completadas')}${statCard('spark', 'Margen estimado', money(netSales - cost), 'Venta neta menos costo')}${statCard('user', 'Comisiones', money(sum(sales.map((sale) => sale.commission))), 'Según la persona responsable')}${statCard('receipt', 'Ticket promedio', money(sales.length ? revenue / sales.length : 0), `${sales.length} ventas`)}</div>
    <div class="two-columns">${card('Ventas por área', bars(areaRows, areaTotal, 'area'), { eyebrow: 'Composición' })}${card('Medios de pago', bars(paymentRows, revenue, 'pay'), { eyebrow: 'Cobros' })}</div>
    ${card('Actividad del sistema', `<div class="timeline audit">${state.audit.slice(0, 12).map((item) => `<div class="timeline-row"><span class="timeline-dot"></span><div><strong>${esc(item.detail)}</strong><small>${esc(item.type)} · ${date(item.at)}</small></div></div>`).join('') || empty('chart', 'Aún no hay actividad', 'Prueba una acción para verla aquí.')}</div>`, { eyebrow: 'Traza de operación' })}`;
}

function renderIntegrationPanel() {
  const events = state.integrationEvents || [];
  const pending = events.filter((entry) => entry.status === 'pendiente').length;
  return `<div class="integration-events"><div class="integration-actions"><button class="button secondary small" id="sync-demo" ${pending ? '' : 'disabled'}>Simular sincronización ${pending ? `(${pending})` : ''}</button><button class="text-link" data-modal="balancePreview">Vista previa de balance</button></div>${events.slice(0, 4).map((entry) => `<div class="integration-event"><div><strong>${esc(entry.detail)}</strong><small>${date(entry.at)}</small></div>${badge(entry.status === 'pendiente' ? 'Pendiente' : 'Simulado', entry.status === 'pendiente' ? 'warning' : 'good')}</div>`).join('')}</div>`;
}

function renderSettings() {
  if (!isAdmin()) return `${pageIntro('La personalización corresponde al rol de administración.')}${empty('gear', 'Vista restringida', 'Cambia al rol de administración desde tu usuario para explorar las opciones.')}`;
  const methods = ['Efectivo', 'Tarjeta', 'Transferencia'];
  const logo = state.settings.logoDataUrl && /^data:image\/(png|jpeg|webp);base64,/i.test(state.settings.logoDataUrl) ? `<img src="${esc(state.settings.logoDataUrl)}" alt="" />` : '<span lang="hi">क</span>';
  return `${pageIntro('Configura identidad y reglas de operación; el efecto se ve en toda la demo.')}
    <div class="settings-grid">${card('Configuración del negocio', `<div class="identity-preview"><span class="brand-mark large">${logo}</span><div><strong>${esc(state.settings.businessName)}</strong><small>${esc(state.settings.subtitle)}</small></div></div>
      <form id="settings-form" class="form-grid">
        <fieldset class="theme-picker wide-field"><legend>Tema</legend>${THEME_INFO.map(([value, label, description]) => `<label class="theme-option"><input type="radio" name="theme" value="${value}" ${state.settings.theme === value ? 'checked' : ''} /><span class="theme-swatch" data-swatch="${value}"><i></i><i></i><i></i><i></i></span><strong>${label}</strong><small>${description}</small></label>`).join('')}</fieldset>
        <label>Nombre del negocio<input name="businessName" value="${esc(state.settings.businessName)}" required /></label>
        <label>Descripción breve<input name="subtitle" value="${esc(state.settings.subtitle)}" /></label>
        <label class="wide-field">Logo opcional (PNG, JPEG o WebP; máximo 500 KB)<input name="logoFile" type="file" accept="image/png,image/jpeg,image/webp" /></label>
        <label class="check wide-field"><input name="removeLogo" type="checkbox" /> Quitar logo actual</label>
        <label>Moneda de visualización<select name="currency">${['MXN', 'USD', 'EUR'].map((currency) => `<option ${state.settings.currency === currency ? 'selected' : ''}>${currency}</option>`).join('')}</select></label>
        <label>Áreas (separadas por coma)<input name="areas" value="${esc(state.settings.areas.join(', '))}" required /></label>
        <label>Impuesto %<input name="taxRate" type="number" min="0" max="100" step="0.01" value="${state.settings.taxRate}" /></label>
        <label>Alerta de stock bajo<input name="lowStockAt" type="number" min="0" step="1" value="${state.settings.lowStockAt}" /></label>
        <fieldset class="wide-field"><legend>Medios de pago</legend>${methods.map((method) => `<label class="check"><input type="checkbox" name="paymentMethods" value="${method}" ${state.settings.paymentMethods.includes(method) ? 'checked' : ''} /> ${method}</label>`).join('')}</fieldset>
        <label class="check wide-field"><input type="checkbox" name="allowNegativeStock" ${state.settings.allowNegativeStock ? 'checked' : ''} /> Permitir stock negativo</label>
        <button class="button primary wide-field" type="submit">Guardar configuración</button>
      </form>`, { eyebrow: 'Identidad y operación' })}
      <div class="settings-side">
        ${card('Prueba otro negocio', `<p class="muted">Cada escenario inicia una base ficticia distinta. Al cambiar, se reinicia el progreso de esta demo.</p><div class="preset-options"><button data-preset="lounge" class="preset ${state.preset === 'lounge' ? 'active' : ''}">${icon('lotus')}<span><strong>Kesar</strong><small>Bienestar, boutique, cocina y barra</small></span></button><button data-preset="retail" class="preset ${state.preset === 'retail' ? 'active' : ''}">${icon('beans')}<span><strong>Mercado Norte</strong><small>Tienda, compras y café</small></span></button></div><button class="text-link danger" id="reset-demo">Restablecer escenario actual</button>`, { eyebrow: 'Escenarios de ejemplo' })}
        ${card('Conexiones posibles', `<div class="integration"><span class="round-icon">${icon('arrows')}</span><div><strong>Catálogo web</strong><small>Conector de muestra · sin cuenta real</small></div>${badge('Demo', 'neutral')}</div><div class="integration"><span class="round-icon">${icon('receipt')}</span><div><strong>Balances por correo</strong><small>Vista previa en esta demo</small></div>${badge('Demo', 'neutral')}</div><p class="fine-print">En un proyecto real, estos conectores se diseñan según las herramientas y permisos del negocio.</p>${renderIntegrationPanel()}`, { eyebrow: 'Integraciones' })}
      </div></div>`;
}

function renderView() {
  return ({ inicio: renderHome, ventas: renderPOS, inventario: renderInventory, proveedores: renderSuppliers, caja: renderCash, transacciones: renderTransactions, equipo: renderTeam, reportes: renderReports, configuracion: renderSettings }[view] || renderHome)();
}

function render() {
  document.title = `${state.settings.businessName} · POS Studio`;
  app.innerHTML = shell();
}

function formActions(label, tone = 'primary') {
  return `<div class="form-actions"><button type="button" class="button secondary" data-close>Cancelar</button><button class="button ${tone}">${label}</button></div>`;
}

function modalContent() {
  const { type, id } = modal;
  if (type === 'more') {
    const links = [['proveedores', 'Proveedores', 'hands'], ['transacciones', 'Transacciones', 'arrows'], ['reportes', 'Reportes', 'chart'], ...(isAdmin() ? [['configuracion', 'Configuración', 'gear']] : [])];
    return { title: 'Más secciones', note: 'El resto de la operación, a un toque.', body: `<div class="sheet-links">${links.map(([target, label, iconName]) => `<button data-view="${target}">${icon(iconName)}<span>${label}</span>${icon('back', { className: 'chevron' })}</button>`).join('')}<button data-view="inicio">${icon('home')}<span>Inicio</span>${icon('back', { className: 'chevron' })}</button></div>` };
  }
  if (type === 'role') {
    const options = [['admin', 'Administración', 'Configuración, ajustes de stock y cierres'], ['seller', 'Vendedor', 'Vender, cobrar y registrar su turno']];
    return { title: '¿Quién usa el POS?', note: 'Cambia la vista para probar permisos. No es autenticación real.', body: `<div class="sheet-links">${options.map(([value, label, description]) => `<button class="${role === value ? 'active' : ''}" data-role="${value}">${icon('user')}<span>${label}<small>${description}</small></span>${role === value ? icon('check', { className: 'chevron' }) : ''}</button>`).join('')}</div>` };
  }
  if (type === 'product') {
    const item = state.products.find((product) => product.id === id) || {};
    const current = item.icon || 'spark';
    return { title: id ? 'Editar producto' : 'Nuevo producto', note: 'El catálogo se refleja de inmediato en el punto de venta.', body: `<form data-form="product" class="form-grid">${field('Nombre', 'name', item.name, 'text', 'required')}${field('SKU', 'sku', item.sku, 'text', 'required')}${field('Categoría', 'category', item.category, 'text', 'required')}${selectField('Área', 'area', state.settings.areas.map((area) => [area, area]), item.area)}${field('Precio', 'price', item.price ?? '', 'number', 'min="0.01" step="0.01" required')}${field('Costo', 'cost', item.cost ?? 0, 'number', 'min="0" step="0.01" required')}${selectField('Proveedor', 'supplierId', [['', 'Sin proveedor'], ...state.suppliers.map((supplier) => [supplier.id, supplier.name])], item.supplierId)}${selectField('Modalidad', 'acquisition', [['purchase', 'Compra'], ['consignment', 'Consignación']], item.acquisition)}<fieldset class="icon-picker wide-field"><legend>Ícono</legend>${PRODUCT_ICONS.map((name) => `<label><input type="radio" name="icon" value="${name}" aria-label="${name}" ${current === name ? 'checked' : ''} /><span>${icon(name)}</span></label>`).join('')}</fieldset><label class="check wide-field"><input name="trackStock" type="checkbox" ${item.trackStock ? 'checked' : ''} /> Controlar existencias</label><label class="check wide-field"><input name="active" type="checkbox" ${item.active !== false ? 'checked' : ''} /> Disponible para venta</label>${formActions('Guardar producto')}</form>` };
  }
  if (type === 'stock') {
    const product = state.products.find((item) => item.id === id);
    return { title: 'Ajustar stock', note: `${product?.name || ''} · Actual: ${product?.stock ?? '—'}`, body: `<form data-form="stock" class="form-grid">${field('Cantidad (+ entrada / − salida)', 'quantity', '', 'number', 'step="1" required')}${field('Motivo', 'reason', '', 'text', 'required')}${formActions('Registrar ajuste')}</form>` };
  }
  if (type === 'supplier') {
    const item = state.suppliers.find((supplier) => supplier.id === id) || {};
    return { title: id ? 'Editar proveedor' : 'Nuevo proveedor', note: 'Contactos y cuentas por pagar en un solo lugar.', body: `<form data-form="supplier" class="form-grid">${field('Nombre', 'name', item.name, 'text', 'required')}${field('Contacto', 'contact', item.contact)}<label class="wide-field">Notas<textarea name="notes">${esc(item.notes || '')}</textarea></label>${formActions('Guardar proveedor')}</form>` };
  }
  if (type === 'delivery') {
    const supplier = state.suppliers[0];
    const products = state.products.filter((product) => product.supplierId === supplier?.id);
    return { title: 'Registrar entrega', note: 'Una entrega aumenta el stock; una compra también crea saldo por pagar.', body: `<form data-form="delivery" class="form-grid">${selectField('Proveedor', 'supplierId', state.suppliers.map((item) => [item.id, item.name]), supplier?.id)}${selectField('Producto', 'productId', products.map((product) => [product.id, product.name]), products[0]?.id)}${field('Cantidad', 'quantity', 1, 'number', 'min="1" step="1" required')}${field('Costo unitario', 'unitCost', products[0]?.cost ?? 0, 'number', 'min="0" step="0.01" required')}${formActions('Registrar entrega')}</form>` };
  }
  if (type === 'withdrawal') {
    const supplier = state.suppliers[0];
    const products = state.products.filter((product) => product.supplierId === supplier?.id && product.trackStock);
    return { title: 'Retiro de proveedor', note: 'Reduce existencias y ajusta el saldo si fue una compra.', body: `<form data-form="withdrawal" class="form-grid">${selectField('Proveedor', 'supplierId', state.suppliers.map((item) => [item.id, item.name]), supplier?.id)}${selectField('Producto', 'productId', products.map((product) => [product.id, product.name]), products[0]?.id)}${field('Cantidad', 'quantity', 1, 'number', 'min="1" step="1" required')}${formActions('Registrar retiro')}</form>` };
  }
  if (type === 'supplierPayment') {
    const supplier = state.suppliers.find((entry) => entry.id === id);
    return { title: 'Pagar proveedor', note: `${supplier?.name} · Saldo ${money(supplierBalance(state, id))}`, body: `<form data-form="supplierPayment" class="form-grid">${field('Monto', 'amount', supplierBalance(state, id), 'number', 'min="0.01" step="0.01" required')}${field('Referencia', 'reference', '')}${formActions('Registrar pago')}</form>` };
  }
  if (type === 'cashOpen') return { title: 'Abrir caja', note: 'Registra el efectivo inicial antes de cobrar.', body: `<form data-form="cashOpen" class="form-grid">${field('Fondo inicial', 'openingAmount', 1000, 'number', 'min="0" step="0.01" required')}${formActions('Abrir caja')}</form>` };
  if (type === 'cashMovement') {
    const title = modal.sign === '-' ? 'Registrar egreso' : modal.sign === '+' ? 'Registrar ingreso' : 'Movimiento de caja';
    const amountField = modal.sign ? field('Importe', 'amount', '', 'number', 'min="0.01" step="0.01" inputmode="decimal" required') : field('Importe (+ ingreso / − egreso)', 'amount', '', 'number', 'step="0.01" required');
    return { title, note: modal.sign === '-' ? 'Sale efectivo de la caja: insumos, pagos menores, retiros.' : 'Entra efectivo a la caja fuera de una venta.', body: `<form data-form="cashMovement" class="form-grid">${amountField}${field('Motivo', 'note', '', 'text', 'required')}${formActions('Guardar movimiento')}</form>` };
  }
  if (type === 'cashClose') return { title: 'Cerrar caja', note: `Saldo esperado: ${money(cashExpected(state, activeCashSession(state).id))}`, body: `<form data-form="cashClose" class="form-grid">${field('Efectivo contado', 'countedAmount', cashExpected(state, activeCashSession(state).id), 'number', 'min="0" step="0.01" required')}${formActions('Cerrar y comparar')}</form>` };
  if (type === 'refund') {
    const sale = state.sales.find((entry) => entry.id === id);
    return { title: 'Devolver venta', note: `${sale?.id} · ${money(sale?.total)}. Se revertirán stock y saldos relacionados.`, body: `<form data-form="refund" class="form-grid">${field('Motivo de devolución', 'reason', '', 'text', 'required')}${formActions('Confirmar devolución', 'danger')}</form>` };
  }
  if (type === 'employee') {
    const item = state.employees.find((employee) => employee.id === id) || {};
    return { title: id ? 'Editar integrante' : 'Nuevo integrante', note: 'La comisión se calcula sobre venta neta antes de impuestos.', body: `<form data-form="employee" class="form-grid">${field('Nombre', 'name', item.name, 'text', 'required')}${field('Rol', 'role', item.role || 'Vendedor', 'text', 'required')}${field('Tarifa por hora', 'hourlyRate', item.hourlyRate ?? 0, 'number', 'min="0" step="0.01" required')}${field('Comisión %', 'commissionRate', item.commissionRate ?? 0, 'number', 'min="0" max="100" step="0.01" required')}<label class="check wide-field"><input name="active" type="checkbox" ${item.active !== false ? 'checked' : ''} /> Integrante activo</label>${formActions('Guardar integrante')}</form>` };
  }
  if (type === 'customItem') return { title: 'Cargo manual', note: 'Para servicios o ajustes que no están en el catálogo.', body: `<form data-form="customItem" class="form-grid">${field('Concepto', 'name', '', 'text', 'required')}${field('Precio', 'unitPrice', '', 'number', 'min="0.01" step="0.01" required')}${formActions('Agregar a la comanda')}</form>` };
  if (type === 'receipt') {
    const sale = state.sales.find((entry) => entry.id === id);
    return { title: 'Venta registrada', note: `Comprobante ${sale?.id}`, body: `<div class="receipt"><div class="receipt-head"><span class="brand-mark"><span lang="hi">क</span></span><strong>${esc(state.settings.businessName)}</strong><small>${date(sale?.at)} · atendió ${esc(employeeName(sale?.employeeId))}</small></div>${sale?.items.map((item) => `<div><span>${item.quantity} × ${esc(item.name)}</span><strong>${money(item.quantity * item.unitPrice)}</strong></div>`).join('') || ''}<div><span>Descuento</span><strong>− ${money(sale?.discount)}</strong></div><div><span>Impuesto</span><strong>${money(sale?.tax)}</strong></div><div><span>Propina</span><strong>${money(sale?.tip)}</strong></div><div class="receipt-total"><span>Total · ${esc(sale?.paymentMethod)}</span><strong>${money(sale?.total)}</strong></div><p class="receipt-thanks">Dhanyavaad · gracias por tu visita</p></div><button class="button primary wide" data-close>Listo</button>` };
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
  return `<div class="modal-backdrop" data-backdrop><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(content.title)}"><div class="modal-head"><div><span class="eyebrow">${esc(state.settings.businessName)} · POS Studio</span><h2>${esc(content.title)}</h2>${content.note ? `<p>${esc(content.note)}</p>` : ''}</div><button class="icon-button close-button" data-close aria-label="Cerrar">${icon('close')}</button></div>${content.body}</div></div>`;
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

function refreshTotals() {
  const quote = currentQuote();
  const total = money(quote?.total || 0);
  const panel = document.querySelector('.cart-panel');
  if (!panel) return;
  panel.querySelector('.cart-total strong').textContent = total;
  panel.querySelector('.cart-total small').textContent = quoteDetail(quote);
  panel.querySelector('.pay-button').textContent = `Cobrar ${total}`;
  panel.querySelector('.cart-summary strong').textContent = total;
  panel.querySelector('.cart-extras small').textContent = extrasSummary();
}

function exportSalesCsv() {
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = [['ID', 'Fecha', 'Estado', 'Responsable', 'Pago', 'Productos', 'Subtotal', 'Descuento', 'Impuesto', 'Propina', 'Total'],
    ...state.sales.map((sale) => [sale.id, sale.at, sale.status, employeeName(sale.employeeId), sale.paymentMethod,
      sale.items.map((item) => `${item.quantity}x ${item.name}`).join('; '), sale.subtotal, sale.discount, sale.tax, sale.tip, sale.total])];
  const csv = '﻿' + rows.map((row) => row.map(quote).join(',')).join('\r\n');
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
    if (event.target.matches?.('[data-backdrop]')) { modal = null; render(); }
    return;
  }
  const { dataset } = target;
  if (dataset.view) { view = dataset.view; modal = null; cartOpen = false; render(); return; }
  if (dataset.close !== undefined) { modal = null; render(); return; }
  if (dataset.modal) { modal = { type: dataset.modal, id: dataset.id || null, sign: dataset.sign || null }; render(); return; }
  if (dataset.action === 'toggle-mode') { setMode(mode === 'night' ? 'day' : 'night'); return; }
  if (dataset.action === 'toggle-cart') { cartOpen = !cartOpen; render(); return; }
  if (dataset.action === 'clear-cart') { cart = []; render(); return; }
  if (dataset.role) {
    role = dataset.role;
    try { sessionStorage.setItem('pos-demo-role', role); } catch { /* sesión sin almacenamiento */ }
    view = 'inicio'; modal = null; render(); return;
  }
  if (dataset.area) { areaFilter = dataset.area; render(); return; }
  if (dataset.discount) { draft.discountPct = Number(dataset.discount); render(); return; }
  if (dataset.addProduct) {
    const existing = cart.find((line) => line.productId === dataset.addProduct);
    if (existing) existing.quantity += 1; else cart.push({ productId: dataset.addProduct, quantity: 1 });
    render(); return;
  }
  if (dataset.cartPlus) { cart.find((line) => line.productId === dataset.cartPlus).quantity += 1; render(); return; }
  if (dataset.cartMinus) {
    const line = cart.find((item) => item.productId === dataset.cartMinus);
    line.quantity -= 1;
    if (!line.quantity) cart = cart.filter((item) => item !== line);
    render(); return;
  }
  if (dataset.clock) {
    dispatch(dataset.clock === 'in' ? 'clockIn' : 'clockOut', { employeeId: dataset.id }, dataset.clock === 'in' ? 'Entrada registrada.' : 'Salida registrada.');
    return;
  }
  if (dataset.preset) {
    if (confirm('Se reiniciará la demo y se perderán los cambios de este navegador. ¿Continuar?')) {
      cart = []; view = 'inicio'; dispatch('reset', { preset: dataset.preset }, 'Escenario cargado.');
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
  if (event.target.closest('#sale-form') && ['discountPct', 'tip'].includes(event.target.name)) {
    draft[event.target.name] = event.target.value;
    refreshTotals();
  }
});

// <details> no burbujea 'toggle': se escucha en captura para recordar si quedó abierto entre renders.
app.addEventListener('toggle', (event) => {
  if (event.target.matches?.('.cart-extras')) extrasOpen = event.target.open;
}, true);

app.addEventListener('change', (event) => {
  if (event.target.closest('#sale-form') && ['employeeId', 'paymentMethod'].includes(event.target.name)) {
    draft[event.target.name] = event.target.value;
    return;
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
    if (result) {
      cart = []; cartOpen = false;
      draft = { ...draft, discountPct: 0, tip: 0 };
      modal = { type: 'receipt', id: result.id }; render();
    }
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
  if (type === 'cashMovement') {
    if (modal.sign) payload.amount = (modal.sign === '-' ? -1 : 1) * Math.abs(Number(payload.amount));
    dispatch('cashMovement', payload, 'Movimiento registrado.'); return;
  }
  if (type === 'cashClose') { dispatch('cashClose', payload, 'Caja cerrada.'); return; }
  if (type === 'refund') { payload.saleId = modal.id; dispatch('saleRefund', payload, 'Venta devuelta.'); return; }
  if (type === 'employee') { payload.id = modal.id; payload.active = new FormData(form).has('active'); dispatch('employeeSave', payload, 'Integrante guardado.'); return; }
  if (type === 'customItem') {
    const productId = `manual-${crypto.randomUUID().slice(0, 8)}`;
    const product = { id: productId, sku: '', name: payload.name, category: 'Cargo manual', area: state.settings.areas[0], price: Number(payload.unitPrice), cost: 0, stock: 0, trackStock: false, supplierId: null, acquisition: 'none', icon: 'spark' };
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
