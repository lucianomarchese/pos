// Íconos de línea propios (viewBox 48, trazo con currentColor). Los de producto
// ilustran el catálogo; los de interfaz acompañan navegación y acciones.
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export const ICONS = {
  // Productos
  chai: '<path d="M12 19h22l-3 20H15z"/><path d="M34 23h3a4 4 0 0 1 0 8h-4"/><path d="M19 13c0-3 3-3 3-6M26 13c0-3 3-3 3-6"/>',
  lassi: '<path d="M15 10h18l-3 30H18z"/><path d="M16 20h16"/><path d="M28 4l-3 10"/><circle cx="21" cy="28" r="1.5"/><circle cx="27" cy="33" r="1.5"/>',
  jar: '<path d="M17 8h14M18 8v5c-5 3-6 7-6 12v10a5 5 0 0 0 5 5h14a5 5 0 0 0 5-5V25c0-5-1-9-6-12V8"/><path d="M14 26h20"/><path d="M24 30c-3 2-3 5 0 6 3-1 3-4 0-6z"/>',
  samosa: '<path d="M8 37L24 9l16 28z"/><path d="M8 37q16 6 32 0"/><path d="M24 9l-4 28"/><path d="M15 30l3-3M30 29l3 2"/>',
  thali: '<circle cx="24" cy="26" r="16"/><circle cx="24" cy="26" r="12"/><circle cx="18" cy="22" r="3"/><circle cx="25" cy="19" r="3"/><circle cx="30" cy="25" r="3"/><path d="M17 30q7 5 14 0"/>',
  bowl: '<path d="M7 24h34c0 9-7 16-17 16S7 33 7 24z"/><path d="M18 40h12"/><path d="M14 24c1-3 4-5 7-4M24 24c1-3 4-5 7-4"/><path d="M33 8l-7 14"/>',
  scarf: '<path d="M12 7h24v28H12z"/><path d="M12 13h24M12 29h24"/><circle cx="24" cy="21" r="4"/><path d="M15 35v6M20 35v6M25 35v6M30 35v6M35 35v6"/>',
  diya: '<path d="M6 28q18 15 36 0z"/><path d="M19 37h10"/><path d="M24 24c-5-5 0-11 0-15 0 4 5 10 0 15z"/>',
  incense: '<path d="M12 41L33 13"/><path d="M33 13c5-2 0-6 5-9"/><path d="M28 9c3-1 0-4 3-6"/><path d="M7 41h16"/>',
  mala: '<circle cx="24" cy="18" r="12"/><circle cx="24" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><circle cx="36" cy="18" r="2"/><circle cx="16" cy="27" r="2"/><circle cx="32" cy="27" r="2"/><path d="M24 30v4M21 34h6l-1 9h-4z"/>',
  lotus: '<path d="M24 12c-5 6-5 14 0 20 5-6 5-14 0-20z"/><path d="M24 32c-6-1-12-6-13-13 7 0 11 5 13 13z"/><path d="M24 32c6-1 12-6 13-13-7 0-11 5-13 13z"/><path d="M8 36q16 6 32 0"/>',
  bowlsound: '<path d="M8 22h32c0 9-7 15-16 15S8 31 8 22z"/><path d="M17 40h14"/><path d="M36 8l-9 13"/><path d="M14 15c2-2 4-2 6 0M28 12c2-2 4-2 6 0"/>',
  beans: '<ellipse cx="17" cy="20" rx="7" ry="10" transform="rotate(-25 17 20)"/><path d="M13 13q6 7 0 14"/><ellipse cx="31" cy="29" rx="7" ry="10" transform="rotate(25 31 29)"/><path d="M33 21q-5 8 2 15"/>',
  honey: '<path d="M14 12h20M16 12v4c-4 2-5 6-5 10v8a6 6 0 0 0 6 6h14a6 6 0 0 0 6-6v-8c0-4-1-8-5-10v-4"/><path d="M20 27l4-3 4 3v5l-4 3-4-3z"/>',
  notebook: '<path d="M13 7h22v34H13z"/><path d="M18 7v34"/><path d="M23 15h8M23 21h8"/><path d="M9 13h4M9 21h4M9 29h4"/>',
  flask: '<path d="M18 6h12v4h-12z"/><path d="M17 10h14v30a2 2 0 0 1-2 2H19a2 2 0 0 1-2-2z"/><path d="M17 20h14"/>',
  cup: '<path d="M10 18h24v8a12 12 0 0 1-24 0z"/><path d="M34 21h3a4 4 0 0 1 0 8h-4"/><path d="M8 42h28"/><path d="M18 12c0-2 2-2 2-4M25 12c0-2 2-2 2-4"/>',
  spark: '<path d="M24 6l3 13 13 3-13 3-3 13-3-13-13-3 13-3z"/><path d="M38 34l1 4 4 1-4 1-1 4-1-4-4-1 4-1z"/>',
  // Interfaz
  home: '<path d="M8 22c0-8 7-14 16-14s16 6 16 14v18H8z"/><path d="M19 40V30a5 5 0 0 1 10 0v10"/>',
  sale: '<circle cx="24" cy="26" r="15"/><circle cx="18" cy="22" r="3"/><circle cx="25" cy="19" r="3"/><circle cx="30" cy="25" r="3"/><path d="M17 31q7 4 14 0"/>',
  coins: '<ellipse cx="24" cy="13" rx="12" ry="5"/><path d="M12 13v8c0 3 5 5 12 5s12-2 12-5v-8"/><path d="M12 21v8c0 3 5 5 12 5s12-2 12-5v-8"/><path d="M12 29v6c0 3 5 5 12 5s12-2 12-5v-6"/>',
  box: '<path d="M8 15l16-8 16 8v18l-16 8-16-8z"/><path d="M8 15l16 8 16-8M24 23v18"/><path d="M16 11l16 8"/>',
  hands: '<path d="M5 25l8-8 8 4 6-4h8l8 8"/><path d="M13 29l7 7c2 2 4 2 6 0l11-11"/><path d="M19 33l3-3M23 37l3-3"/>',
  arrows: '<path d="M10 17h27l-6-6"/><path d="M38 31H11l6 6"/>',
  clock: '<circle cx="24" cy="26" r="15"/><path d="M24 17v9l6 4"/><path d="M19 6h10"/>',
  chart: '<path d="M8 40h32"/><path d="M13 40V27M21 40V17M29 40V23M37 40V11"/>',
  gear: '<circle cx="24" cy="24" r="5"/><path d="M24 7l3 5 6-1 1 6 5 3-3 5 3 5-5 3-1 6-6-1-3 5-3-5-6 1-1-6-5-3 3-5-3-5 5-3 1-6 6 1z"/>',
  more: '<circle cx="12" cy="24" r="2.5"/><circle cx="24" cy="24" r="2.5"/><circle cx="36" cy="24" r="2.5"/>',
  search: '<circle cx="21" cy="21" r="11"/><path d="M29 29l9 9"/>',
  back: '<path d="M28 12L16 24l12 12"/>',
  sun: '<circle cx="24" cy="24" r="8"/><path d="M24 6v5M24 37v5M6 24h5M37 24h5M11 11l3 3M34 34l3 3M37 11l-3 3M14 34l-3 3"/>',
  moon: '<path d="M33 31A14 14 0 0 1 19 9a15 15 0 1 0 20 20 14 14 0 0 1-6 2z"/>',
  plus: '<path d="M24 12v24M12 24h24"/>',
  minus: '<path d="M12 24h24"/>',
  user: '<circle cx="24" cy="17" r="7"/><path d="M10 40c1-8 7-12 14-12s13 4 14 12"/>',
  check: '<path d="M11 25l8 8 18-18"/>',
  receipt: '<path d="M12 6h24v36l-4-3-4 3-4-3-4 3-4-3-4 3z"/><path d="M18 15h12M18 22h12M18 29h7"/>',
  arrowUp: '<path d="M14 34L34 14"/><path d="M19 14h15v15"/>',
  arrowDown: '<path d="M14 14l20 20"/><path d="M34 19v15H19"/>',
  close: '<path d="M14 14l20 20M34 14L14 34"/>',
};

export const PRODUCT_ICONS = ['chai', 'lassi', 'jar', 'samosa', 'thali', 'bowl', 'scarf', 'diya', 'incense', 'mala', 'lotus', 'bowlsound', 'beans', 'honey', 'notebook', 'flask', 'cup', 'spark'];

export function icon(name, { label = '', className = '' } = {}) {
  const body = ICONS[name] || ICONS.spark;
  const classes = className ? `ic ${esc(className)}` : 'ic';
  const open = label
    ? `<svg class="${classes}" viewBox="0 0 48 48" role="img"><title>${esc(label)}</title>`
    : `<svg class="${classes}" viewBox="0 0 48 48" aria-hidden="true">`;
  return `${open}${body}</svg>`;
}
