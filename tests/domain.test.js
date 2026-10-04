import test from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEY, THEMES, createSeed } from '../src/data.js';
import { activeCashSession, applyAction, cashExpected, dashboardStats, priceSale, supplierBalance } from '../src/domain.js';

function action(state, name, payload) {
  return applyAction(state, name, payload).state;
}

test('a cash sale updates stock, cash, consignment and reports; refund reverses them', () => {
  let state = createSeed();
  const product = state.products.find((item) => item.id === 'p-incienso');
  const initialStock = product.stock;
  const initialBalance = supplierBalance(state, product.supplierId);
  const initialRevenue = dashboardStats(state).revenue;
  state = action(state, 'cashOpen', { openingAmount: 500 });
  state = action(state, 'saleCreate', {
    lines: [{ productId: product.id, quantity: 2 }],
    paymentMethod: 'Efectivo', employeeId: 'emp-mara', discountPct: 10, tip: 20,
  });
  const sale = state.sales[0];
  assert.equal(sale.total, 236);
  assert.equal(state.products.find((item) => item.id === product.id).stock, initialStock - 2);
  assert.equal(supplierBalance(state, product.supplierId), initialBalance + product.cost * 2);
  assert.equal(cashExpected(state, activeCashSession(state).id), 736);
  assert.equal(dashboardStats(state).revenue, initialRevenue + sale.total);
  assert.equal(state.integrationEvents[0].status, 'pendiente');
  state = action(state, 'simulateSync', {});
  assert.equal(state.integrationEvents[0].status, 'simulado');

  state = action(state, 'saleRefund', { saleId: sale.id, reason: 'Devolución de prueba' });
  assert.equal(state.sales[0].status, 'refunded');
  assert.equal(state.products.find((item) => item.id === product.id).stock, initialStock);
  assert.equal(supplierBalance(state, product.supplierId), initialBalance);
  assert.equal(cashExpected(state, activeCashSession(state).id), 500);
  assert.equal(dashboardStats(state).revenue, initialRevenue);
});

test('stock validation rejects an oversized sale without changing original state', () => {
  const state = createSeed();
  const before = structuredClone(state);
  assert.throws(() => applyAction(state, 'saleCreate', {
    lines: [{ productId: 'p-mala', quantity: 100 }],
    paymentMethod: 'Tarjeta', employeeId: 'emp-mara', discountPct: 0, tip: 0,
  }), /Stock insuficiente/);
  assert.deepEqual(state, before);
});

test('purchase delivery creates payable balance and payment reduces it', () => {
  let state = createSeed('retail');
  const product = state.products.find((item) => item.id === 'p-cafe');
  const startingStock = product.stock;
  state = action(state, 'delivery', { supplierId: product.supplierId, productId: product.id, quantity: 4, unitCost: 120 });
  assert.equal(state.products.find((item) => item.id === product.id).stock, startingStock + 4);
  assert.equal(supplierBalance(state, product.supplierId), 480);
  state = action(state, 'supplierPayment', { supplierId: product.supplierId, amount: 180, reference: 'DEMO-1' });
  assert.equal(supplierBalance(state, product.supplierId), 300);
  assert.throws(() => applyAction(state, 'supplierPayment', { supplierId: product.supplierId, amount: 301 }), /supera el saldo/);
  state = action(state, 'supplierWithdrawal', { supplierId: product.supplierId, productId: product.id, quantity: 1 });
  assert.equal(state.products.find((item) => item.id === product.id).stock, startingStock + 3);
  assert.equal(supplierBalance(state, product.supplierId), 180);
});

test('closing cash records the counted difference', () => {
  let state = createSeed();
  state = action(state, 'cashOpen', { openingAmount: 1000 });
  state = action(state, 'cashMovement', { amount: -75, note: 'Insumos' });
  state = action(state, 'cashClose', { countedAmount: 920 });
  assert.equal(activeCashSession(state), null);
  assert.equal(state.cashSessions[0].expectedAmount, 925);
  assert.equal(state.cashSessions[0].difference, -5);
});

