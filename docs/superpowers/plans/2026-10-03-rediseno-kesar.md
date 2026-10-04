# Rediseño Kesar — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la UI tipo dashboard SaaS de la demo por el diseño "Kesar" (Haveli de día, Pavo real de noche), pensado para iPad y escritorio, sin cambiar las reglas de negocio.

**Architecture:** La app sigue siendo estática: módulos ES sin framework, render con template strings y estado en `localStorage`. Se agregan `src/icons.js` (íconos SVG) y `src/ui.js` (componentes de presentación puros). `src/app.js` conserva el estado de UI, las vistas y los eventos. `styles.css` se reescribe desde cero sobre tokens CSS, con día y noche y tres temas curados.

**Tech Stack:** HTML, CSS y JavaScript ES modules; `node --test` para el dominio y los módulos puros; Playwright (instalación npx existente + `/usr/bin/chromium`) para la QA visual, solo como script en el scratchpad y nunca como dependencia del repo.

**Spec:** `docs/superpowers/specs/2026-10-03-rediseno-kesar-design.md`

## Global Constraints

- Sin dependencias npm nuevas en el repo; `package.json` no cambia sus scripts.
- `npm run build` sigue copiando solo `index.html`, `styles.css` y `src/`; todo archivo nuevo de UI va en `src/`.
- Fuentes: Rozha One (títulos) y Mukta 400–800 (texto), cargadas desde Google Fonts; fallbacks `Georgia, serif` y `system-ui, sans-serif`.
- Todos los colores salen de variables CSS; ningún componente usa hex sueltos (salvo dentro de los bloques de tokens).
- `data-mode="day|night"` va en `<html>`; la preferencia se guarda en `localStorage['pos-kesar-mode']`, siempre dentro de `try/catch`.
- `data-theme="azafran|pavo|indigo"` va en `.app-shell`, desde `state.settings.theme`.
- `STORAGE_KEY = 'pos-studio-demo-v2'`, `state.version === 2`.
- Áreas Kesar: `Barra, Cocina, Boutique, Bienestar`. Menú 100 % vegano.
- Objetivos táctiles ≥ 44 × 44px; botón de cobro ≥ 60px; dock 74px.
- Sin scroll horizontal de página en 390, 820, 1024, 1180 ni 1440px de ancho.
- Todo texto que provenga del estado se pasa por `esc()` antes de entrar al HTML.
- Copys en el español de la demo actual (tuteo, imperativos cortos: "Cobrar", "Abrir caja").

## Review Focus

1. **Datos v1 viejos en `localStorage`:** un navegador que ya abrió la demo debe arrancar en Kesar, no con "Lounge Aurora". Lo cubre el test de `STORAGE_KEY`/`version` (Task 1) y la carga en `app.js` (Task 3).
2. **Producto con `icon` desconocido o ausente** (creado antes, editado a mano o cargo manual): debe mostrar el ícono `spark`, nunca un SVG vacío ni un error. Test en Task 2.
3. **Tema inválido en settings:** conserva el anterior en lugar de romper los estilos. Test en Task 1.
4. **`localStorage` bloqueado** (modo privado, previews): el botón de modo debe seguir alternando en memoria sin lanzar excepciones. Lo cubre el chequeo de consola de Task 9 con `localStorage` anulado.
5. **Nombres largos** (negocio o producto de más de 30 caracteres, áreas renombradas): sin desbordar tarjetas ni causar scroll horizontal. Lo cubre la corrida de QA de Task 9 con un escenario de nombres largos.

---

### Task 1: Dominio y datos — escenario Kesar, temas, v2

**Files:**
- Modify: `src/data.js` (presets completos y `createSeed`)
- Modify: `src/domain.js:144-182` (case `'settings'`)
- Modify: `tests/domain.test.js` (IDs nuevos y tests nuevos)

**Interfaces:**
- Produces: `STORAGE_KEY = 'pos-studio-demo-v2'`; `createSeed(preset)` devuelve `{ version: 2, settings: { theme, ... sin accent }, products: [{ ..., icon }] }`; `export const THEMES = ['azafran', 'pavo', 'indigo']` en `data.js`.

- [ ] **Step 1: Actualizar los tests existentes a los IDs nuevos y agregar los tests nuevos**

