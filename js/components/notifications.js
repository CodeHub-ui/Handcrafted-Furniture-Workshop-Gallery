import { TOAST_DURATION_MS } from '../config.js';
import { clearChildren, h } from '../utils/dom.js';

let regions = {};
let confirmElements = {};

export function initNotifications({ toastRegion, alertRegion, bannerRegion, confirmDialog }) {
  regions = { toastRegion, alertRegion, bannerRegion };
  confirmElements = {
    dialog: confirmDialog,
    title: confirmDialog.querySelector('#confirm-title'),
    message: confirmDialog.querySelector('#confirm-message'),
    confirmButton: confirmDialog.querySelector('#confirm-accept'),
  };
}

export function notify(message, type = 'success') {
  const container = type === 'error' ? regions.alertRegion : regions.toastRegion;
  const toast = h('div', { class: `toast toast--${type}` },
    h('p', { class: 'toast-message', text: message }),
    h('button', {
      type: 'button',
      class: 'btn btn--quiet btn--small',
      text: 'Dismiss',
      'aria-label': 'Dismiss notification',
      onclick: () => toast.remove(),
    }));
  container.append(toast);
  window.setTimeout(() => toast.remove(), type === 'error' ? TOAST_DURATION_MS * 2 : TOAST_DURATION_MS);
}

export function setBanner(id, message, type = 'info') {
  clearBanner(id);
  const banner = h('div', { class: `banner banner--${type}`, 'data-banner-id': id, role: 'status' },
    h('p', { text: message }),
    h('button', {
      type: 'button',
      class: 'btn btn--small',
      text: 'Dismiss',
      'aria-label': 'Dismiss message',
      onclick: () => banner.remove(),
    }));
  regions.bannerRegion.append(banner);
}

export function clearBanner(id) {
  regions.bannerRegion.querySelectorAll(`[data-banner-id="${id}"]`).forEach((node) => node.remove());
}

export function confirmAction({ title, message, confirmLabel = 'Confirm', destructive = false }) {
  const { dialog, title: titleElement, message: messageElement, confirmButton } = confirmElements;
  titleElement.textContent = title;
  messageElement.textContent = message;
  confirmButton.textContent = confirmLabel;
  confirmButton.className = `btn ${destructive ? 'btn--danger' : 'btn--primary'}`;
  dialog.returnValue = '';

  return new Promise((resolve) => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true });
    dialog.showModal();
  });
}

export function renderState(container, { kind = 'empty', title, message = '', actions = [] }) {
  clearChildren(container);
  const actionNodes = actions.map(({ label, onClick, href, primary }) => {
    const className = `btn${primary ? ' btn--primary' : ''}`;
    return href
      ? h('a', { class: className, href, text: label })
      : h('button', { type: 'button', class: className, text: label, onclick: onClick });
  });

  container.append(h('div', { class: `state-message state-message--${kind}`, role: kind === 'error' ? 'alert' : 'status' },
    kind === 'loading' && h('span', { class: 'spinner', 'aria-hidden': 'true' }),
    h('h2', { class: 'state-title', text: title }),
    message && h('p', { class: 'state-text', text: message }),
    actionNodes.length > 0 && h('div', { class: 'button-row' }, actionNodes)));
}
