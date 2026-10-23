import { RECENT_ITEMS_COUNT } from '../config.js';
import { h } from '../utils/dom.js';
import { formatDate } from '../utils/format.js';
import { getCategoryCounts, getStats, queryRecords } from '../services/furniture-service.js';
import { createStatusBadge } from './gallery.js';

function statCard(value, label) {
  return h('li', { class: 'stat-card' },
    h('p', { class: 'stat-value', text: String(value) }),
    h('p', { class: 'stat-label', text: label }));
}

export function renderDashboard({ statsList, recentList, categoryList }, records, { onView }) {
  const stats = getStats(records);
  statsList.replaceChildren(
    statCard(stats.total, 'Total items'),
    statCard(stats.available, 'Available'),
    statCard(stats.inProduction, 'Under production'),
    statCard(stats.completed, 'Completed'));

  const recent = queryRecords(records, { sort: 'date-desc' }).slice(0, RECENT_ITEMS_COUNT);
  recentList.replaceChildren(...(recent.length > 0
    ? recent.map((record) => h('li', { class: 'recent-item' },
      h('div', {},
        h('p', { class: 'recent-name', text: record.name }),
        h('p', { class: 'cell-sub', text: `${record.category} · Added ${formatDate(record.dateAdded)}` })),
      createStatusBadge(record.status),
      h('button', { type: 'button', class: 'btn btn--small', text: 'View', 'aria-label': `View details for ${record.name}`, onclick: () => onView(record) })))
    : [h('li', { class: 'muted', text: 'No records yet.' })]));

  const counts = getCategoryCounts(records);
  const highest = Math.max(1, ...counts.map((entry) => entry.count));
  categoryList.replaceChildren(...(counts.length > 0
    ? counts.map(({ category, count }) => h('li', { class: 'category-item' },
      h('span', { class: 'category-name', text: category }),
      h('span', { class: 'category-bar', 'aria-hidden': 'true' },
        h('span', { class: 'category-bar-fill', style: `width: ${(count / highest) * 100}%` })),
      h('span', { class: 'category-count', text: String(count) })))
    : [h('li', { class: 'muted', text: 'No records yet.' })]));
}
