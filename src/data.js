export const STORAGE_KEY = 'pos-studio-demo-v1';

const now = () => new Date().toISOString();
const id = (prefix) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

const presets = {
  lounge: {
    businessName: 'Lounge Aurora',
    subtitle: 'Boutique · Cocina · Lounge',
    accent: '#b7642d',
    currency: 'MXN',
    taxRate: 0,
    lowStockAt: 4,
    allowNegativeStock: false,
    areas: ['Boutique', 'Cocina', 'Lounge'],
    paymentMethods: ['Efectivo', 'Tarjeta', 'Transferencia'],
    suppliers: [
      { id: 'sup-atelier', name: 'Atelier Nómada', contact: 'contacto@ejemplo.test', notes: 'Consignación de boutique' },
      { id: 'sup-cocina', name: 'Mercado del Sur', contact: 'ventas@ejemplo.test', notes: 'Insumos de cocina' },
    ],
    products: [
      { id: 'p-ceramica', sku: 'BT-001', name: 'Taza de cerámica', category: 'Cerámica', area: 'Boutique', price: 420, cost: 230, stock: 14, trackStock: true, supplierId: 'sup-atelier', acquisition: 'consignment', color: '#ddc4aa', emoji: '☕' },
      { id: 'p-vela', sku: 'BT-002', name: 'Vela de copal', category: 'Decoración', area: 'Boutique', price: 290, cost: 150, stock: 8, trackStock: true, supplierId: 'sup-atelier', acquisition: 'consignment', color: '#e9d4a8', emoji: '✦' },
      { id: 'p-bolso', sku: 'BT-003', name: 'Bolso tejido', category: 'Accesorios', area: 'Boutique', price: 790, cost: 450, stock: 3, trackStock: true, supplierId: 'sup-atelier', acquisition: 'consignment', color: '#c2ad93', emoji: '◈' },
      { id: 'p-limonada', sku: 'LG-001', name: 'Limonada de la casa', category: 'Bebidas', area: 'Lounge', price: 95, cost: 25, stock: 0, trackStock: false, supplierId: null, acquisition: 'none', color: '#b9cfa8', emoji: '◕' },
      { id: 'p-matcha', sku: 'LG-002', name: 'Matcha frío', category: 'Bebidas', area: 'Lounge', price: 135, cost: 48, stock: 0, trackStock: false, supplierId: null, acquisition: 'none', color: '#a3bd9a', emoji: '◉' },
      { id: 'p-toast', sku: 'CK-001', name: 'Toast de aguacate', category: 'Comida', area: 'Cocina', price: 185, cost: 68, stock: 0, trackStock: false, supplierId: 'sup-cocina', acquisition: 'purchase', color: '#d9c099', emoji: '▣' },
      { id: 'p-bowl', sku: 'CK-002', name: 'Bowl tropical', category: 'Comida', area: 'Cocina', price: 210, cost: 78, stock: 0, trackStock: false, supplierId: 'sup-cocina', acquisition: 'purchase', color: '#dabb91', emoji: '◌' },
      { id: 'p-remera', sku: 'BT-004', name: 'Remera de lino', category: 'Ropa', area: 'Boutique', price: 650, cost: 340, stock: 11, trackStock: true, supplierId: 'sup-atelier', acquisition: 'consignment', color: '#d8d2c5', emoji: '◇' },
    ],
    employees: [
      { id: 'emp-lucas', name: 'Lucas', role: 'Vendedor', hourlyRate: 90, commissionRate: 5, active: true },
      { id: 'emp-mara', name: 'Mara', role: 'Vendedora', hourlyRate: 90, commissionRate: 5, active: true },
      { id: 'emp-admin', name: 'Alex', role: 'Administrador', hourlyRate: 0, commissionRate: 0, active: true },
    ],
  },
  retail: {
    businessName: 'Mercado Norte',
    subtitle: 'Tienda · Regalos · Café',
    accent: '#518b78',
    currency: 'MXN',
    taxRate: 0,
    lowStockAt: 5,
    allowNegativeStock: false,
    areas: ['Tienda', 'Café'],
    paymentMethods: ['Efectivo', 'Tarjeta', 'Transferencia'],
    suppliers: [
      { id: 'sup-finca', name: 'Finca Clara', contact: 'hola@ejemplo.test', notes: 'Café y productos de origen' },
      { id: 'sup-diseno', name: 'Diseño Local', contact: 'equipo@ejemplo.test', notes: 'Accesorios en consignación' },
    ],
    products: [
      { id: 'p-cafe', sku: 'TN-001', name: 'Café de origen 250 g', category: 'Despensa', area: 'Tienda', price: 240, cost: 125, stock: 18, trackStock: true, supplierId: 'sup-finca', acquisition: 'purchase', color: '#bba58c', emoji: '◉' },
      { id: 'p-miel', sku: 'TN-002', name: 'Miel artesanal', category: 'Despensa', area: 'Tienda', price: 190, cost: 90, stock: 9, trackStock: true, supplierId: 'sup-finca', acquisition: 'purchase', color: '#e1c688', emoji: '✦' },
      { id: 'p-libreta', sku: 'TN-003', name: 'Libreta de viaje', category: 'Papelería', area: 'Tienda', price: 180, cost: 85, stock: 15, trackStock: true, supplierId: 'sup-diseno', acquisition: 'consignment', color: '#b0c3b2', emoji: '▤' },
      { id: 'p-termo', sku: 'TN-004', name: 'Termo de acero', category: 'Accesorios', area: 'Tienda', price: 460, cost: 265, stock: 4, trackStock: true, supplierId: 'sup-diseno', acquisition: 'consignment', color: '#b6c6c4', emoji: '▥' },
      { id: 'p-espresso', sku: 'CF-001', name: 'Espresso doble', category: 'Bebidas', area: 'Café', price: 65, cost: 18, stock: 0, trackStock: false, supplierId: null, acquisition: 'none', color: '#c6aa8f', emoji: '☕' },
      { id: 'p-latte', sku: 'CF-002', name: 'Latte de vainilla', category: 'Bebidas', area: 'Café', price: 95, cost: 30, stock: 0, trackStock: false, supplierId: null, acquisition: 'none', color: '#d8c1a3', emoji: '◕' },
    ],
    employees: [
      { id: 'emp-noa', name: 'Noa', role: 'Vendedora', hourlyRate: 85, commissionRate: 3, active: true },
      { id: 'emp-elias', name: 'Elías', role: 'Vendedor', hourlyRate: 85, commissionRate: 3, active: true },
      { id: 'emp-admin', name: 'Sam', role: 'Administrador', hourlyRate: 0, commissionRate: 0, active: true },
    ],
  },
};

