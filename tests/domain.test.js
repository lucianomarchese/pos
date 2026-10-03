import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeed } from '../src/data.js';
import { activeCashSession, applyAction, cashExpected, dashboardStats, supplierBalance } from '../src/domain.js';

function action(state, name, payload) {
  return applyAction(state, name, payload).state;
}

test('a cash sale updates stock, cash, consignment and reports; refund reverses them', () => {
  let state = createSeed();
  const product = state.products.find((item) => item.id === 'p-ceramica');
  const initialStock = product.stock;
  const initialBalance = supplierBalance(state, product.supplierId);
  const initialRevenue = dashboardStats(state).revenue;
  state = action(state, 'cashOpen', { openingAmount: 500 });
  state = action(state, 'saleCreate', {
    lines: [{ productId: product.id, quantity: 2 }],
    paymentMethod: 'Efectivo', employeeId: 'emp-lucas', discountPct: 10, tip: 20,
  });
  const sale = state.sales[0];
  assert.equal(sale.total, 776);
  assert.equal(state.products.find((item) => item.id === product.id).stock, initialStock - 2);
  assert.equal(supplierBalance(state, product.supplierId), initialBalance + product.cost * 2);
  assert.equal(cashExpected(state, activeCashSession(state).id), 1276);
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
    lines: [{ productId: 'p-bolso', quantity: 100 }],
    paymentMethod: 'Tarjeta', employeeId: 'emp-lucas', discountPct: 0, tip: 0,
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
  assert.equal(first.products.find((item) => item.id === 'p-ceramica').stock, 13);
  assert.equal(second.products.find((item) => item.id === 'p-ceramica').stock, 13);
});

test('renaming an area updates products and historical sale lines for reports', () => {
  let state = createSeed();
  state = action(state, 'settings', {
    businessName: 'Demo renovada', subtitle: 'Prueba', accent: '#527f6b', currency: 'MXN',
    taxRate: 0, lowStockAt: 4, allowNegativeStock: false,
    areas: 'Tienda, Cocina, Lounge', paymentMethods: ['Efectivo', 'Tarjeta'],
  });
  assert.equal(state.products.find((item) => item.id === 'p-ceramica').area, 'Tienda');
  assert.equal(state.sales[0].items[0].area, 'Tienda');
  assert.throws(() => applyAction(state, 'settings', {
    businessName: 'Demo', areas: 'Cocina, Lounge', paymentMethods: ['Tarjeta'], taxRate: 0, lowStockAt: 4,
  }), /Reasigna los productos/);
});
