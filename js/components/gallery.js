import { IMAGE_PLACEHOLDER } from '../config.js';
import { h } from '../utils/dom.js';
import { formatDate, formatDimensions, formatPrice, statusLabel } from '../utils/format.js';
import { renderState } from './notifications.js';

export function createStatusBadge(status) {
  return h('span', { class: `badge badge--${status}`, text: statusLabel(status) });
}

function createImageFallback(record, className) {
  return h('div', { class: `${className} image-fallback`, role: 'img', 'aria-label': `Image unavailable for ${record.name}` },
    h('span', { text: 'Image unavailable' }));
}

export function createFurnitureImage(record, className) {
  const hasImage = Boolean(record.imageUrl);
  const image = h('img', {
    class: className,
    src: hasImage ? record.imageUrl : IMAGE_PLACEHOLDER,
    alt: hasImage ? `Photo of ${record.name}` : '',
    loading: 'lazy',
    width: '640',
    height: '480',
  });
  image.addEventListener('error', () => image.replaceWith(createImageFallback(record, className)), { once: true });
  return image;
}

function actionButtons(record, handlers, small = false) {
  const size = small ? ' btn--small' : '';
  return [
    h('button', { type: 'button', class: `btn${size}`, text: 'View details', 'aria-label': `View details for ${record.name}`, onclick: () => handlers.onView(record) }),
    h('button', { type: 'button', class: `btn${size}`, text: 'Edit', 'aria-label': `Edit ${record.name}`, onclick: () => handlers.onEdit(record) }),
    h('button', { type: 'button', class: `btn btn--danger-outline${size}`, text: 'Delete', 'aria-label': `Delete ${record.name}`, onclick: () => handlers.onDelete(record) }),
  ];
}

function metaRow(term, value) {
  return h('div', { class: 'meta-row' }, h('dt', { text: term }), h('dd', { text: value }));
}

function createCard(record, handlers) {
  const titleId = `card-title-${record.id}`;
  return h('li', {},
    h('article', { class: 'furniture-card', 'aria-labelledby': titleId },
      h('div', { class: 'card-media' }, createFurnitureImage(record, 'card-image')),
      h('div', { class: 'card-body' },
        h('div', { class: 'card-heading' },
          h('h3', { id: titleId, class: 'card-title', text: record.name }),
          createStatusBadge(record.status)),
        h('p', { class: 'card-id', text: `ID ${record.id}` }),
        h('dl', { class: 'meta-list' },
          metaRow('Category', record.category),
          metaRow('Material', record.material),
          metaRow('Artisan', record.artisan),
          metaRow('Size (L×W×H)', formatDimensions(record.dimensions)),
          metaRow('Price', formatPrice(record.price)),
          metaRow('Added', formatDate(record.dateAdded))),
        h('div', { class: 'card-actions' }, actionButtons(record, handlers)))));
}

export function renderGallery({ list, stateContainer }, records, { totalCount, hasActiveFilters }, handlers) {
  list.replaceChildren(...records.map((record) => createCard(record, handlers)));
  stateContainer.replaceChildren();
  if (records.length > 0) return;

  if (totalCount === 0) {
    renderState(stateContainer, {
      title: 'No furniture records yet',
      message: 'Add your first piece, or restore the sample records to see how the gallery looks.',
      actions: [
        { label: 'Add furniture', href: '#/add', primary: true },
        { label: 'Add sample records', onClick: handlers.onAddSamples },
      ],
    });
    return;
  }

  renderState(stateContainer, {
    title: 'No data found',
    message: hasActiveFilters
      ? 'No furniture matches your search and filters. Check the spelling or reset the filters.'
      : 'Nothing to show.',
    actions: hasActiveFilters ? [{ label: 'Reset search and filters', onClick: handlers.onResetFilters }] : [],
  });
}

export function renderRecordsTable(tableBody, records, handlers) {
  tableBody.replaceChildren(...records.map((record) => h('tr', {},
    h('th', { scope: 'row' }, h('span', { class: 'cell-title', text: record.name }), h('span', { class: 'cell-sub', text: record.id })),
    h('td', { text: record.category }),
    h('td', { text: record.artisan }),
    h('td', {}, createStatusBadge(record.status)),
    h('td', { class: 'cell-number', text: formatPrice(record.price) }),
    h('td', { text: formatDate(record.dateUpdated) }),
    h('td', {}, h('div', { class: 'row-actions' }, actionButtons(record, handlers, true))))));
}
