import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/apiClient';

const PUBLIC_VAPID_KEY = 'BGixtKJV9Uh2ov9bXcNo-9IanofbeUOJcIV2pZ6R4fBk478mbbZwYd5DNowJ-GExxlBUQaCt9Ba1Ybv74zALyvE';

// Utility to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PwaPromptManager() {
  const { user, isAuthenticated } = useAuth();

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const [showPermissionBanner, setShowPermissionBanner] = useState(false);

  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const checkStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsStandalone(checkStandalone);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);

      const isDismissed = localStorage.getItem('connecthub_install_dismissed') === 'true';
      if (!isDismissed && !checkStandalone) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      const permission = Notification.permission;
      const alreadyAsked = localStorage.getItem('connecthub_push_asked');

      if (permission === 'default' && alreadyAsked !== 'denied' && alreadyAsked !== 'granted') {
        const timer = setTimeout(() => {
          setShowPermissionBanner(true);
        }, 3000);
        return () => clearTimeout(timer);
      } else if (permission === 'granted') {
        syncPushSubscription();
      }
    }
  }, [isAuthenticated, user]);

  const getDeviceDetails = () => {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    if (ua.indexOf('Chrome') > -1) browser = 'Chrome';
    else if (ua.indexOf('Safari') > -1) browser = 'Safari';
    else if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
    else if (ua.indexOf('Edge') > -1) browser = 'Edge';

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    return {
      browser,
      deviceType: isMobile ? 'mobile' : 'desktop'
    };
  };

  const syncPushSubscription = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[PWA Prompt] Push notifications are not supported by this browser.');
      return;
    }

    try {
      // Dynamically fetch public VAPID key from backend with fallback
      let vapidKey = PUBLIC_VAPID_KEY;
      try {
        const response = await api.get('/notifications/vapid-key');
        if (response.data && response.data.vapidPublicKey) {
          vapidKey = response.data.vapidPublicKey;
          console.log('[PWA Prompt] Successfully fetched dynamic VAPID key from backend.');
        }
      } catch (err) {
        console.warn('[PWA Prompt] Failed to fetch dynamic VAPID key, falling back to default:', err);
      }

      const registration = await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const convertedKey = urlBase64ToUint8Array(vapidKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey
        });
        console.log('[PWA Prompt] Created new push subscription:', subscription);
      }

      const { browser, deviceType } = getDeviceDetails();

      await api.post('/notifications/subscribe', {
        subscription,
        role: user?.role || 'customer',
        deviceType,
        browser,
        notificationPermission: 'granted'
      });

      localStorage.setItem('connecthub_push_asked', 'granted');
      console.log('[PWA Prompt] Successfully synchronized push subscription with backend.');
    } catch (error) {
      console.error('[PWA Prompt] Failed to sync push subscription:', error);
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    setShowInstallBanner(false);
    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA Prompt] Install selection outcome:', outcome);

    if (outcome === 'accepted') {
      setIsStandalone(true);
    } else {
      localStorage.setItem('connecthub_install_dismissed', 'true');
    }

    setDeferredPrompt(null);
  };

  const handleInstallLater = () => {
    setShowInstallBanner(false);
    localStorage.setItem('connecthub_install_dismissed', 'true');
  };

  const handleAllowNotifications = async () => {
    setShowPermissionBanner(false);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        localStorage.setItem('connecthub_push_asked', 'granted');
        await syncPushSubscription();
      } else {
        localStorage.setItem('connecthub_push_asked', 'denied');
      }
    } catch (e) {
      console.error('[PWA Prompt] Notification permission request error:', e);
    }
  };

  const handleDismissNotifications = () => {
    setShowPermissionBanner(false);
    localStorage.setItem('connecthub_push_asked', 'dismissed');
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-3 max-w-md md:left-auto md:right-6 pointer-events-none">

      {isOffline && (
        <div className="pointer-events-auto bg-red-600 text-white rounded-lg p-3 shadow-lg flex items-center justify-between border border-red-500 animate-bounce">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-3.536 4.978 4.978 0 011.414-3.536m0 0L2 21m11-13a3 3 0 10-6 0 3 3 0 006 0z" />
            </svg>
            <span className="text-sm font-semibold">You are offline. ConnectHub is operating in cached mode.</span>
          </div>
        </div>
      )}

      {showInstallBanner && !isStandalone && (
        <div className="pointer-events-auto bg-white border border-blue-100 rounded-xl p-4 shadow-xl flex flex-col gap-3 animate-slide-in">
          <div className="flex items-start gap-3">
            <div className="bg-blue-500 text-white rounded-lg p-2 flex-shrink-0">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Install ConnectHub</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Install our application directly onto your home screen for an extremely fast, polished native app experience!
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 text-xs">
            <button
              onClick={handleInstallLater}
              className="px-3 py-1.5 font-medium text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
            >
              Later
            </button>
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-1.5 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
            >
              Install
            </button>
          </div>
        </div>
      )}

      {showPermissionBanner && (
        <div className="pointer-events-auto bg-white border border-blue-100 rounded-xl p-4 shadow-xl flex flex-col gap-3 animate-slide-in">
          <div className="flex items-start gap-3">
            <div className="bg-blue-600 text-white rounded-lg p-2 flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Allow ConnectHub to send notifications?</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Stay updated instantly when your orders ship, rentals are approved, or riders arrive.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 text-xs">
            <button
              onClick={handleDismissNotifications}
              className="px-3 py-1.5 font-medium text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
            >
              Not Now
            </button>
            <button
              onClick={handleAllowNotifications}
              className="px-3.5 py-1.5 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
            >
              Allow
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
