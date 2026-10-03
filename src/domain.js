import { createSeed, nextId } from './data.js';

export const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
export const sum = (values) => roundMoney(values.reduce((total, value) => total + Number(value || 0), 0));
const requireText = (value, label) => {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`${label} es obligatorio.`);
  return text;
};
const requireNumber = (value, label, min = 0) => {
  if (value === '' || value === null || value === undefined) throw new Error(`${label} es obligatorio.`);
  const number = Number(value);
  if (!Number.isFinite(number) || number < min) throw new Error(`${label} debe ser ${min > 0 ? 'mayor que cero' : 'cero o mayor'}.`);
  return number;
};
const mustFind = (items, id, label) => {
  const found = items.find((item) => item.id === id);
  if (!found) throw new Error(`${label} no encontrado.`);
  return found;
};
const record = (state, type, detail) => state.audit.unshift({ id: nextId('audit'), at: new Date().toISOString(), type, detail });
const queueSync = (state, detail) => state.integrationEvents.unshift({ id: nextId('sync'), at: new Date().toISOString(), type: 'Catálogo web', detail, status: 'pendiente' });

export function activeCashSession(state) {
  return state.cashSessions.find((session) => !session.closedAt) || null;
}

export function cashExpected(state, sessionId) {
  const session = mustFind(state.cashSessions, sessionId, 'Caja');
  return roundMoney(session.openingAmount + sum(state.cashMovements.filter((movement) => movement.sessionId === sessionId).map((movement) => movement.amount)));
}

export function supplierBalance(state, supplierId) {
  return sum(state.supplierLedger.filter((entry) => entry.supplierId === supplierId).map((entry) => entry.amount));
}

export function priceSale(state, lines, discountPct = 0, tip = 0) {
  if (!Array.isArray(lines) || !lines.length) throw new Error('Agrega al menos un producto a la venta.');
  const discountRate = requireNumber(discountPct, 'Descuento');
  if (discountRate > 100) throw new Error('El descuento no puede superar el 100 %.');
  const safeTip = requireNumber(tip, 'Propina');
  const items = lines.map((line) => {
    const quantity = requireNumber(line.quantity, 'Cantidad', 1);
    if (!Number.isInteger(quantity)) throw new Error('La cantidad debe ser entera.');
    if (line.productId) {
      const product = mustFind(state.products, line.productId, 'Producto');
      return {
        productId: product.id, name: product.name, sku: product.sku, area: product.area,
        quantity, unitPrice: product.price, unitCost: product.cost,
        supplierId: product.supplierId, acquisition: product.acquisition,
      };
    }
    return {
      productId: null, name: requireText(line.name, 'Nombre del cargo'), sku: '', area: state.settings.areas[0],
      quantity, unitPrice: requireNumber(line.unitPrice, 'Precio', 0.01), unitCost: 0,
      supplierId: null, acquisition: 'none',
    };
  });
  const subtotal = sum(items.map((item) => item.quantity * item.unitPrice));
  const discount = roundMoney(subtotal * discountRate / 100);
  const taxable = roundMoney(subtotal - discount);
  const tax = roundMoney(taxable * Number(state.settings.taxRate || 0) / 100);
  return { items, subtotal, discountPct: discountRate, discount, tax, tip: safeTip, total: roundMoney(taxable + tax + safeTip) };
}

