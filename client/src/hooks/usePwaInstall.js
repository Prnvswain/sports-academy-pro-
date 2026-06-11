import { useCallback, useEffect, useState } from 'react';

export function usePwaInstall() {
  const [isInstallable, setIsInstallable] = useState(false);

  const [installHint, setInstallHint] = useState('');

  useEffect(() => {
    // Already available?
    if (window.__deferredInstallPrompt) {
      setIsInstallable(true);

      setInstallHint(
        'Install SAMS on your device for offline dashboard access.'
      );
    }

    // Install became available
    const onInstallAvailable = () => {
      setIsInstallable(true);

      setInstallHint(
        'Install SAMS on your device for offline dashboard access.'
      );
    };

    // App installed
    const onInstalled = () => {
      setIsInstallable(false);

      setInstallHint(
        'SAMS installed successfully.'
      );
    };

    window.addEventListener(
      'pwa-install-available',
      onInstallAvailable
    );

    window.addEventListener(
      'pwa-installed',
      onInstalled
    );

    return () => {
      window.removeEventListener(
        'pwa-install-available',
        onInstallAvailable
      );

      window.removeEventListener(
        'pwa-installed',
        onInstalled
      );
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const deferredPrompt = window.__deferredInstallPrompt;

    if (!deferredPrompt) {
      setInstallHint(
        'Install is not available yet. Open in Chrome and interact with the app first.'
      );

      return { outcome: 'unavailable' };
    }

    // Show install popup
    await deferredPrompt.prompt();

    // Wait for user choice
    const choice = await deferredPrompt.userChoice;

    console.log('Install choice:', choice.outcome);

    // Clear saved prompt
    window.__deferredInstallPrompt = null;

    setIsInstallable(false);

    if (choice.outcome === 'accepted') {
      setInstallHint(
        'SAMS installed successfully.'
      );
    } else {
      setInstallHint(
        'Install dismissed. You can install later from browser menu.'
      );
    }

    return choice;
  }, []);

  return {
    isInstallable,
    installHint,
    promptInstall,
    setInstallHint
  };
}