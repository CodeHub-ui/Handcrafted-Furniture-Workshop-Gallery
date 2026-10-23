import { SCHEMA_VERSION, STORAGE_KEYS } from '../config.js';
const MIGRATIONS = {};

export function isStorageAvailable() {
  try {
    const probeKey = '__hfwg_probe__';
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

function migrateEnvelope(envelope) {
  let current = envelope;
  while (current.schemaVersion < SCHEMA_VERSION) {
    const migrate = MIGRATIONS[current.schemaVersion];
    if (!migrate) throw new Error(`No migration from schema version ${current.schemaVersion}.`);
    current = migrate(current);
  }
  return current;
}

function describeWriteError(error) {
  const isQuota = error?.name === 'QuotaExceededError' || error?.name === 'NS_ERROR_DOM_QUOTA_REACHED';
  return isQuota
    ? { type: 'quota', message: 'Browser storage is full. Export a backup and free some space, then try again.' }
    : { type: 'unavailable', message: 'Browser storage could not be written to. It may be disabled or blocked.' };
}

function writeItem(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: describeWriteError(error) };
  }
}

export function loadRecords() {
  let raw;
  try {
    raw = window.localStorage.getItem(STORAGE_KEYS.records);
  } catch {
    return { status: 'unavailable', records: [] };
  }
  if (raw === null) return { status: 'empty', records: [] };

  try {
    const parsed = JSON.parse(raw);
    const isEnvelope = parsed && typeof parsed === 'object' && Number.isInteger(parsed.schemaVersion)
      && Array.isArray(parsed.records);
    if (!isEnvelope) throw new Error('Unexpected data shape.');
    if (parsed.schemaVersion > SCHEMA_VERSION) {
      saveCorruptBackup(raw);
      return { status: 'newer-version', records: [] };
    }
    return { status: 'ok', records: migrateEnvelope(parsed).records };
  } catch {
    saveCorruptBackup(raw);
    return { status: 'corrupted', records: [] };
  }
}

export function saveRecords(records) {
  const envelope = { schemaVersion: SCHEMA_VERSION, savedAt: new Date().toISOString(), records };
  return writeItem(STORAGE_KEYS.records, JSON.stringify(envelope));
}
export function saveCorruptBackup(rawText) {
  return writeItem(STORAGE_KEYS.corruptBackup, rawText);
}

export function loadMeta() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.meta));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveMeta(meta) {
  return writeItem(STORAGE_KEYS.meta, JSON.stringify(meta));
}
