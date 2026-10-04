// Componentes de presentación puros: reciben datos y devuelven HTML.
// Todo texto que venga del estado se escapa aquí o antes de llegar.
import { icon } from './icons.js';

export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function badge(text, tone = '') {
  return `<span class="badge ${tone}">${esc(text)}</span>`;
}

export function empty(iconName, title, description, action = '') {
  return `<div class="empty-state"><span class="empty-icon">${icon(iconName)}</span><strong>${esc(title)}</strong><p>${esc(description)}</p>${action}</div>`;
}

export function field(label, name, value = '', type = 'text', extra = '') {
  return `<label>${esc(label)}<input name="${esc(name)}" type="${type}" value="${esc(value)}" ${extra} /></label>`;
}

export function selectField(label, name, options, selected) {
  return `<label>${esc(label)}<select name="${esc(name)}">${options.map(([value, text]) => `<option value="${esc(value)}" ${String(value) === String(selected) ? 'selected' : ''}>${esc(text)}</option>`).join('')}</select></label>`;
}

// Radios con aspecto de chip o de control segmentado: un toque, sin menús desplegables.
function radioGroup(kind, name, options, selected) {
  const current = selected ?? options[0]?.[0];
  return `<div class="${kind}" role="radiogroup">${options.map(([value, label]) => `<label class="${kind}-option"><input type="radio" name="${esc(name)}" value="${esc(value)}" ${String(value) === String(current) ? 'checked' : ''} /><span>${esc(label)}</span></label>`).join('')}</div>`;
}
export const chips = (name, options, selected) => radioGroup('chips', name, options, selected);
export const segmented = (name, options, selected) => radioGroup('segmented', name, options, selected);

export function card(title, body, { eyebrow = '', aside = '', className = '' } = {}) {
  return `<section class="card ${className}"><header class="card-head"><div>${eyebrow ? `<span class="eyebrow">${esc(eyebrow)}</span>` : ''}<h2>${esc(title)}</h2></div>${aside}</header>${body}</section>`;
}

export function statCard(iconName, label, value, note, tone = '') {
  return `<div class="stat-card ${tone}"><span class="stat-icon">${icon(iconName)}</span><span class="stat-label">${esc(label)}</span><strong>${value}</strong><small>${esc(note)}</small></div>`;
}

export function pageIntro(description, actions = '') {
  return `<div class="page-intro"><p>${esc(description)}</p>${actions ? `<div class="page-actions">${actions}</div>` : ''}</div>`;
}

export function topbar({ home, title, businessName, subtitle, logo, cashOpen, mode, person, roleLabel }) {
  const initials = esc(String(person || '').slice(0, 2).toUpperCase());
  const lead = home
    ? `<span class="brand-mark">${logo || '<span lang="hi">क</span>'}</span><div class="brand-name"><strong>${esc(businessName)}</strong><small>${esc(subtitle)}</small></div>`
    : `<button class="back-button" data-view="inicio" aria-label="Volver al inicio">${icon('back')}</button><div class="brand-name"><strong>${esc(title)}</strong><small>${esc(businessName)}</small></div>`;
  return `<header class="topbar">${lead}<div class="topbar-spacer"></div>
    <span class="cash-pill ${cashOpen ? 'open' : ''}"><i></i>${cashOpen ? 'Caja abierta' : 'Caja cerrada'}</span>
    <button class="icon-button mode-toggle" data-action="toggle-mode" aria-label="${mode === 'night' ? 'Cambiar a modo día' : 'Cambiar a modo noche'}">${icon(mode === 'night' ? 'sun' : 'moon')}</button>
    <button class="user-chip" data-modal="role" aria-label="Cambiar de usuario"><i>${initials}</i><span><strong>${esc(person)}</strong><small>${esc(roleLabel)}</small></span></button></header>`;
}

const DOCK = [['ventas', 'Ventas', 'sale'], ['caja', 'Caja', 'coins'], ['inventario', 'Inventario', 'box'], ['equipo', 'Equipo', 'clock']];
const MORE_VIEWS = ['proveedores', 'transacciones', 'reportes', 'configuracion'];

export function dock(view) {
  const items = DOCK.map(([target, label, iconName]) => `<button class="dock-item ${view === target ? 'active' : ''}" data-view="${target}" ${view === target ? 'aria-current="page"' : ''}>${icon(iconName)}<span>${label}</span></button>`).join('');
  return `<nav class="dock" aria-label="Secciones">${items}<button class="dock-item ${MORE_VIEWS.includes(view) ? 'active' : ''}" data-modal="more">${icon('more')}<span>Más</span></button></nav>`;
}
