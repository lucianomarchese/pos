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
  documentElement: { dataset: { mode: 'day' } },
  querySelector(selector) { return selector === '#app' ? app : null; },
};
const workingStorage = {
  getItem(key) { return storage.get(key) ?? null; },
  setItem(key, value) { storage.set(key, value); },
};
globalThis.localStorage = workingStorage;
globalThis.sessionStorage = {
  getItem() { return null; },
  setItem() {},
};
globalThis.window = { addEventListener() {} };

// Un navegador que ya abrió la versión anterior conserva datos v1: no deben mezclarse con Kesar.
storage.set('pos-studio-demo-v1', JSON.stringify({ version: 1, settings: { businessName: 'Lounge Aurora' } }));

await import('../src/app.js');

function click(dataset, extra = {}) {
  handlers.click({ target: { closest: () => ({ dataset, ...extra }) } });
}
const navigate = (view) => click({ view });

test('a browser with v1 data starts in the Kesar scenario', () => {
  navigate('inicio');
  assert.ok(app.innerHTML.includes('Kesar'));
  assert.ok(!app.innerHTML.includes('Lounge Aurora'));
});

test('every main screen renders with seeded data', () => {
  for (const [view, marker] of [
    ['inicio', 'Namaste'], ['ventas', 'Comanda'], ['inventario', 'Todos los productos'],
    ['proveedores', 'Movimientos con proveedores'], ['caja', 'Saldo esperado'],
    ['transacciones', 'Todas las transacciones'], ['equipo', 'Horas registradas'],
    ['reportes', 'Ventas por área'], ['configuracion', 'Configuración del negocio'],
  ]) {
    navigate(view);
    assert.ok(app.innerHTML.includes(marker), `Falta ${marker} en ${view}`);
    assert.ok(app.innerHTML.includes('data-theme="azafran"'), `Falta el tema en ${view}`);
    assert.ok(!app.innerHTML.includes('class="sidebar'), `Quedó la sidebar en ${view}`);
  }
});

test('home is a portal with large tiles and no dock', () => {
  navigate('inicio');
  const tiles = [...app.innerHTML.matchAll(/<button class="home-tile[^"]*" data-view="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(tiles, ['ventas', 'caja', 'inventario', 'proveedores', 'transacciones', 'equipo']);
  assert.ok(app.innerHTML.includes('data-view="reportes"'));
  assert.ok(app.innerHTML.includes('data-view="configuracion"'));
  assert.ok(!app.innerHTML.includes('class="dock'));
});

test('modules show the bottom dock with the main areas and "Más"', () => {
  navigate('caja');
  const dock = app.innerHTML.slice(app.innerHTML.indexOf('<nav class="dock'));
  const targets = [...dock.matchAll(/data-view="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(targets, ['ventas', 'caja', 'inventario', 'equipo']);
  assert.ok(dock.includes('data-modal="more"'));
});

test('sales screen draws SVG product cards and fills the order', () => {
  navigate('ventas');
  assert.equal((app.innerHTML.match(/data-add-product=/g) || []).length, 12);
  assert.ok(app.innerHTML.includes('<svg class="ic'));
  click({ addProduct: 'p-chai' });
  click({ addProduct: 'p-chai' });
  assert.ok(app.innerHTML.includes('Cobrar $130.00'));
  assert.ok(app.innerHTML.includes('name="paymentMethod"'));
  assert.ok(!app.innerHTML.includes('<select name="paymentMethod"'));
});

test('settings offers the three curated themes instead of a free color', () => {
  navigate('configuracion');
  const themes = [...app.innerHTML.matchAll(/name="theme" value="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(themes, ['azafran', 'pavo', 'indigo']);
  assert.ok(!app.innerHTML.includes('name="accent"'));
});

test('cash movement modal knows whether it is an income or an expense', () => {
  navigate('caja');
  click({ modal: 'cashMovement', sign: '-' });
  assert.ok(app.innerHTML.includes('Registrar egreso'));
  click({ modal: 'cashMovement', sign: '+' });
  assert.ok(app.innerHTML.includes('Registrar ingreso'));
});

test('modal forms render for operational flows', () => {
  for (const type of ['more', 'role', 'product', 'supplier', 'delivery', 'withdrawal', 'cashOpen', 'employee', 'customItem', 'balancePreview']) {
    click({ modal: type });
    assert.ok(app.innerHTML.includes('role="dialog"'), `Falta diálogo para ${type}`);
  }
});

test('mode toggle flips day and night even when storage is blocked', () => {
  navigate('inicio');
  const before = document.documentElement.dataset.mode;
  click({ action: 'toggle-mode' });
  assert.notEqual(document.documentElement.dataset.mode, before);
  globalThis.localStorage = {
    getItem() { throw new Error('bloqueado'); },
    setItem() { throw new Error('bloqueado'); },
  };
  try {
    assert.doesNotThrow(() => click({ action: 'toggle-mode' }));
    assert.equal(document.documentElement.dataset.mode, before);
  } finally {
    globalThis.localStorage = workingStorage;
  }
});
