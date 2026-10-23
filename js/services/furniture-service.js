import { APP_NAME, CATEGORIES, ID_PATTERN, ID_PREFIX } from '../config.js';
import { SAMPLE_FURNITURE } from '../data/sample-furniture.js';
import { normalizeText } from '../utils/sanitization.js';
import { toFormValues, validateFurnitureInput } from '../utils/validation.js';
import * as storage from './storage-service.js';

const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

let records = [];
let memoryOnly = false; 

const clone = (value) => structuredClone(value);
const cloneSamples = () => clone([...SAMPLE_FURNITURE]);
const nowIso = () => new Date().toISOString();

function randomToken(length) {
  const bytes = new Uint8Array(length);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else bytes.forEach((_, index) => { bytes[index] = Math.floor(Math.random() * 256); });
  return Array.from(bytes, (byte) => ID_ALPHABET[byte % ID_ALPHABET.length]).join('');
}

function generateId(existingIds) {
  let id;
  do {
    id = `${ID_PREFIX}${randomToken(6)}`;
  } while (existingIds.has(id));
  return id;
}

function toIsoOrNow(value) {
  const time = typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isNaN(time) ? nowIso() : new Date(time).toISOString();
}

function normalizeStoredRecord(candidate) {
  if (!candidate || typeof candidate !== 'object') return null;
  const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
  if (!ID_PATTERN.test(id)) return null;

  const { isValid, values } = validateFurnitureInput(toFormValues(candidate));
  if (!isValid) return null;

  const dateAdded = toIsoOrNow(candidate.dateAdded);
  return { id, ...values, dateAdded, dateUpdated: toIsoOrNow(candidate.dateUpdated ?? dateAdded) };
}

function normalizeMany(candidates, takenIds = new Set()) {
  const accepted = [];
  const rejectedRaw = [];
  let duplicates = 0;
  const seen = new Set(takenIds);

  for (const candidate of candidates) {
    const record = normalizeStoredRecord(candidate);
    if (!record) rejectedRaw.push(candidate);
    else if (seen.has(record.id)) duplicates += 1;
    else {
      seen.add(record.id);
      accepted.push(record);
    }
  }
  return { accepted, invalid: rejectedRaw.length, duplicates, rejectedRaw };
}

function commit(nextRecords) {
  const previous = records;
  records = nextRecords;
  if (memoryOnly) return { ok: true, persisted: false };

  const result = storage.saveRecords(records);
  if (!result.ok) records = previous;
  return { ...result, persisted: result.ok };
}

function failure(result) {
  return { ok: false, error: result.error };
}

function seedSamples() {
  records = cloneSamples();
  if (memoryOnly) return true;
  const saved = storage.saveRecords(records);
  if (!saved.ok) {
    memoryOnly = true;
    return false;
  }
  storage.saveMeta({ sampleDataSeeded: true });
  return true;
}

export function initialize() {
  memoryOnly = !storage.isStorageAvailable();
  if (memoryOnly) {
    records = cloneSamples();
    return {
      status: 'unavailable',
      message: 'Browser storage is unavailable, so changes will be lost when you close or refresh this page. Showing sample records only.',
    };
  }

  const loaded = storage.loadRecords();

  if (loaded.status === 'empty') {
    if (storage.loadMeta().sampleDataSeeded) {
      records = [];
      return { status: 'ready' };
    }
    const persisted = seedSamples();
    return persisted
      ? { status: 'seeded' }
      : { status: 'unavailable', message: 'Sample records loaded, but they could not be saved to browser storage.' };
  }

  if (loaded.status === 'corrupted' || loaded.status === 'newer-version') {
    records = [];
    const reason = loaded.status === 'newer-version'
      ? 'Saved records were created by a newer version of this app.'
      : 'Saved records could not be read.';
    return {
      status: 'corrupted',
      message: `${reason} A copy was kept in browser storage and nothing was deleted. You can add new records, import a backup, or restore the sample data from Manage records.`,
    };
  }

  const { accepted, invalid, duplicates, rejectedRaw } = normalizeMany(loaded.records);
  records = accepted;
  if (invalid + duplicates > 0) {
    storage.saveCorruptBackup(JSON.stringify(rejectedRaw));
    return {
      status: 'recovered',
      message: `${invalid + duplicates} saved record${invalid + duplicates === 1 ? ' was' : 's were'} invalid or duplicated and left out. A copy of ${invalid === 1 ? 'it' : 'them'} was kept in browser storage.`,
    };
  }
  return { status: 'ready' };
}

export const getAll = () => clone(records);
export const getById = (id) => clone(records.find((record) => record.id === id) ?? null);

