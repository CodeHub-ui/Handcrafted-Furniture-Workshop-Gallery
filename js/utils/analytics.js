import { APP_NAME } from '../config.js';
export const ANALYTICS_EVENTS = Object.freeze({
  created: 'furniture_created',
  updated: 'furniture_updated',
  deleted: 'furniture_deleted',
  searched: 'furniture_searched',
  viewed: 'record_viewed',
  filterChanged: 'filter_changed',
  dataExported: 'data_exported',
  dataImported: 'data_imported',
  dataReset: 'data_reset',
});

export function trackEvent(action, details = {}) {
  console.info(`[Analytics] User interacted with ${APP_NAME}`, {
    action,
    ...details,
    timestamp: new Date().toISOString(),
  });
}
