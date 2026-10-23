import { LOCAL_IMAGE_PREFIX } from '../config.js';
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const LOCAL_IMAGE_PATH = /^[\w\-./]+$/;

export function normalizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(CONTROL_CHARACTERS, '').replace(/\s+/g, ' ').trim();
}

export function normalizeMultilineText(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(CONTROL_CHARACTERS, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function isSafeImageUrl(value) {
  const text = normalizeText(value);
  if (!text) return false;

  if (text.startsWith(LOCAL_IMAGE_PREFIX)) {
    return LOCAL_IMAGE_PATH.test(text) && !text.includes('..');
  }

  try {
    const url = new URL(text);
    const isWebProtocol = url.protocol === 'https:' || url.protocol === 'http:';
    return isWebProtocol && !url.username && !url.password;
  } catch {
    return false;
  }
}
