import { h } from '../utils/dom.js';
import { formatDate, formatDimensions, formatPrice } from '../utils/format.js';
import { createFurnitureImage, createStatusBadge } from './gallery.js';

function detailRow(term, value) {
  return h('div', { class: 'meta-row' }, h('dt', { text: term }), h('dd', { text: value }));
}
export function openDetails(dialog, record, { onEdit }) {
  const close = () => dialog.close();
  dialog.replaceChildren(
    h('div', { class: 'dialog-header' },
      h('h2', { id: 'details-title', text: record.name }),
      createStatusBadge(record.status)),
    createFurnitureImage(record, 'details-image'),
    h('dl', { class: 'meta-list' },
      detailRow('Furniture ID', record.id),
      detailRow('Category', record.category),
      detailRow('Material', record.material),
      detailRow('Artisan', record.artisan),
      detailRow('Size (L×W×H)', formatDimensions(record.dimensions)),
      detailRow('Price', formatPrice(record.price)),
      detailRow('Date added', formatDate(record.dateAdded)),
      detailRow('Last updated', formatDate(record.dateUpdated))),
    h('p', { class: 'details-description', text: record.description || 'No description provided.' }),
    h('div', { class: 'button-row' },
      h('button', { type: 'button', class: 'btn btn--primary', text: 'Edit this record', onclick: () => { close(); onEdit(record); } }),
      h('button', { type: 'button', class: 'btn', text: 'Close', autofocus: true, onclick: close })));
  dialog.showModal();
}
