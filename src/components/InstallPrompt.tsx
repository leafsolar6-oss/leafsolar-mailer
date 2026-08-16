'use client';
import { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect if already installed / standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) return;

    // Check if dismissed before
    if (localStorage.getItem('pwa-install-dismissed') === '1') return;

    // iOS detection (doesn't support beforeinstallprompt)
    const ua = window.navigator.userAgent.toLowerCase();
    const isApple = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/crios|fxios/.test(ua);
    if (isApple && isSafari) {
      setIsIOS(true);
      setTimeout(() => setShow(true), 2500);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShow(true), 2500);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShow(false);
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('pwa-install-dismissed', '1');
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 lg:left-auto lg:right-6 lg:bottom-6 lg:max-w-sm z-[90] animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 flex items-start gap-3">
        <div className="w-11 h-11 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center flex-shrink-0">
          <Smartphone className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 text-sm">Install Leaf Solar Mailer</p>
          {isIOS ? (
            <p className="text-xs text-gray-500 mt-0.5">
              Tap <span className="font-semibold">Share</span> then <span className="font-semibold">Add to Home Screen</span>.
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-0.5">
              Install the app on your device for quick, full-screen access.
            </p>
          )}
          {!isIOS && (
            <button onClick={handleInstall}
              className="mt-2 flex items-center gap-1.5 bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-green-700">
              <Download className="w-3.5 h-3.5" /> Install Now
            </button>
          )}
        </div>
        <button onClick={dismiss} className="p-1 hover:bg-gray-100 rounded-lg flex-shrink-0">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}