Cambios en `tests/domain.test.js`:
- Test de venta en efectivo: `p-ceramica` → `p-incienso` (precio 120, costo 55, consignación), `emp-lucas` → `emp-mara`. Con 2 unidades, 10 % de descuento y propina 20: `sale.total === 236`; caja esperada `500 + 236 === 736`.
- Validación de stock: `p-bolso` → `p-mala`, `emp-lucas` → `emp-mara`.
- Reset: `p-ceramica` → `p-chal`, stock esperado `2` (3 iniciales − 1 de la venta sintética).
- Renombrar área: `areas: 'Barra, Cocina, Tienda, Bienestar'` → `p-chal.area === 'Tienda'` y la línea histórica también; la remoción usa `areas: 'Barra, Cocina, Bienestar'` → `/Reasigna los productos/`.
- Cargo manual y branding: `areas: 'Barra, Cocina, Boutique, Bienestar'`; se quita `accent` de los payloads.

Tests nuevos al final del archivo:

```js
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
```

Import a sumar: `import { STORAGE_KEY, THEMES, createSeed } from '../src/data.js';`

- [ ] **Step 2: Correr los tests y ver que fallan**

Run: `npm test`
Expected: FAIL (`p-incienso` no existe, `THEMES` no exportado, `version` 1).

- [ ] **Step 3: Implementar datos y dominio**

`src/data.js`:
- `export const STORAGE_KEY = 'pos-studio-demo-v2';` y `export const THEMES = ['azafran', 'pavo', 'indigo'];`
- Preset `lounge` (Kesar): `businessName: 'Kesar'`, `subtitle: 'Bienestar · Boutique · Cocina · Barra'`, `theme: 'azafran'`, `lowStockAt: 4`, áreas y proveedores (`sup-bagru` "Taller Bagru", consignación de textiles; `sup-laton` "Casa de Latón", consignación de objetos; `sup-verde` "Mercado Verde", insumos de cocina) según el spec §6.1.
- Productos (campos: `id, sku, name, category, area, price, cost, stock, trackStock, supplierId, acquisition, icon`):

| id | sku | name | category | area | price | cost | stock | track | supplier | acq | icon |
|---|---|---|---|---|---|---|---|---|---|---|---|
| p-chai | BR-001 | Chai masala con avena | Bebidas calientes | Barra | 65 | 18 | 0 | no | null | none | chai |
| p-lassi | BR-002 | Lassi de mango y coco | Bebidas frías | Barra | 85 | 28 | 0 | no | null | none | lassi |
| p-jamaica | BR-003 | Agua de jamaica y cardamomo | Bebidas frías | Barra | 55 | 12 | 0 | no | null | none | jar |
| p-samosa | CK-001 | Samosas de papa (3) | Entradas | Cocina | 95 | 30 | 0 | no | sup-verde | purchase | samosa |
| p-thali | CK-002 | Thali vegano | Platos | Cocina | 210 | 78 | 0 | no | sup-verde | purchase | thali |
| p-dal | CK-003 | Dal de lentejas rojas | Platos | Cocina | 160 | 52 | 0 | no | sup-verde | purchase | bowl |
| p-chal | BT-001 | Chal block-print | Textiles | Boutique | 890 | 480 | 3 | sí | sup-bagru | consignment | scarf |
| p-diya | BT-002 | Diya de latón | Objetos | Boutique | 240 | 120 | 6 | sí | sup-laton | consignment | diya |
| p-incienso | BT-003 | Incienso de sándalo | Aromas | Boutique | 120 | 55 | 14 | sí | sup-laton | consignment | incense |
| p-mala | BT-004 | Mala de rudraksha | Accesorios | Boutique | 420 | 230 | 2 | sí | sup-bagru | consignment | mala |
| p-yoga | BN-001 | Clase de yoga | Clases | Bienestar | 250 | 0 | 0 | no | null | none | lotus |
| p-sonido | BN-002 | Baño de sonido | Terapias | Bienestar | 380 | 0 | 0 | no | null | none | bowlsound |

- Equipo: `emp-mara` Mara (Vendedora, 90/h, 5 %), `emp-arjun` Arjun (Vendedor, 90/h, 5 %), `emp-admin` Alex (Administrador, 0, 0).
- Preset `retail`: igual que hoy, sin `accent` ni `color`/`emoji`, con `theme: 'indigo'` e íconos: p-cafe `beans`, p-miel `honey`, p-libreta `notebook`, p-termo `flask`, p-espresso `chai`, p-latte `cup`.
- `createSeed`: `version: 2`, `settings.theme: source.theme` (sin `accent`), y la venta sintética usa `const first = source.products.find((product) => product.trackStock) || source.products[0];`.

