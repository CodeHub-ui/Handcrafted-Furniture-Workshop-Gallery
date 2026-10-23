import { CATEGORIES, STATUSES, LIMITS } from '../config.js';
import { normalizeText, normalizeMultilineText, isSafeImageUrl } from './sanitization.js';

export const FORM_FIELDS = Object.freeze([
  'name', 'category', 'material', 'artisan', 'length', 'width', 'height',
  'price', 'status', 'description', 'imageUrl',
]);

const NUMBER_PATTERN = /^\d+(\.\d+)?$/;
const PERSON_NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}\s'.-]*$/u;

function checkRequiredText(value, label, { min, max }) {
  if (!value) return `${label} is required.`;
  if (value.length < min) return `${label} must be at least ${min} characters.`;
  if (value.length > max) return `${label} must be ${max} characters or fewer.`;
  return '';
}

function countDecimals(text) {
  const [, decimals = ''] = text.split('.');
  return decimals.length;
}
function parseOptionalNumber(rawValue, label, { max, decimals }) {
  const text = normalizeText(rawValue);
  if (text === '') return { value: null, error: '' };
  if (text.startsWith('-')) return { value: null, error: `${label} cannot be negative.` };
  if (!NUMBER_PATTERN.test(text)) {
    return { value: null, error: `${label} must be a number such as 12 or 12.5 (no commas or letters).` };
  }
  if (countDecimals(text) > decimals) {
    return { value: null, error: `${label} can have at most ${decimals} decimal place${decimals === 1 ? '' : 's'}.` };
  }
  const value = Number(text);
  if (!Number.isFinite(value) || value > max) {
    return { value: null, error: `${label} must be ${max.toLocaleString('en-US')} or less.` };
  }
  return { value, error: '' };
}

export function validateFurnitureInput(raw) {
  const errors = {};
  const text = {
    name: normalizeText(raw.name),
    category: normalizeText(raw.category),
    material: normalizeText(raw.material),
    artisan: normalizeText(raw.artisan),
    status: normalizeText(raw.status),
    imageUrl: normalizeText(raw.imageUrl),
    description: normalizeMultilineText(raw.description),
  };

  const nameError = checkRequiredText(text.name, 'Furniture name', LIMITS.name);
  if (nameError) errors.name = nameError;

  if (!text.category) errors.category = 'Choose a category.';
  else if (!CATEGORIES.includes(text.category)) errors.category = 'Choose a category from the list.';

  const materialError = checkRequiredText(text.material, 'Material', LIMITS.material);
  if (materialError) errors.material = materialError;

  const artisanError = checkRequiredText(text.artisan, 'Artisan name', LIMITS.artisan);
  if (artisanError) errors.artisan = artisanError;
  else if (!PERSON_NAME_PATTERN.test(text.artisan)) {
    errors.artisan = 'Artisan name can contain letters, spaces, apostrophes, periods and hyphens only.';
  }

  const dimensions = {};
  for (const key of ['length', 'width', 'height']) {
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    const { value, error } = parseOptionalNumber(raw[key], label, LIMITS.dimension);
    dimensions[key] = value;
    if (error) errors[key] = error;
  }

  const priceResult = parseOptionalNumber(raw.price, 'Price', LIMITS.price);
  if (priceResult.error) errors.price = priceResult.error;

  if (!STATUSES.some((status) => status.value === text.status)) errors.status = 'Choose a production status.';

  if (text.description.length > LIMITS.description.max) {
    errors.description = `Description must be ${LIMITS.description.max} characters or fewer.`;
  }

  if (text.imageUrl) {
    if (text.imageUrl.length > LIMITS.imageUrl.max) errors.imageUrl = 'Image URL is too long.';
    else if (!isSafeImageUrl(text.imageUrl)) {
      errors.imageUrl = 'Enter an http:// or https:// link, or a path starting with assets/images/.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    values: {
      name: text.name,
      category: text.category,
      material: text.material,
      artisan: text.artisan,
      dimensions,
      price: priceResult.value,
      status: text.status,
      description: text.description,
      imageUrl: text.imageUrl,
    },
  };
}

const asString = (value) => (value === null || value === undefined ? '' : String(value));

export function toFormValues(record) {
  const dimensions = record?.dimensions ?? {};
  return {
    name: asString(record?.name),
    category: asString(record?.category),
    material: asString(record?.material),
    artisan: asString(record?.artisan),
    length: asString(dimensions.length),
    width: asString(dimensions.width),
    height: asString(dimensions.height),
    price: asString(record?.price),
    status: asString(record?.status),
    description: asString(record?.description),
    imageUrl: asString(record?.imageUrl),
  };
}
