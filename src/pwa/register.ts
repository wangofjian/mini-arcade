import { INSTALL_DISMISS_KEY } from './promptPolicy';

export { INSTALL_DISMISS_KEY };

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js');
  });
}

export function requestSkipWaiting(worker: ServiceWorker): void {
  worker.postMessage('SKIP_WAITING');
}