`src/domain.js`, case `'settings'`: reemplazar la línea de `accent` por

```js
state.settings.theme = THEMES.includes(payload.theme) ? payload.theme : (state.settings.theme || 'azafran');
delete state.settings.accent;
```

con `import { THEMES, createSeed, nextId } from './data.js';`. En el case `'productSave'`, reemplazar el manejo de `emoji`/`color` por `icon: String(payload.icon || existing?.icon || 'spark')` (leer el case completo antes de editarlo y conservar todo lo demás).

- [ ] **Step 4: Correr los tests y ver que pasan**

Run: `npm test`
Expected: 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data.js src/domain.js tests/domain.test.js
git commit -m "Seed the Kesar scenario with curated themes and icon keys"
```

---

### Task 2: Set de íconos SVG

**Files:**
- Create: `src/icons.js`
- Create: `tests/icons.test.js`

**Interfaces:**
- Consumes: `createSeed` (Task 1) para validar que cada producto tiene ícono.
- Produces: `ICONS` (objeto `nombre → markup interno del SVG`, viewBox 48), `icon(name, { label, className } = {})` que devuelve un string `<svg class="ic ${className}" viewBox="0 0 48 48" aria-hidden="true">…</svg>` (o `role="img"` + `<title>` escapado si hay `label`), y `PRODUCT_ICONS` (lista de claves elegibles en el formulario de producto).

- [ ] **Step 1: Test que falla**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { ICONS, PRODUCT_ICONS, icon } from '../src/icons.js';
import { createSeed } from '../src/data.js';

test('every seeded product icon exists in the set', () => {
  for (const preset of ['lounge', 'retail']) {
    for (const product of createSeed(preset).products) assert.ok(ICONS[product.icon], `${preset}:${product.id} → ${product.icon}`);
  }
  assert.ok(PRODUCT_ICONS.every((name) => ICONS[name]));
});

test('unknown icons fall back to spark and labels are escaped', () => {
  assert.equal(icon('no-existe'), icon('spark'));
  assert.equal(icon(undefined), icon('spark'));
  const labelled = icon('chai', { label: '<b>"Chai"</b>' });
  assert.match(labelled, /role="img"/);
  assert.match(labelled, /&lt;b&gt;&quot;Chai&quot;&lt;\/b&gt;/);
  assert.doesNotMatch(labelled, /<b>/);
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npm test` → FAIL (módulo inexistente).

- [ ] **Step 3: Implementar `src/icons.js`**

Íconos (trazo, sin relleno; los paths de la página de direcciones son el punto de partida): productos `chai, lassi, jar, samosa, thali, bowl, scarf, diya, incense, mala, lotus, bowlsound, beans, honey, notebook, flask, cup, spark`; interfaz `home, sale, coins, box, hands, arrows, clock, chart, gear, more, search, back, sun, moon, plus, minus, user, check, receipt, arrowUp, arrowDown, close`.

```js
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export const ICONS = { /* nombre: '<path …/>…' para cada clave listada arriba */ };
export const PRODUCT_ICONS = ['chai', 'lassi', 'jar', 'samosa', 'thali', 'bowl', 'scarf', 'diya', 'incense', 'mala', 'lotus', 'bowlsound', 'beans', 'honey', 'notebook', 'flask', 'cup', 'spark'];

export function icon(name, { label = '', className = '' } = {}) {
  const body = ICONS[name] || ICONS.spark;
  const a11y = label ? `role="img"><title>${esc(label)}</title` : 'aria-hidden="true"';
  return `<svg class="ic ${esc(className)}" viewBox="0 0 48 48" ${a11y}>${body}</svg>`;
}
```

(La rama con `label` debe producir `<svg … role="img"><title>…</title>…</svg>`; armar el string con cuidado para que quede bien formado.)

- [ ] **Step 4: Correr y ver que pasa**