export function createSeed(preset = 'lounge') {
  const source = presets[preset] || presets.lounge;
  const state = {
    version: 1,
    preset: presets[preset] ? preset : 'lounge',
    createdAt: now(),
    settings: {
      businessName: source.businessName,
      subtitle: source.subtitle,
      logoDataUrl: null,
      accent: source.accent,
      currency: source.currency,
      taxRate: source.taxRate,
      lowStockAt: source.lowStockAt,
      allowNegativeStock: source.allowNegativeStock,
      areas: [...source.areas],
      paymentMethods: [...source.paymentMethods],
    },
    suppliers: structuredClone(source.suppliers),
    products: structuredClone(source.products),
    employees: structuredClone(source.employees),
    sales: [],
    stockMovements: [],
    supplierLedger: [],
    cashSessions: [],
    cashMovements: [],
    timeEntries: [],
    integrationEvents: [
      { id: id('sync'), at: now(), type: 'Catálogo web', detail: 'Escenario de ejemplo cargado', status: 'simulado' },
    ],
    audit: [],
  };

  // Historial sintético para que los paneles tengan contenido desde la primera visita.
  const first = source.products[0];
  const second = source.products.find((product) => !product.trackStock) || source.products[1];
  const past = new Date();
  past.setDate(past.getDate() - 1);
  const saleId = id('sale');
  state.sales.push({
    id: saleId,
    at: past.toISOString(),
    employeeId: source.employees[0].id,
    paymentMethod: 'Tarjeta',
    items: [
      { productId: first.id, name: first.name, sku: first.sku, area: first.area, quantity: 1, unitPrice: first.price, unitCost: first.cost, supplierId: first.supplierId, acquisition: first.acquisition },
      { productId: second.id, name: second.name, sku: second.sku, area: second.area, quantity: 2, unitPrice: second.price, unitCost: second.cost, supplierId: second.supplierId, acquisition: second.acquisition },
    ],
    subtotal: first.price + second.price * 2,
    discountPct: 0,
    discount: 0,
    tax: 0,
    tip: 0,
    total: first.price + second.price * 2,
    commission: Math.round((first.price + second.price * 2) * source.employees[0].commissionRate) / 100,
    status: 'completed',
  });
  state.sales.unshift({
    id: id('sale'), at: now(), employeeId: source.employees[1].id,
    paymentMethod: 'Tarjeta',
    items: [{ productId: second.id, name: second.name, sku: second.sku, area: second.area, quantity: 1, unitPrice: second.price, unitCost: second.cost, supplierId: second.supplierId, acquisition: second.acquisition }],
    subtotal: second.price, discountPct: 0, discount: 0, tax: 0, tip: 0, total: second.price,
    commission: Math.round(second.price * source.employees[1].commissionRate) / 100,
    status: 'completed',
  });
  if (first.trackStock) {
    state.products.find((product) => product.id === first.id).stock -= 1;
    state.stockMovements.push({ id: id('stock'), at: past.toISOString(), productId: first.id, quantity: -1, reason: 'Venta', referenceId: saleId });
  }
  if (first.acquisition === 'consignment') {
    state.supplierLedger.push({ id: id('ledger'), at: past.toISOString(), supplierId: first.supplierId, amount: first.cost, type: 'Venta en consignación', referenceId: saleId });
  }
  return state;
}

export function nextId(prefix) {
  return id(prefix);
}
