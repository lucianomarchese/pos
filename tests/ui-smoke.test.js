import test from 'node:test';
import assert from 'node:assert/strict';

const handlers = {};
const storage = new Map();
const app = {
  innerHTML: '',
  addEventListener(type, handler) { handlers[type] = handler; },
};
globalThis.document = {
  title: '',
  querySelector(selector) { return selector === '#app' ? app : null; },
};
globalThis.localStorage = {
  getItem(key) { return storage.get(key) ?? null; },
  setItem(key, value) { storage.set(key, value); },
};
globalThis.sessionStorage = {
  getItem() { return null; },
  setItem() {},
};
globalThis.window = { addEventListener() {} };

await import('../src/app.js');

function navigate(view) {
  handlers.click({ target: { closest: () => ({ dataset: { view } }) } });
}

test('every main screen renders with seeded data', () => {
  for (const [view, marker] of [
    ['inicio', 'Flujos del día'], ['ventas', 'Nueva venta'], ['inventario', 'Todos los productos'],
    ['proveedores', 'Movimientos con proveedores'], ['caja', 'SALDO ESPERADO'],
    ['transacciones', 'Todas las transacciones'], ['equipo', 'Horas registradas'],
    ['reportes', 'Ventas por área'], ['configuracion', 'Configuración del negocio'],
  ]) {
    navigate(view);
    assert.ok(app.innerHTML.includes(marker), `Falta ${marker} en ${view}`);
  }
});

test('home keeps large direct access to operational areas', () => {
  navigate('inicio');
  const targets = [...app.innerHTML.matchAll(/<button class="module-card [^"]*" data-view="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(targets, ['ventas', 'caja', 'equipo', 'inventario', 'transacciones', 'proveedores', 'reportes', 'configuracion']);
});

test('modal forms render for operational flows', () => {
  for (const type of ['more', 'product', 'supplier', 'delivery', 'withdrawal', 'cashOpen', 'employee', 'customItem', 'balancePreview']) {
    handlers.click({ target: { closest: () => ({ dataset: { modal: type } }) } });
    assert.ok(app.innerHTML.includes('role="dialog"'), `Falta diálogo para ${type}`);
  }
});