function saleCreate(state, payload) {
  const paymentMethod = requireText(payload.paymentMethod, 'Forma de pago');
  if (!state.settings.paymentMethods.includes(paymentMethod)) throw new Error('Forma de pago no habilitada.');
  const employee = mustFind(state.employees, payload.employeeId, 'Empleado');
  if (!employee.active) throw new Error('El empleado no está activo.');
  const priced = priceSale(state, payload.lines, payload.discountPct, payload.tip);
  const quantities = new Map();
  for (const item of priced.items) {
    if (!item.productId) continue;
    quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
  }
  for (const [productId, quantity] of quantities) {
    const product = mustFind(state.products, productId, 'Producto');
    if (product.active === false) throw new Error(`${product.name} está desactivado.`);
    if (product.trackStock && !state.settings.allowNegativeStock && product.stock < quantity) {
      throw new Error(`Stock insuficiente de ${product.name}: quedan ${product.stock}.`);
    }
  }
  if (paymentMethod === 'Efectivo' && !activeCashSession(state)) throw new Error('Abre la caja antes de cobrar en efectivo.');

  const at = new Date().toISOString();
  const saleId = nextId('sale');
  const commission = roundMoney((priced.subtotal - priced.discount) * Number(employee.commissionRate || 0) / 100);
  const sale = { id: saleId, at, employeeId: employee.id, paymentMethod, ...priced, commission, status: 'completed' };
  state.sales.unshift(sale);
  for (const [productId, quantity] of quantities) {
    const product = mustFind(state.products, productId, 'Producto');
    if (!product.trackStock) continue;
    product.stock -= quantity;
    state.stockMovements.unshift({ id: nextId('stock'), at, productId, quantity: -quantity, reason: 'Venta', referenceId: saleId });
  }
  if (state.stockMovements.some((movement) => movement.referenceId === saleId)) queueSync(state, `Stock tras venta ${saleId}`);
  for (const item of priced.items) {
    if (item.acquisition !== 'consignment' || !item.supplierId) continue;
    state.supplierLedger.unshift({ id: nextId('ledger'), at, supplierId: item.supplierId, amount: roundMoney(item.unitCost * item.quantity), type: 'Venta en consignación', referenceId: saleId });
  }
  if (paymentMethod === 'Efectivo') {
    state.cashMovements.unshift({ id: nextId('cash'), at, sessionId: activeCashSession(state).id, amount: priced.total, type: 'Venta', note: `Venta ${saleId}`, referenceId: saleId });
  }
  record(state, 'VENTA', `${saleId} · ${priced.total} ${state.settings.currency}`);
  return { state, result: sale };
}

function saleRefund(state, payload) {
  const sale = mustFind(state.sales, payload.saleId, 'Venta');
  if (sale.status === 'refunded') throw new Error('La venta ya fue devuelta.');
  const at = new Date().toISOString();
  sale.status = 'refunded';
  sale.refundedAt = at;
  sale.refundReason = requireText(payload.reason, 'Motivo');
  for (const item of sale.items) {
    if (item.productId) {
      const product = state.products.find((entry) => entry.id === item.productId);
      if (product?.trackStock) {
        product.stock += item.quantity;
        state.stockMovements.unshift({ id: nextId('stock'), at, productId: product.id, quantity: item.quantity, reason: 'Devolución', referenceId: sale.id });
      }
    }
    if (item.acquisition === 'consignment' && item.supplierId) {
      state.supplierLedger.unshift({ id: nextId('ledger'), at, supplierId: item.supplierId, amount: -roundMoney(item.unitCost * item.quantity), type: 'Devolución de venta', referenceId: sale.id });
    }
  }
  if (state.stockMovements.some((movement) => movement.referenceId === sale.id && movement.reason === 'Devolución')) queueSync(state, `Stock tras devolución ${sale.id}`);
  if (sale.paymentMethod === 'Efectivo') {
    const session = activeCashSession(state);
    if (!session) throw new Error('Abre la caja antes de devolver una venta en efectivo.');
    state.cashMovements.unshift({ id: nextId('cash'), at, sessionId: session.id, amount: -sale.total, type: 'Devolución', note: sale.refundReason, referenceId: sale.id });
  }
  record(state, 'DEVOLUCIÓN', `${sale.id} · ${sale.refundReason}`);
  return { state, result: sale };
}

