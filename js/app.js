import { SORT_OPTIONS, STATUSES, CATEGORIES, STORAGE_KEYS, APP_NAME, MAX_IMPORT_FILE_BYTES, SEARCH_ANALYTICS_DELAY_MS } from './config.js';
import * as furnitureService from './services/furniture-service.js';
import { ANALYTICS_EVENTS, trackEvent } from './utils/analytics.js';
import { clearChildren, populateSelect } from './utils/dom.js';
import { renderDashboard } from './components/dashboard.js';
import { renderGallery, renderRecordsTable } from './components/gallery.js';
import { createFurnitureForm } from './components/furniture-form.js';
import { openDetails } from './components/furniture-details.js';
import { clearBanner, confirmAction, initNotifications, notify, renderState, setBanner } from './components/notifications.js';
import { initConnectionStatus } from './offline/connection-status.js';
import { registerServiceWorker } from './offline/service-worker-registration.js';

const $ = (id) => document.getElementById(id);

const VIEW_TITLES = { dashboard: 'Dashboard', gallery: 'Furniture gallery', add: 'Add furniture', manage: 'Manage records' };
const DEFAULT_FILTERS = Object.freeze({ search: '', category: '', status: '', sort: 'date-desc' });

const state = { filters: { ...DEFAULT_FILTERS }, activeView: null, searchTimer: null };

const elements = {
  navToggle: $('nav-toggle'),
  navLinks: document.querySelectorAll('[data-route]'),
  views: document.querySelectorAll('.view'),
  search: $('search-input'),
  clearSearch: $('clear-search'),
  category: $('filter-category'),
  status: $('filter-status'),
  sort: $('filter-sort'),
  resultsSummary: $('results-summary'),
  galleryList: $('gallery-list'),
  galleryState: $('gallery-state'),
  detailsDialog: $('details-dialog'),
  tableWrap: $('records-table-wrap'),
  tableBody: $('records-body'),
  manageState: $('manage-state'),
  manageStatus: $('manage-status'),
  importFile: $('import-file'),
};


const recordHandlers = {
  onView: openRecord,
  onEdit: (record) => { window.location.hash = `#/edit/${encodeURIComponent(record.id)}`; },
  onDelete: handleDelete,
  onResetFilters: resetFilters,
  onAddSamples: handleAddSamples,
};

const hasActiveFilters = () => Object.keys(DEFAULT_FILTERS).some((key) => key !== 'sort' && state.filters[key] !== '');

function renderGalleryView(allRecords = furnitureService.getAll()) {
  const visible = furnitureService.queryRecords(allRecords, state.filters);
  renderGallery(
    { list: elements.galleryList, stateContainer: elements.galleryState },
    visible,
    { totalCount: allRecords.length, hasActiveFilters: hasActiveFilters() },
    recordHandlers,
  );
  elements.resultsSummary.textContent = allRecords.length === 0
    ? ''
    : `Showing ${visible.length} of ${allRecords.length} ${allRecords.length === 1 ? 'item' : 'items'}.`;
  elements.clearSearch.hidden = state.filters.search === '';
}

function renderManageView(allRecords) {
  const sorted = furnitureService.queryRecords(allRecords, { sort: 'date-desc' });
  elements.tableWrap.hidden = sorted.length === 0;
  if (sorted.length === 0) {
    renderState(elements.manageState, {
      title: 'No furniture records',
      message: 'There is nothing to manage yet. Add a record or restore the sample data.',
      actions: [{ label: 'Add furniture', href: '#/add', primary: true }, { label: 'Add sample records', onClick: handleAddSamples }],
    });
  } else {
    clearChildren(elements.manageState);
  }
  renderRecordsTable(elements.tableBody, sorted, recordHandlers);
}

function renderAll() {
  const allRecords = furnitureService.getAll();
  renderDashboard(
    { statsList: $('stats-list'), recentList: $('recent-list'), categoryList: $('category-list') },
    allRecords,
    { onView: openRecord },
  );
  renderGalleryView(allRecords);
  renderManageView(allRecords);
}


