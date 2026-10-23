export async function registerServiceWorker({ onStatus }) {
  if (!('serviceWorker' in navigator)) {
    onStatus('unsupported', 'Offline support is not available in this browser.');
    return;
  }
  if (!window.isSecureContext) {
    onStatus('unsupported', 'Offline support needs http://localhost or HTTPS. Start a local server (see README).');
    return;
  }

  try {
    if (document.readyState !== 'complete') {
      await new Promise((resolve) => window.addEventListener('load', resolve, { once: true }));
    }
    onStatus('installing', 'Offline support: installing…');
    await navigator.serviceWorker.register('./service-worker.js', { scope: './' });
    await navigator.serviceWorker.ready;
    onStatus('ready', 'Offline support: ready. App files are cached on this device.');
  } catch (error) {
    onStatus('failed', `Offline support could not start (${error.message}). The app still works while online.`);
  }
}