export function create(rawValues) {
  const { isValid, errors, values } = validateFurnitureInput(rawValues);
  if (!isValid) return { ok: false, errors };

  const timestamp = nowIso();
  const id = generateId(new Set(records.map((record) => record.id)));
  const record = { id, ...values, dateAdded: timestamp, dateUpdated: timestamp };

  const result = commit([record, ...records]);
  return result.ok ? { ok: true, record: clone(record), persisted: result.persisted } : failure(result);
}

export function update(id, rawValues) {
  const existing = records.find((record) => record.id === id);
  if (!existing) return { ok: false, error: { message: 'That record no longer exists.' } };

  const { isValid, errors, values } = validateFurnitureInput(rawValues);
  if (!isValid) return { ok: false, errors };

  const updated = { ...existing, ...values, id: existing.id, dateAdded: existing.dateAdded, dateUpdated: nowIso() };
  const result = commit(records.map((record) => (record.id === id ? updated : record)));
  return result.ok ? { ok: true, record: clone(updated), persisted: result.persisted } : failure(result);
}

export function remove(id) {
  if (!records.some((record) => record.id === id)) {
    return { ok: false, error: { message: 'That record no longer exists.' } };
  }
  const result = commit(records.filter((record) => record.id !== id));
  return result.ok ? { ok: true, persisted: result.persisted } : failure(result);
}

export function resetToSamples() {
  const result = commit(cloneSamples());
  if (result.ok && !memoryOnly) storage.saveMeta({ sampleDataSeeded: true });
  return result.ok ? { ok: true, persisted: result.persisted } : failure(result);
}

export function addMissingSamples() {
  const existingIds = new Set(records.map((record) => record.id));
  const missing = cloneSamples().filter((sampleRecord) => !existingIds.has(sampleRecord.id));
  if (missing.length === 0) return { ok: true, added: 0 };
  const result = commit([...records, ...missing]);
  return result.ok ? { ok: true, added: missing.length, persisted: result.persisted } : failure(result);
}

export function exportJson() {
  return JSON.stringify({ app: APP_NAME, exportedAt: nowIso(), schemaVersion: 1, records }, null, 2);
}

export function importJson(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: { message: 'The file is not valid JSON.' } };
  }
  const candidates = Array.isArray(parsed) ? parsed : parsed?.records;
  if (!Array.isArray(candidates)) return { ok: false, error: { message: 'The file does not contain a list of records.' } };

  const { accepted, invalid, duplicates } = normalizeMany(candidates, new Set(records.map((record) => record.id)));
  if (accepted.length === 0) {
    return { ok: true, imported: 0, skippedInvalid: invalid, skippedDuplicate: duplicates };
  }
  const result = commit([...accepted, ...records]);
  return result.ok
    ? { ok: true, imported: accepted.length, skippedInvalid: invalid, skippedDuplicate: duplicates }
    : failure(result);
}

function matchesSearch(record, terms) {
  if (terms.length === 0) return true;
  const haystack = [record.name, record.id, record.category, record.material, record.artisan].join(' ').toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

const compareText = (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' });

function comparePrice(a, b, direction) {
  if (a.price === null && b.price === null) return 0;
  if (a.price === null) return 1; // records without a price always sort last
  if (b.price === null) return -1;
  return direction * (a.price - b.price);
}

const SORTERS = {
  'date-desc': (a, b) => Date.parse(b.dateAdded) - Date.parse(a.dateAdded),
  'date-asc': (a, b) => Date.parse(a.dateAdded) - Date.parse(b.dateAdded),
  'name-asc': (a, b) => compareText(a.name, b.name),
  'name-desc': (a, b) => compareText(b.name, a.name),
  'price-asc': (a, b) => comparePrice(a, b, 1),
  'price-desc': (a, b) => comparePrice(a, b, -1),
};

export function queryRecords(list, { search = '', category = '', status = '', sort = 'date-desc' } = {}) {
  const terms = normalizeText(search).toLowerCase().split(' ').filter(Boolean);
  const sorter = SORTERS[sort] ?? SORTERS['date-desc'];
  return list
    .filter((record) => (!category || record.category === category) && (!status || record.status === status))
    .filter((record) => matchesSearch(record, terms))
    .sort(sorter);
}

export function getStats(list) {
  const countStatus = (status) => list.filter((record) => record.status === status).length;
  return {
    total: list.length,
    available: countStatus('available'),
    inProduction: countStatus('in-production'),
    completed: countStatus('completed'),
  };
}

export function getCategoryCounts(list) {
  return CATEGORIES
    .map((category) => ({ category, count: list.filter((record) => record.category === category).length }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);
}