test('reset starts with identical stock and no accumulated template mutation', () => {
  const first = createSeed();
  const second = createSeed();
  assert.equal(first.products.find((item) => item.id === 'p-chal').stock, 2);
  assert.equal(second.products.find((item) => item.id === 'p-chal').stock, 2);
});

test('renaming an area updates products and historical sale lines for reports', () => {
  let state = createSeed();
  state = action(state, 'settings', {
    businessName: 'Demo renovada', subtitle: 'Prueba', currency: 'MXN',
    taxRate: 0, lowStockAt: 4, allowNegativeStock: false,
    areas: 'Barra, Cocina, Tienda, Bienestar', paymentMethods: ['Efectivo', 'Tarjeta'],
  });
  assert.equal(state.products.find((item) => item.id === 'p-chal').area, 'Tienda');
  assert.equal(state.sales.find((sale) => sale.items.some((item) => item.productId === 'p-chal')).items[0].area, 'Tienda');
  assert.throws(() => applyAction(state, 'settings', {
    businessName: 'Demo', areas: 'Barra, Cocina, Bienestar', paymentMethods: ['Tarjeta'], taxRate: 0, lowStockAt: 4,
  }), /Reasigna los productos/);
});

test('a manual charge follows discount, tax and tip configuration', () => {
  let state = createSeed();
  state = action(state, 'settings', {
    businessName: 'Demo', subtitle: '', currency: 'MXN',
    taxRate: 16, lowStockAt: 4, allowNegativeStock: false,
    areas: 'Barra, Cocina, Boutique, Bienestar', paymentMethods: ['Tarjeta'],
  });
  const quote = priceSale(state, [{ name: 'Servicio especial', unitPrice: 100, quantity: 2 }], 10, 15);
  assert.equal(quote.subtotal, 200);
  assert.equal(quote.discount, 20);
  assert.equal(quote.tax, 28.8);
  assert.equal(quote.total, 223.8);
});

test('branding accepts a small image and rejects unsupported formats', () => {
  const input = {
    businessName: 'Mi tienda', subtitle: '', currency: 'MXN',
    taxRate: 0, lowStockAt: 4, allowNegativeStock: false,
    areas: 'Barra, Cocina, Boutique, Bienestar', paymentMethods: ['Tarjeta'],
  };
  const state = action(createSeed(), 'settings', { ...input, logoDataUrl: 'data:image/png;base64,AA==' });
  assert.equal(state.settings.logoDataUrl, 'data:image/png;base64,AA==');
  assert.throws(() => applyAction(state, 'settings', { ...input, logoDataUrl: 'data:image/svg+xml;base64,AA==' }), /logo debe/);
});

test('seed v2 starts the Kesar scenario with curated theme and icons', () => {
  const state = createSeed();
  assert.equal(state.version, 2);
  assert.equal(STORAGE_KEY, 'pos-studio-demo-v2');
  assert.equal(state.settings.businessName, 'Kesar');
  assert.equal(state.settings.theme, 'azafran');
  assert.deepEqual(state.settings.areas, ['Barra', 'Cocina', 'Boutique', 'Bienestar']);
  assert.equal('accent' in state.settings, false);
  assert.ok(state.products.every((product) => typeof product.icon === 'string' && !('emoji' in product)));
  assert.equal(createSeed('retail').settings.theme, 'indigo');
});

test('settings accepts a curated theme and keeps the previous one for unknown values', () => {
  const input = {
    businessName: 'Kesar', subtitle: '', currency: 'MXN', taxRate: 0, lowStockAt: 4,
    allowNegativeStock: false, areas: 'Barra, Cocina, Boutique, Bienestar', paymentMethods: ['Tarjeta'],
  };
  let state = action(createSeed(), 'settings', { ...input, theme: 'pavo' });
  assert.equal(state.settings.theme, 'pavo');
  state = action(state, 'settings', { ...input, theme: 'neon' });
  assert.equal(state.settings.theme, 'pavo');
  assert.ok(THEMES.includes(state.settings.theme));
});
