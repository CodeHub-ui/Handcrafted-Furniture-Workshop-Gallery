import { CURRENCY, LOCALE, STATUSES } from '../config.js';

const currencyFormatter = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY });
const dateFormatter = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium' });

export function formatPrice(value) {
  return typeof value === 'number' ? currencyFormatter.format(value) : 'Not set';
}

export function formatDate(isoString) {
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? 'Unknown' : dateFormatter.format(date);
}

export function formatDimensions({ length, width, height } = {}) {
  const parts = [length, width, height];
  if (parts.every((part) => part === null || part === undefined)) return 'Not specified';
  return `${parts.map((part) => part ?? '—').join(' × ')} cm`;
}

export function statusLabel(value) {
  return STATUSES.find((status) => status.value === value)?.label ?? value;
}