export function applyAction(current, action, payload = {}) {
  const state = structuredClone(current);
  state.integrationEvents ||= [];
  let result = null;
  switch (action) {
    case 'reset': return { state: createSeed(payload.preset || state.preset), result: null };
    case 'settings': {
      const previousAreas = state.settings.areas;
      const nextAreas = String(payload.areas || '').split(',').map((value) => value.trim()).filter(Boolean);
      if (!nextAreas.length) throw new Error('Define al menos un área.');
      if (new Set(nextAreas.map((area) => area.toLowerCase())).size !== nextAreas.length) throw new Error('Las áreas no pueden repetirse.');
      if (nextAreas.length === previousAreas.length) {
        for (const product of state.products) {
          const index = previousAreas.indexOf(product.area);
          if (index >= 0) product.area = nextAreas[index];
        }
        for (const sale of state.sales) {
          for (const item of sale.items) {
            const index = previousAreas.indexOf(item.area);
            if (index >= 0) item.area = nextAreas[index];
          }
        }
      } else {
        const removedInUse = previousAreas.some((area) => !nextAreas.includes(area) && state.products.some((product) => product.area === area));
        if (removedInUse) throw new Error('Reasigna los productos antes de quitar un área.');
      }
      state.settings.businessName = requireText(payload.businessName, 'Nombre del negocio');
      state.settings.subtitle = String(payload.subtitle || '').trim();
      if (payload.logoDataUrl !== undefined) {
        if (payload.logoDataUrl && (!/^data:image\/(png|jpeg|webp);base64,/i.test(payload.logoDataUrl) || payload.logoDataUrl.length > 700000)) {
          throw new Error('El logo debe ser PNG, JPEG o WebP y medir menos de 500 KB.');
        }
        state.settings.logoDataUrl = payload.logoDataUrl || null;
      }
      state.settings.accent = /^#[0-9a-f]{6}$/i.test(payload.accent) ? payload.accent : state.settings.accent;
      state.settings.currency = ['MXN', 'USD', 'EUR'].includes(payload.currency) ? payload.currency : state.settings.currency;
      state.settings.taxRate = requireNumber(payload.taxRate, 'Impuesto');
      state.settings.lowStockAt = requireNumber(payload.lowStockAt, 'Umbral de stock');
      state.settings.allowNegativeStock = Boolean(payload.allowNegativeStock);
      state.settings.areas = nextAreas;
      state.settings.paymentMethods = Array.isArray(payload.paymentMethods) ? payload.paymentMethods.filter((method) => ['Efectivo', 'Tarjeta', 'Transferencia'].includes(method)) : [];
      if (!state.settings.paymentMethods.length) throw new Error('Habilita al menos una forma de pago.');
      record(state, 'CONFIGURACIÓN', 'Configuración de negocio actualizada');
      break;
    }
    case 'productSave': {
      const name = requireText(payload.name, 'Nombre');
      const sku = requireText(payload.sku, 'SKU').toUpperCase();
      if (state.products.some((product) => product.sku === sku && product.id !== payload.id)) throw new Error('Ese SKU ya existe.');
      const product = payload.id ? mustFind(state.products, payload.id, 'Producto') : { id: nextId('product'), stock: 0 };
      product.name = name;
      product.sku = sku;
      product.category = requireText(payload.category, 'Categoría');
      product.area = requireText(payload.area, 'Área');
      if (!state.settings.areas.includes(product.area)) throw new Error('El área seleccionada no existe.');
      product.price = roundMoney(requireNumber(payload.price, 'Precio', 0.01));
      product.cost = roundMoney(requireNumber(payload.cost, 'Costo'));
      product.trackStock = Boolean(payload.trackStock);
      product.supplierId = payload.supplierId || null;
      if (product.supplierId) mustFind(state.suppliers, product.supplierId, 'Proveedor');
      product.acquisition = payload.supplierId ? (payload.acquisition === 'consignment' ? 'consignment' : 'purchase') : 'none';
      product.active = payload.active !== false;
      product.color = payload.color || '#d9d3c5';
      product.emoji = String(payload.emoji || '◈').slice(0, 3);
      if (!payload.id) state.products.unshift(product);
      queueSync(state, `Producto ${payload.id ? 'editado' : 'creado'}: ${name}`);
      record(state, 'PRODUCTO', `${payload.id ? 'Editado' : 'Creado'}: ${name}`);
      result = product;
      break;
    }
    case 'stockAdjust': {
      const product = mustFind(state.products, payload.productId, 'Producto');
      if (!product.trackStock) throw new Error('Ese producto no controla existencias.');
      const quantity = Number(payload.quantity);
      if (!Number.isInteger(quantity) || quantity === 0) throw new Error('Indica una cantidad entera distinta de cero.');
      if (!state.settings.allowNegativeStock && product.stock + quantity < 0) throw new Error('El ajuste dejaría stock negativo.');
      product.stock += quantity;
      state.stockMovements.unshift({ id: nextId('stock'), at: new Date().toISOString(), productId: product.id, quantity, reason: requireText(payload.reason, 'Motivo'), referenceId: null });
      queueSync(state, `Stock ajustado: ${product.name}`);
      record(state, 'INVENTARIO', `${product.name}: ${quantity > 0 ? '+' : ''}${quantity}`);
      break;
    }
    case 'supplierSave': {
      const name = requireText(payload.name, 'Nombre del proveedor');
      const supplier = payload.id ? mustFind(state.suppliers, payload.id, 'Proveedor') : { id: nextId('sup') };
      supplier.name = name;
      supplier.contact = String(payload.contact || '').trim();
      supplier.notes = String(payload.notes || '').trim();
      if (!payload.id) state.suppliers.unshift(supplier);
      record(state, 'PROVEEDOR', `${payload.id ? 'Editado' : 'Creado'}: ${name}`);
      result = supplier;
      break;
    }
    case 'delivery': {
      const supplier = mustFind(state.suppliers, payload.supplierId, 'Proveedor');
      const product = mustFind(state.products, payload.productId, 'Producto');
      if (product.supplierId !== supplier.id) throw new Error('El producto pertenece a otro proveedor.');
      const quantity = requireNumber(payload.quantity, 'Cantidad', 1);
      if (!Number.isInteger(quantity)) throw new Error('La cantidad debe ser entera.');
      const unitCost = roundMoney(requireNumber(payload.unitCost, 'Costo'));
      const at = new Date().toISOString();
      const deliveryId = nextId('delivery');
      if (product.trackStock) {
        product.stock += quantity;
        state.stockMovements.unshift({ id: nextId('stock'), at, productId: product.id, quantity, reason: 'Entrega de proveedor', referenceId: deliveryId });
      }
      product.cost = unitCost;
      if (product.acquisition === 'purchase') {
        state.supplierLedger.unshift({ id: nextId('ledger'), at, supplierId: supplier.id, amount: roundMoney(quantity * unitCost), type: 'Compra recibida', referenceId: deliveryId });
      }
      queueSync(state, `Entrega recibida: ${product.name}`);
      record(state, 'ENTREGA', `${supplier.name}: ${quantity} × ${product.name}`);
      result = { id: deliveryId, quantity, productId: product.id };
      break;
    }
    case 'supplierWithdrawal': {
      const supplier = mustFind(state.suppliers, payload.supplierId, 'Proveedor');
      const product = mustFind(state.products, payload.productId, 'Producto');
      if (product.supplierId !== supplier.id) throw new Error('El producto pertenece a otro proveedor.');
      if (!product.trackStock) throw new Error('Ese producto no controla existencias.');
      const quantity = requireNumber(payload.quantity, 'Cantidad', 1);
      if (!Number.isInteger(quantity)) throw new Error('La cantidad debe ser entera.');
      if (!state.settings.allowNegativeStock && product.stock < quantity) throw new Error(`Solo hay ${product.stock} unidades disponibles.`);
      const at = new Date().toISOString();
      const withdrawalId = nextId('withdrawal');
      product.stock -= quantity;
      state.stockMovements.unshift({ id: nextId('stock'), at, productId: product.id, quantity: -quantity, reason: 'Retiro por proveedor', referenceId: withdrawalId });
      if (product.acquisition === 'purchase') {
        state.supplierLedger.unshift({ id: nextId('ledger'), at, supplierId: supplier.id, amount: -roundMoney(product.cost * quantity), type: 'Devolución al proveedor', referenceId: withdrawalId });
      }
      queueSync(state, `Retiro de proveedor: ${product.name}`);
      record(state, 'RETIRO PROVEEDOR', `${supplier.name}: ${quantity} × ${product.name}`);
      result = { id: withdrawalId, quantity, productId: product.id };
      break;
    }
    case 'supplierPayment': {
      const supplier = mustFind(state.suppliers, payload.supplierId, 'Proveedor');
      const amount = roundMoney(requireNumber(payload.amount, 'Monto', 0.01));
      if (amount > supplierBalance(state, supplier.id)) throw new Error('El pago supera el saldo pendiente.');
      state.supplierLedger.unshift({ id: nextId('ledger'), at: new Date().toISOString(), supplierId: supplier.id, amount: -amount, type: 'Pago', referenceId: String(payload.reference || '').trim() });
      record(state, 'PAGO PROVEEDOR', `${supplier.name}: ${amount}`);
      break;
    }
    case 'simulateSync': {
      const pending = state.integrationEvents.filter((entry) => entry.status === 'pendiente');
      if (!pending.length) throw new Error('No hay cambios pendientes por simular.');
      for (const entry of pending) entry.status = 'simulado';
      record(state, 'INTEGRACIÓN DEMO', `${pending.length} cambios marcados como sincronizados`);
      result = { processed: pending.length };
      break;
    }
    case 'cashOpen': {
      if (activeCashSession(state)) throw new Error('Ya hay una caja abierta.');
      const openingAmount = roundMoney(requireNumber(payload.openingAmount, 'Fondo inicial'));
      const session = { id: nextId('session'), openedAt: new Date().toISOString(), openingAmount, closedAt: null, countedAmount: null, difference: null };
      state.cashSessions.unshift(session);
      record(state, 'CAJA', `Apertura: ${openingAmount}`);
      result = session;
      break;
    }
    case 'cashMovement': {
      const session = activeCashSession(state);
      if (!session) throw new Error('Abre la caja primero.');
      const amount = roundMoney(Number(payload.amount));
      if (!Number.isFinite(amount) || amount === 0) throw new Error('Monto inválido.');
      state.cashMovements.unshift({ id: nextId('cash'), at: new Date().toISOString(), sessionId: session.id, amount, type: amount > 0 ? 'Ingreso' : 'Egreso', note: requireText(payload.note, 'Motivo'), referenceId: null });
      record(state, 'CAJA', `${amount > 0 ? 'Ingreso' : 'Egreso'}: ${amount}`);
      break;
    }
    case 'cashClose': {
      const session = activeCashSession(state);
      if (!session) throw new Error('No hay una caja abierta.');
      session.countedAmount = roundMoney(requireNumber(payload.countedAmount, 'Saldo contado'));
      session.expectedAmount = cashExpected(state, session.id);
      session.difference = roundMoney(session.countedAmount - session.expectedAmount);
      session.closedAt = new Date().toISOString();
      record(state, 'CAJA', `Cierre: diferencia ${session.difference}`);
      result = session;
      break;
    }
    case 'saleCreate': return saleCreate(state, payload);
    case 'saleRefund': return saleRefund(state, payload);
    case 'employeeSave': {
      const employee = payload.id ? mustFind(state.employees, payload.id, 'Empleado') : { id: nextId('emp') };
      employee.name = requireText(payload.name, 'Nombre');
      employee.role = requireText(payload.role, 'Rol');
      employee.hourlyRate = roundMoney(requireNumber(payload.hourlyRate, 'Tarifa por hora'));
      employee.commissionRate = requireNumber(payload.commissionRate, 'Comisión');
      if (employee.commissionRate > 100) throw new Error('La comisión no puede superar el 100 %.');
      employee.active = Boolean(payload.active);
      if (!payload.id) state.employees.unshift(employee);
      record(state, 'EQUIPO', `${payload.id ? 'Editado' : 'Creado'}: ${employee.name}`);
      result = employee;
      break;
    }
    case 'clockIn': {
      const employee = mustFind(state.employees, payload.employeeId, 'Empleado');
      if (!employee.active) throw new Error('Empleado inactivo.');
      if (state.timeEntries.some((entry) => entry.employeeId === employee.id && !entry.outAt)) throw new Error('Ese empleado ya tiene una entrada abierta.');
      const entry = { id: nextId('time'), employeeId: employee.id, inAt: new Date().toISOString(), outAt: null, hours: null, pay: null };
      state.timeEntries.unshift(entry);
      record(state, 'CHECADOR', `Entrada: ${employee.name}`);
      result = entry;
      break;
    }
    case 'clockOut': {
      const employee = mustFind(state.employees, payload.employeeId, 'Empleado');
      const entry = state.timeEntries.find((item) => item.employeeId === employee.id && !item.outAt);
      if (!entry) throw new Error('No hay una entrada abierta para ese empleado.');
      entry.outAt = new Date().toISOString();
      entry.hours = Math.round((new Date(entry.outAt) - new Date(entry.inAt)) / 3600000 * 100) / 100;
      entry.pay = roundMoney(entry.hours * employee.hourlyRate);
      record(state, 'CHECADOR', `Salida: ${employee.name}`);
      result = entry;
      break;
    }
    default: throw new Error(`Acción desconocida: ${action}`);
  }
  return { state, result };
}

export function dashboardStats(state) {
  const sales = state.sales.filter((sale) => sale.status === 'completed');
  const today = new Date().toDateString();
  return {
    revenue: sum(sales.map((sale) => sale.total)),
    todayRevenue: sum(sales.filter((sale) => new Date(sale.at).toDateString() === today).map((sale) => sale.total)),
    salesCount: sales.length,
    lowStock: state.products.filter((product) => product.trackStock && product.stock <= state.settings.lowStockAt),
    supplierDue: sum(state.suppliers.map((supplier) => Math.max(0, supplierBalance(state, supplier.id)))),
    cash: activeCashSession(state),
  };
}