Run: `npm test` → 12 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/icons.js tests/icons.test.js
git commit -m "Add hand-drawn SVG icon set"
```

---

### Task 3: Base visual — tokens, día y noche, temas, `index.html`

**Files:**
- Modify: `index.html`
- Rewrite: `styles.css` (secciones 1–3: tokens, base, primitivas)
- Modify: `src/app.js` (carga del estado v2, `data-theme`, alternar el modo)

**Interfaces:**
- Produces (CSS): tokens `--bg --paper --ink --muted --line --ok --warn --danger --primary --on-primary --hero --on-hero --accent --tint --display --body --radius-arch --shadow`; clases primitivas `.button` (`.primary`, `.secondary`, `.ghost`, `.danger`, `.small`, `.wide`), `.badge` (`.good`, `.warning`, `.danger`, `.neutral`), `.card`, `.eyebrow`, `.muted`, `.ic`, `.jali` (patrón de fondo), `.arch` (borde superior en arco).
- Produces (JS): `getMode()`/`setMode(mode)` en `app.js`, con `try/catch` sobre `localStorage['pos-kesar-mode']` y estado de respaldo en memoria.

- [ ] **Step 1: `index.html`**

- `<link>` de Google Fonts para Rozha One y Mukta (400, 500, 600, 700, 800) con `preconnect`.
- Script inline antes del CSS que fija `document.documentElement.dataset.mode` desde `localStorage` (con `try/catch`) o desde `matchMedia('(prefers-color-scheme: dark)')`, para evitar el parpadeo.
- `<meta name="theme-color" content="#f8efe0">`, `<title>Kesar · POS Studio</title>`.

- [ ] **Step 2: Tokens en `styles.css`**

- `:root` / `[data-mode="day"]`: superficies del día (spec §3.2).
- `[data-mode="night"]`: superficies de la noche.
- `.app-shell[data-theme="azafran|pavo|indigo"]`: acentos de cada tema; los de noche van en `[data-mode="night"] .app-shell[data-theme=…]`. Valores exactos del spec §3.2. `--on-primary` y `--on-hero`: azafrán día `#fff3e3` / `#fbeedd`; noche caléndula `--on-primary: #1b1206`; pavo día `#f4fffd` / `#f4fffd`, noche `#04201f`; índigo día `#fff1ea` / `#f3ede1`, noche `#1a0d0a` / `#f3ede1`.
- Base: `body` con fondo explícito, fuentes, `-webkit-tap-highlight-color: transparent`, `touch-action: manipulation` en botones y `prefers-reduced-motion`.
- Primitivas: botones con alto mínimo de 48px (`.small` 40px) y `:active { transform: scale(.98) }`; `.jali` como data URI SVG de círculos entrelazados (stroke `%23f2b632`, opacidad .14 vía `::before`); `.arch { border-radius: 120px 120px 18px 18px / 64px 64px 18px 18px; }`.

- [ ] **Step 3: `app.js` — carga y modo**

- La carga acepta solo `stored?.version === 2`.
- `shell()` pone `data-theme="${esc(state.settings.theme || 'azafran')}"` y quita el `style="--accent"`.
- `setMode` actualiza `dataset.mode`, el `meta[name=theme-color]` (`#f8efe0` / `#0d1f24`) y llama a `render()`. Botón `data-action="toggle-mode"` en el handler de clicks.

- [ ] **Step 4: Verificar**

Run: `npm test && npm run build` → PASS. Servir con `python3 -m http.server 4188 --bind 127.0.0.1` desde el repo y correr el script de capturas (Task 9, Step 1) solo para Home en día y noche: la página carga sin errores de consola y las fuentes se aplican. Todavía puede verse sin estilos de layout.

- [ ] **Step 5: Commit**

```bash
git add index.html styles.css src/app.js
git commit -m "Introduce Kesar design tokens, day/night mode and curated themes"
```

---

### Task 4: Shell — barra superior, dock, hoja "Más", chip de usuario; sin sidebar

**Files:**
- Create: `src/ui.js`
- Modify: `src/app.js` (`shell()`, eventos)
- Modify: `styles.css` (sección 4: layout)

