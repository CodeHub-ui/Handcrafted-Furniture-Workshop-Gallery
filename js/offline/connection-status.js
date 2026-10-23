export function initConnectionStatus({ indicator, textElement, onChange }) {
  function update() {
    const isOnline = navigator.onLine;
    indicator.dataset.state = isOnline ? 'online' : 'offline';
    textElement.textContent = isOnline ? 'Online' : 'Offline';
    return isOnline;
  }

  window.addEventListener('online', () => onChange(update()));
  window.addEventListener('offline', () => onChange(update()));
  return update();
}