function parseRoute() {
  const [, name = 'dashboard', rawParam] = window.location.hash.replace(/^#/, '').split('/');
  if (name === 'edit' && rawParam) {
    try {
      return { name: 'edit', id: decodeURIComponent(rawParam) };
    } catch {
      return { name: 'manage' };
    }
  }
  return { name: name in VIEW_TITLES ? name : 'dashboard' };
}

function showView(viewName, { moveFocus }) {
  elements.views.forEach((view) => { view.hidden = view.id !== `view-${viewName}`; });
  elements.navLinks.forEach((link) => {
    if (link.dataset.route === viewName) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.title = `${VIEW_TITLES[viewName]} – ${APP_NAME}`;
  elements.navToggle.setAttribute('aria-expanded', 'false');
  state.activeView = viewName;
  if (moveFocus) focusActiveHeading();
}

function focusActiveHeading() {
  const heading = document.querySelector(`#view-${state.activeView} h1`);
  window.scrollTo(0, 0);
  heading?.focus();
}

function handleRouteChange({ moveFocus = true } = {}) {
  const route = parseRoute();

  if (route.name === 'edit') {
    const record = furnitureService.getById(route.id);
    if (!record) {
      notify(`No record with ID “${route.id}” was found.`, 'error');
      window.location.hash = '#/manage';
      return;
    }
    recordForm.setEditMode(record);
    state.editingId = record.id;
    showView('add', { moveFocus });
    return;
  }

  if (route.name === 'add') {
    recordForm.setCreateMode();
    state.editingId = null;
  }
  showView(route.name, { moveFocus });
}

function openRecord(record) {
  trackEvent(ANALYTICS_EVENTS.viewed, { id: record.id });
  openDetails(elements.detailsDialog, record, { onEdit: recordHandlers.onEdit });
}

async function handleSave(rawValues) {
  const isEdit = Boolean(state.editingId);
  const result = isEdit ? furnitureService.update(state.editingId, rawValues) : furnitureService.create(rawValues);

  if (result.errors) return { errors: result.errors };
  if (!result.ok) {
    notify(`Could not save the record. ${result.error.message}`, 'error');
    return undefined;
  }

  trackEvent(isEdit ? ANALYTICS_EVENTS.updated : ANALYTICS_EVENTS.created, { id: result.record.id });
  const suffix = result.persisted ? '' : ' It is not saved to this browser.';
  notify(`${isEdit ? 'Updated' : 'Added'} “${result.record.name}” (${result.record.id}).${suffix}`);
  renderAll();
  window.location.hash = '#/gallery';
  return undefined;
}

async function handleDelete(record) {
  const confirmed = await confirmAction({
    title: 'Delete this furniture record?',
    message: `“${record.name}” (${record.id}) will be permanently removed from this browser. This cannot be undone unless you have exported a backup.`,
    confirmLabel: 'Delete record',
    destructive: true,
  });
  if (!confirmed) return;

  const result = furnitureService.remove(record.id);
  if (!result.ok) {
    notify(`Could not delete “${record.name}”. ${result.error.message}`, 'error');
    return;
  }
  trackEvent(ANALYTICS_EVENTS.deleted, { id: record.id });
  notify(`Deleted “${record.name}”.`);
  renderAll();
  focusActiveHeading();
}

function handleAddSamples() {
  const result = furnitureService.addMissingSamples();
  if (!result.ok) {
    notify(`Could not add sample records. ${result.error.message}`, 'error');
    return;
  }
  notify(result.added === 0 ? 'All sample records are already present.' : `Added ${result.added} sample records.`, 'success');
  renderAll();
}

async function handleReset() {
  const confirmed = await confirmAction({
    title: 'Reset to sample data?',
    message: 'This replaces ALL current records with the original sample records. Export a backup first if you need your data.',
    confirmLabel: 'Reset data',
    destructive: true,
  });
  if (!confirmed) return;

  const result = furnitureService.resetToSamples();
  if (!result.ok) {
    notify(`Could not reset the data. ${result.error.message}`, 'error');
    return;
  }
  trackEvent(ANALYTICS_EVENTS.dataReset);
  notify('Sample data restored.');
  renderAll();
}

function handleExport() {
  const blob = new Blob([furnitureService.exportJson()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `furniture-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  trackEvent(ANALYTICS_EVENTS.dataExported);
  notify('Backup file downloaded.');
}

async function handleImport(file) {
  if (!file) return;
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    notify('That file is too large to import (5 MB limit).', 'error');
    return;
  }
  renderState(elements.manageStatus, { kind: 'loading', title: 'Reading backup file…' });
  try {
    const result = furnitureService.importJson(await file.text());
    if (!result.ok) {
      notify(`Import failed. ${result.error.message}`, 'error');
      return;
    }
    trackEvent(ANALYTICS_EVENTS.dataImported, { imported: result.imported });
    const skipped = result.skippedInvalid + result.skippedDuplicate;
    notify(`Imported ${result.imported} ${result.imported === 1 ? 'record' : 'records'}.${skipped ? ` Skipped ${result.skippedInvalid} invalid and ${result.skippedDuplicate} duplicate.` : ''}`);
    renderAll();
  } catch {
    notify('The file could not be read.', 'error');
  } finally {
    clearChildren(elements.manageStatus);
    elements.importFile.value = '';
  }
}

function resetFilters() {
  state.filters = { ...DEFAULT_FILTERS };
  elements.search.value = '';
  elements.category.value = '';
  elements.status.value = '';
  elements.sort.value = DEFAULT_FILTERS.sort;
  renderGalleryView();
  elements.search.focus();
}

function handleSearchInput() {
  state.filters.search = elements.search.value;
  renderGalleryView();
  window.clearTimeout(state.searchTimer);
  state.searchTimer = window.setTimeout(() => {
    if (state.filters.search.trim() === '') return;
    const resultCount = elements.galleryList.children.length;
    trackEvent(ANALYTICS_EVENTS.searched, { queryLength: state.filters.search.trim().length, resultCount });
  }, SEARCH_ANALYTICS_DELAY_MS);
}

function handleFilterChange(key, control) {
  state.filters[key] = control.value;
  trackEvent(ANALYTICS_EVENTS.filterChanged, { filter: key });
  renderGalleryView();
}

function setupFilters() {
  populateSelect(elements.category, CATEGORIES, 'All categories');
  populateSelect(elements.status, STATUSES, 'All statuses');
  populateSelect(elements.sort, SORT_OPTIONS);
  elements.search.addEventListener('input', handleSearchInput);
  elements.clearSearch.addEventListener('click', () => {
    elements.search.value = '';
    handleSearchInput();
    elements.search.focus();
  });
  elements.category.addEventListener('change', () => handleFilterChange('category', elements.category));
  elements.status.addEventListener('change', () => handleFilterChange('status', elements.status));
  elements.sort.addEventListener('change', () => handleFilterChange('sort', elements.sort));
  $('reset-filters').addEventListener('click', resetFilters);
  $('filter-form').addEventListener('submit', (event) => event.preventDefault());
}

function applyStorageStatus({ status, message }) {
  clearBanner('storage');
  if (message) setBanner('storage', message, status === 'unavailable' ? 'warning' : 'error');
  if (status === 'seeded') notify('Sample records were added for first-time use.', 'info');
}

function setupNavigation() {
  elements.navToggle.addEventListener('click', () => {
    const isOpen = elements.navToggle.getAttribute('aria-expanded') === 'true';
    elements.navToggle.setAttribute('aria-expanded', String(!isOpen));
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && elements.navToggle.getAttribute('aria-expanded') === 'true') {
      elements.navToggle.setAttribute('aria-expanded', 'false');
      elements.navToggle.focus();
    }
  });
  window.addEventListener('hashchange', () => handleRouteChange());
}

function setupDataTools() {
  $('export-data').addEventListener('click', handleExport);
  $('import-data').addEventListener('click', () => elements.importFile.click());
  elements.importFile.addEventListener('change', () => handleImport(elements.importFile.files[0]));
  $('restore-samples').addEventListener('click', handleAddSamples);
  $('reset-data').addEventListener('click', handleReset);
}

function setupStatusServices() {
  initConnectionStatus({
    indicator: $('connection-status'),
    textElement: $('connection-text'),
    onChange: (isOnline) => {
      if (isOnline) {
        clearBanner('offline');
        notify('Back online.', 'info');
      } else {
        setBanner('offline', 'You are offline. Records are stored on this device, so browsing and editing still work. Remote images may not load.', 'warning');
      }
    },
  });
  if (!navigator.onLine) setBanner('offline', 'You are offline. Records are stored on this device, so browsing and editing still work. Remote images may not load.', 'warning');

  registerServiceWorker({ onStatus: (_, message) => { $('sw-status').textContent = message; } });

  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEYS.records) return;
    applyStorageStatus(furnitureService.initialize());
    renderAll();
    notify('Records changed in another tab, so this view was refreshed.', 'info');
  });
}

const recordForm = createFurnitureForm({
  form: $('furniture-form'),
  titleElement: $('form-title'),
  ledeElement: $('form-lede'),
  submitButton: $('form-submit'),
  summaryElement: $('form-error-summary'),
  onSubmit: handleSave,
});

function start() {
  initNotifications({
    toastRegion: $('toast-region'),
    alertRegion: $('alert-region'),
    bannerRegion: $('banner-region'),
    confirmDialog: $('confirm-dialog'),
  });
  setupFilters();
  setupNavigation();
  setupDataTools();
  setupStatusServices();

  applyStorageStatus(furnitureService.initialize());
  renderAll();
  $('startup-message').remove();
  handleRouteChange({ moveFocus: false });
}

start();