**Interfaces:**
- Consumes: `icon()` (Task 2), tokens (Task 3).
- Produces (`src/ui.js`, todas funciones puras que devuelven strings y reciben datos ya escapables): `esc(value)`, `topbar({ title, subtitle, back, actions, cashOpen, mode, role, brand })`, `dock(view)`, `pageIntro(description, actions)`, `card(content, className)`, `badge(text, tone)`, `empty(iconName, title, description, action)`, `field(label, name, value, type, extra)`, `selectField(label, name, options, selected)`, `chips(name, options, selected)` (radios estilizados como chips), `segmented(name, options, selected)`. `app.js` importa `esc`, `badge`, `empty`, `field` y `selectField` desde `ui.js` y borra sus copias locales.
- Dock: `[['ventas','Ventas','sale'],['caja','Caja','coins'],['inventario','Inventario','box'],['equipo','Equipo','clock'],['more','Más','more']]`. "Más" usa `data-modal="more"`; la hoja lista Proveedores, Transacciones, Reportes y Configuración (esta última solo para administrador).
- Chip de usuario: `data-modal="role"` abre una hoja con dos botones `data-role="admin|seller"`; el handler guarda en `sessionStorage['pos-demo-role']`, cierra y vuelve a `inicio`. Se elimina `#role-select` y su handler `change`.

- [ ] **Step 1:** Escribir `src/ui.js` con las funciones de arriba.
- [ ] **Step 2:** Reescribir `shell()`: `<div class="app-shell" data-theme data-view="${view}">`, `topbar` (sin `back` en `inicio`), `<main class="content">`, `dock(view)` solo si `view !== 'inicio'`, toasts y modal. Sin `<aside>`.
- [ ] **Step 3:** CSS de layout: `.topbar` sticky de 68px; `.content` con `max-width: 1320px; margin: 0 auto; padding: 16px clamp(16px, 2.6vw, 28px) 100px`; `.dock` fijo abajo (74px, `env(safe-area-inset-bottom)`), que en ≥ 1280px se vuelve píldora flotante (`width: auto; left: 50%; transform: translateX(-50%); border-radius: 999px; bottom: 16px`). Los modales en ≤ 899px se muestran como hoja inferior.
- [ ] **Step 4:** Verificar con `npm test` y con capturas de Ventas en 1024×768 y 390×844: dock visible, sin sidebar, "Más" y el chip de usuario abren sus hojas.
- [ ] **Step 5:** Commit `"Replace sidebar with portal topbar and bottom dock"`.

---

### Task 5: Home-portal

**Files:** Modify: `src/app.js` (`renderHome`), `styles.css` (sección Home).

**Interfaces:** Consume `dashboardStats`, `activeCashSession`, `icon`, `ui.js`.

- [ ] **Step 1:** `renderHome()` según el spec §4.1:
  - Persona del saludo: `state.employees.find((e) => e.active && (isAdmin() ? e.role === 'Administrador' : e.role !== 'Administrador'))?.name || 'equipo'`.
  - Fecha con `Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })`. Turno: "mañana" antes de las 14 h, si no "tarde".
  - Tarjeta "Caja del día": `money(stats.todayRevenue)`, cantidad de ventas de hoy y "última hace N min" calculado desde `state.sales[0].at`.
  - Botón Checador con `data-view="equipo"`.
  - 6 tarjetas `.home-tile.arch` (Ventas `.hot` en `--primary`, Caja `.hot2` en `--hero`) con un dato vivo cada una: Ventas → "Abrir comanda y cobrar"; Caja → "Abierta · $X esperado" o "Cerrada"; Inventario → "N por reponer"; Proveedores → "$X por pagar"; Transacciones → "N registros"; Equipo → "N en turno".
  - Fila secundaria: Reportes y Configuración (solo administrador).
- [ ] **Step 2:** CSS del Home: grid `360px 1fr` en ≥ 900px, el panel de bienvenida con `.jali` y arco alto, tarjetas 3 × 2 con `min-height: 196px`; en 700–899px, el panel arriba y las tarjetas en 2 columnas; en < 700px, todo en 1 columna. De noche: anillos dorados (`::after`) en el panel de bienvenida y filete dorado en las tarjetas.
- [ ] **Step 3:** Capturas de Home en 1024×768 y 1440×900, día y noche: comparar contra los mockups A y C de la página de direcciones.
- [ ] **Step 4:** Commit `"Build the Home portal"`.

---

### Task 6: Ventas

**Files:** Modify: `src/app.js` (`renderPOS`, `renderProductCard`, `renderCart`, eventos de venta), `styles.css` (sección Ventas).

**Interfaces:** Consume `priceSale`, `activeCashSession`, `icon`, `chips`, `segmented`. Agrega `areaTone(area)` → `'t0'…'t3'` según `state.settings.areas.indexOf(area) % 4`.

