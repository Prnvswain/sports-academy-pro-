import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

// Global deferred install prompt cache
window.__deferredInstallPrompt = null;

// Capture install event as early as possible
window.addEventListener('beforeinstallprompt', (event) => {
  console.log('beforeinstallprompt fired');

  // Prevent mini-infobar
  event.preventDefault();

  // Save event globally
  window.__deferredInstallPrompt = event;

  // Notify app
  window.dispatchEvent(new Event('pwa-install-available'));
});

// Detect successful install
window.addEventListener('appinstalled', () => {
  console.log('PWA installed');

  window.__deferredInstallPrompt = null;

  window.dispatchEvent(new Event('pwa-installed'));
});

// Register service worker
const updateSW = registerSW({
  onNeedRefresh() {
    if (window.confirm('A new version of SAMS is available. Reload now?')) {
      updateSW(true);
    }
  },

  onOfflineReady() {
    console.info('SAMS is ready for offline use.');
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);