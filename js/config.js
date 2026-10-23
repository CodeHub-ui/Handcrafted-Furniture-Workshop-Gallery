export const APP_NAME = 'Handcrafted Furniture Workshop Gallery';

export const SCHEMA_VERSION = 1;

export const STORAGE_KEYS = Object.freeze({
  records: `hfwg:v${SCHEMA_VERSION}:furniture`,
  meta: `hfwg:v${SCHEMA_VERSION}:meta`,
  corruptBackup: `hfwg:v${SCHEMA_VERSION}:furniture:corrupt-backup`,
});

export const CATEGORIES = Object.freeze(['Chairs', 'Tables', 'Storage', 'Beds', 'Shelving', 'Decor']);

export const STATUSES = Object.freeze([
  { value: 'available', label: 'Available' },
  { value: 'in-production', label: 'In production' },
  { value: 'completed', label: 'Completed' },
]);

export const SORT_OPTIONS = Object.freeze([
  { value: 'date-desc', label: 'Newest first' },
  { value: 'date-asc', label: 'Oldest first' },
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
  { value: 'price-asc', label: 'Price low to high' },
  { value: 'price-desc', label: 'Price high to low' },
]);

export const LIMITS = Object.freeze({
  name: { min: 2, max: 80 },
  material: { min: 2, max: 60 },
  artisan: { min: 2, max: 60 },
  description: { max: 600 },
  dimension: { max: 1000, decimals: 1 }, 
  price: { max: 1000000, decimals: 2 },
  imageUrl: { max: 2048 },
  search: { max: 100 },
});

export const ID_PREFIX = 'FUR-';
export const ID_PATTERN = /^[A-Za-z0-9-]{3,32}$/;

export const LOCALE = undefined;
export const CURRENCY = 'USD';

/** Image paths allowed besides http(s) URLs. */
export const LOCAL_IMAGE_PREFIX = 'assets/images/';
export const IMAGE_PLACEHOLDER = 'assets/images/placeholder.svg';

export const RECENT_ITEMS_COUNT = 5;
export const SEARCH_ANALYTICS_DELAY_MS = 600;
export const TOAST_DURATION_MS = 6000;
export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