- [ ] **Step 1:** Tarjeta de producto: `<button class="product-card" data-add-product>` con `.product-visual.arch.${areaTone}` + `icon(product.icon)`, nombre, precio y stock ("N en stock", "Servicio" o "Agotado", con la clase `.unavailable`).
- [ ] **Step 2:** Comanda: líneas con `.qty` (cantidad), nombre, precio unitario, total y botones −/+ (`data-cart-minus/plus`, 44px); `chips('employeeId', activos, primero)`; fila compacta de descuento (input + botones `data-discount="0|10|15"` que fijan el valor del input y disparan el recálculo) y propina; `segmented('paymentMethod', métodos, primero)`; total grande; botón `Cobrar ${money(total)}` (`.button.primary.wide.pay-button`, 60px); nota de caja. El recálculo en vivo actualiza `.cart-total strong` y el texto del botón.
- [ ] **Step 3:** Estado vacío: `empty('thali', 'Comanda vacía', 'Toca un producto para empezar.')`.
- [ ] **Step 4:** Responsive: en ≥ 900px, grid `1fr 360px` con la comanda sticky a la altura del viewport menos la barra y el dock; en ≤ 899px, la comanda se vuelve una barra inferior fija sobre el dock ("Ver comanda (n) · $total", `data-action="toggle-cart"`) que se expande como hoja (`cartOpen` en el estado de UI).
- [ ] **Step 5:** Pestañas: "Todas" + áreas; botones de ≥ 50px con scroll horizontal interno si no entran.
- [ ] **Step 6:** Recorrido con Playwright: tocar 3 productos, cambiar el pago a Tarjeta, cobrar, ver el comprobante; capturas en 1024×768, 820×1180 y 390×844.
- [ ] **Step 7:** Commit `"Redesign the sales screen for touch"`.

---

### Task 7: Caja

**Files:** Modify: `src/app.js` (`renderCash`, modal `cashMovement`), `styles.css` (sección Caja).

- [ ] **Step 1:** Tarjeta de estado `.cash-hero.jali` (fondo `--hero`) con el estado, "Abierta a las HH:MM" y el saldo esperado en Rozha 56px.
- [ ] **Step 2:** Acciones (solo administrador): sin sesión → `Abrir caja` (`data-modal="cashOpen"`); con sesión → `Ingreso` (`data-modal="cashMovement" data-sign="+"`), `Egreso` (`data-sign="-"`), `Cerrar caja`. Botones de 64px con ícono. El modal de movimiento lee `modal.sign` para el título ("Registrar ingreso" / "egreso") y envía `amount` con el signo aplicado: el usuario escribe un monto positivo y en el submit, si `modal.sign === '-'`, se usa `-Math.abs(amount)`. El campo pasa a ser `min="0.01"`.
- [ ] **Step 3:** Línea de tiempo de movimientos (`arrowUp` o `arrowDown`, motivo, hora, importe con color ok o danger) e historial de cierres (`state.cashSessions` cerradas, con el badge de diferencia: 0 → good "Cuadra", > 0 → warning "Sobrante", < 0 → danger "Faltante").
- [ ] **Step 4:** Recorrido: abrir caja con 1000 → ingreso 200 → egreso 75 → saldo esperado $1,125 → cerrar con 1120 → badge "Faltante". Capturas en día y noche.
- [ ] **Step 5:** Commit `"Redesign the cash screen"`.

---

### Task 8: Pantallas heredadas, modales y Configuración

**Files:** Modify: `src/app.js` (`renderInventory`, `renderSuppliers`, `renderTransactions`, `renderTeam`, `renderReports`, `renderIntegrationPanel`, `renderSettings`, `modalContent`, `renderModal`, submit `settings-form` y `product`), `styles.css` (secciones de tablas, tarjetas, formularios, modales y pantallas).

