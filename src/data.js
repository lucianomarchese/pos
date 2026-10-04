export const STORAGE_KEY = 'pos-studio-demo-v2';
export const THEMES = ['azafran', 'pavo', 'indigo'];

const now = () => new Date().toISOString();
const id = (prefix) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

const presets = {
  lounge: {
    businessName: 'Kesar',
    subtitle: 'Bienestar · Boutique · Cocina · Barra',
    theme: 'azafran',
    currency: 'MXN',
    taxRate: 0,
    lowStockAt: 4,
    allowNegativeStock: false,
    areas: ['Barra', 'Cocina', 'Boutique', 'Bienestar'],
    paymentMethods: ['Efectivo', 'Tarjeta', 'Transferencia'],
    suppliers: [
      { id: 'sup-bagru', name: 'Taller Bagru', contact: 'contacto@ejemplo.test', notes: 'Textiles estampados a mano, en consignación' },
      { id: 'sup-laton', name: 'Casa de Latón', contact: 'hola@ejemplo.test', notes: 'Objetos y aromas, en consignación' },
      { id: 'sup-verde', name: 'Mercado Verde', contact: 'ventas@ejemplo.test', notes: 'Insumos de cocina vegana' },
    ],
    products: [
      { id: 'p-chai', sku: 'BR-001', name: 'Chai masala con avena', category: 'Bebidas calientes', area: 'Barra', price: 65, cost: 18, stock: 0, trackStock: false, supplierId: null, acquisition: 'none', icon: 'chai' },
      { id: 'p-lassi', sku: 'BR-002', name: 'Lassi de mango y coco', category: 'Bebidas frías', area: 'Barra', price: 85, cost: 28, stock: 0, trackStock: false, supplierId: null, acquisition: 'none', icon: 'lassi' },
      { id: 'p-jamaica', sku: 'BR-003', name: 'Agua de jamaica y cardamomo', category: 'Bebidas frías', area: 'Barra', price: 55, cost: 12, stock: 0, trackStock: false, supplierId: null, acquisition: 'none', icon: 'jar' },
      { id: 'p-samosa', sku: 'CK-001', name: 'Samosas de papa (3)', category: 'Entradas', area: 'Cocina', price: 95, cost: 30, stock: 0, trackStock: false, supplierId: 'sup-verde', acquisition: 'purchase', icon: 'samosa' },
      { id: 'p-thali', sku: 'CK-002', name: 'Thali vegano', category: 'Platos', area: 'Cocina', price: 210, cost: 78, stock: 0, trackStock: false, supplierId: 'sup-verde', acquisition: 'purchase', icon: 'thali' },
      { id: 'p-dal', sku: 'CK-003', name: 'Dal de lentejas rojas', category: 'Platos', area: 'Cocina', price: 160, cost: 52, stock: 0, trackStock: false, supplierId: 'sup-verde', acquisition: 'purchase', icon: 'bowl' },
      { id: 'p-chal', sku: 'BT-001', name: 'Chal block-print', category: 'Textiles', area: 'Boutique', price: 890, cost: 480, stock: 3, trackStock: true, supplierId: 'sup-bagru', acquisition: 'consignment', icon: 'scarf' },
      { id: 'p-diya', sku: 'BT-002', name: 'Diya de latón', category: 'Objetos', area: 'Boutique', price: 240, cost: 120, stock: 6, trackStock: true, supplierId: 'sup-laton', acquisition: 'consignment', icon: 'diya' },
      { id: 'p-incienso', sku: 'BT-003', name: 'Incienso de sándalo', category: 'Aromas', area: 'Boutique', price: 120, cost: 55, stock: 14, trackStock: true, supplierId: 'sup-laton', acquisition: 'consignment', icon: 'incense' },
      { id: 'p-mala', sku: 'BT-004', name: 'Mala de rudraksha', category: 'Accesorios', area: 'Boutique', price: 420, cost: 230, stock: 2, trackStock: true, supplierId: 'sup-bagru', acquisition: 'consignment', icon: 'mala' },
      { id: 'p-yoga', sku: 'BN-001', name: 'Clase de yoga', category: 'Clases', area: 'Bienestar', price: 250, cost: 0, stock: 0, trackStock: false, supplierId: null, acquisition: 'none', icon: 'lotus' },
      { id: 'p-sonido', sku: 'BN-002', name: 'Baño de sonido', category: 'Terapias', area: 'Bienestar', price: 380, cost: 0, stock: 0, trackStock: false, supplierId: null, acquisition: 'none', icon: 'bowlsound' },
    ],
    employees: [
      { id: 'emp-mara', name: 'Mara', role: 'Vendedora', hourlyRate: 90, commissionRate: 5, active: true },
      { id: 'emp-arjun', name: 'Arjun', role: 'Vendedor', hourlyRate: 90, commissionRate: 5, active: true },
      { id: 'emp-admin', name: 'Alex', role: 'Administrador', hourlyRate: 0, commissionRate: 0, active: true },
    ],
  },
  retail: {
    businessName: 'Mercado Norte',
    subtitle: 'Tienda · Regalos · Café',
    theme: 'indigo',
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
      { id: 'p-cafe', sku: 'TN-001', name: 'Café de origen 250 g', category: 'Despensa', area: 'Tienda', price: 240, cost: 125, stock: 18, trackStock: true, supplierId: 'sup-finca', acquisition: 'purchase', icon: 'beans' },
      { id: 'p-miel', sku: 'TN-002', name: 'Miel artesanal', category: 'Despensa', area: 'Tienda', price: 190, cost: 90, stock: 9, trackStock: true, supplierId: 'sup-finca', acquisition: 'purchase', icon: 'honey' },
      { id: 'p-libreta', sku: 'TN-003', name: 'Libreta de viaje', category: 'Papelería', area: 'Tienda', price: 180, cost: 85, stock: 15, trackStock: true, supplierId: 'sup-diseno', acquisition: 'consignment', icon: 'notebook' },
      { id: 'p-termo', sku: 'TN-004', name: 'Termo de acero', category: 'Accesorios', area: 'Tienda', price: 460, cost: 265, stock: 4, trackStock: true, supplierId: 'sup-diseno', acquisition: 'consignment', icon: 'flask' },
      { id: 'p-espresso', sku: 'CF-001', name: 'Espresso doble', category: 'Bebidas', area: 'Café', price: 65, cost: 18, stock: 0, trackStock: false, supplierId: null, acquisition: 'none', icon: 'chai' },
      { id: 'p-latte', sku: 'CF-002', name: 'Latte de vainilla', category: 'Bebidas', area: 'Café', price: 95, cost: 30, stock: 0, trackStock: false, supplierId: null, acquisition: 'none', icon: 'cup' },
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
    version: 2,
    preset: presets[preset] ? preset : 'lounge',
    createdAt: now(),
    settings: {
      businessName: source.businessName,
      subtitle: source.subtitle,
      logoDataUrl: null,
      theme: source.theme,
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
  const first = source.products.find((product) => product.trackStock) || source.products[0];
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