- [ ] **Step 1:** Quitar `heading()` y `metric()`; cada vista empieza con `pageIntro(descripción, acciones)`. Las métricas pasan a `.stat-card` (ícono en círculo `--tint`, etiqueta, valor en Rozha, nota), sin numeración.
- [ ] **Step 2:** Tablas dentro de `.card.table-card` con `overflow-x: auto`; mini ícono de producto `.mini-product.${areaTone}` + `icon(product.icon)` en Inventario.
- [ ] **Step 3:** Proveedores, Equipo y Reportes: rehacer las tarjetas con las primitivas nuevas; las barras de Reportes usan `--primary` (áreas) y `--hero` (pagos); la auditoría queda como línea de tiempo.
- [ ] **Step 4:** Configuración: tarjeta de identidad con vista previa del monograma; se borra el input `accent` y se agregan 3 tarjetas de tema (`<label class="theme-option"><input type="radio" name="theme" value="azafran|pavo|indigo">` con muestra de colores de día y de noche y el nombre "Azafrán", "Pavo real" o "Índigo"); se mantienen los escenarios, la integración y la exportación.
- [ ] **Step 5:** Formulario de producto: se reemplazan los inputs de emoji y color por un selector de ícono (`radio name="icon"` sobre `PRODUCT_ICONS`, en grilla de 6 columnas).
- [ ] **Step 6:** Modales: cabecera con eyebrow "KESAR · POS STUDIO" (con el nombre del negocio vía `esc`) y título en Rozha; comprobante estilo ticket con borde dentado (`mask` radial en el borde inferior).
- [ ] **Step 7:** Recorrido: crear un producto con el ícono `lotus`, registrar una entrega de proveedor y su pago, cambiar al tema Pavo real, cambiar al escenario Mercado Norte. Capturas de cada pantalla en 1024×768, en día y noche.
- [ ] **Step 8:** Commit `"Restyle inventory, suppliers, team, reports, settings and modals"`.

---

### Task 9: QA visual y responsive

**Files:** Create (solo scratchpad, no va al repo): `$SCRATCH/qa.mjs`.

- [ ] **Step 1: Script de QA.** Playwright con `executablePath: '/usr/bin/chromium'`. Para cada viewport (`1024×768`, `1180×820`, `820×1180`, `1440×900`, `390×844`) y cada modo (`day`, `night`, forzado vía `localStorage` antes de cargar): navegar por inicio, ventas (con 3 productos en la comanda), caja, inventario, proveedores, transacciones, equipo, reportes y configuración. En cada pantalla: captura, `scrollWidth <= innerWidth`, botones visibles de menos de 44 × 44px (se listan, excluyendo los marcados `.small`, que deben medir ≥ 40px) y errores de consola.
- [ ] **Step 2: Casos de Review Focus.** (a) Sembrar `localStorage['pos-studio-demo-v1']` con datos viejos y confirmar que Home muestra "Kesar". (b) Con `addInitScript` que reemplace `localStorage.getItem` y `setItem` por funciones que lanzan errores, alternar el modo y confirmar que no hay errores no capturados. (c) Renombrar el negocio y un producto a 40 caracteres y confirmar que no hay scroll horizontal en Home ni Ventas en 390 y 1024px.
- [ ] **Step 3:** Revisar cada captura a ojo; corregir el CSS y repetir hasta que el script quede limpio y el resultado esté a la altura del mockup.
- [ ] **Step 4:** Commit de las correcciones: `"Polish responsive layouts and night mode"`.

---

### Task 10: Documentación, deploy y capturas para Workana

**Files:** Modify: `README.md`; reemplazar `../portfolio-personal/casos/pos-studio/capturas/01…04` (fuera del repo); quizás `../portfolio-personal/casos/pos-studio/caso.md` (sección de capturas).

- [ ] **Step 1:** README: el escenario es Kesar, la sección "Diseño para iPad" pasa a "Diseño" (Haveli y Pavo real, tipografías de Ek Type, temas curados, modo noche), se actualizan los recorridos 5 (temas en lugar de color) y la estructura (`icons.js`, `ui.js`). Commit `"Document the Kesar redesign"`.
- [ ] **Step 2:** Pedir confirmación a Luciano para hacer merge a `main` y push (eso despliega).
- [ ] **Step 3:** Con el ok: `git switch main && git merge --ff-only rediseno-kesar && git push origin main`. Seguir el workflow con `gh run watch` y comprobar que `https://pos.athaleo.dev` sirve el HTML nuevo (`curl -s https://pos.athaleo.dev | grep Kesar`).
- [ ] **Step 4:** Capturas de producción a 1180×820 con `deviceScaleFactor: 2`, sobrescribiendo `01-portada-panorama.png` (Home de día), `02-punto-de-venta.png` (Ventas de día con 3–4 productos), `03-inventario.png` (Inventario de día) y `04-reportes.png` (Reportes de noche, después de 2–3 ventas para que las barras tengan datos). Revisar cada imagen.
- [ ] **Step 5:** Ajustar las descripciones de capturas en `caso.md` (p. ej. "4. Reportes en modo noche") y avisar a Luciano.
