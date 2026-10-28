/**
 * usePushNotifications
 *
 * Native (Android): registers for real FCM push via @capacitor/push-notifications,
 * stores the device token in the backend, and routes foreground + tap events.
 *
 * Web / dev: polls the backend every 30 s as a fallback.
 */
import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { fetchNotificationCount } from '../api';
import { getStoredToken } from '../authStorage';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const POLL_INTERVAL_MS = 30_000;

async function registerTokenWithBackend(fcmToken) {
  const authToken = getStoredToken();
  if (!authToken || !fcmToken) return;
  try {
    await fetch(`${API_BASE}/api/devices/register`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ token: fcmToken, platform: 'android' }).toString(),
    });
  } catch {
    // Silent — token will be re-registered on next app open
  }
}

export function usePushNotifications({ onToast, setUnreadCount, navigate }) {
  const prevCountRef = useRef(null);

  useEffect(() => {
    // ── Native: real FCM ────────────────────────────────────────────────────
    if (Capacitor.isNativePlatform()) {
      let removeListeners = () => {};

      import('@capacitor/push-notifications')
        .then(({ PushNotifications }) => {
          const handles = [];

          // Request permission and register for push
          PushNotifications.checkPermissions()
            .then(async (status) => {
              let perm = status;
              if (perm.receive === 'prompt') {
                perm = await PushNotifications.requestPermissions();
              }
              if (perm.receive !== 'granted') return;
              await PushNotifications.register();
            })
            .catch(() => {});

          // Token obtained → send to backend
          PushNotifications.addListener('registration', (tokenData) => {
            registerTokenWithBackend(tokenData.value);
          }).then((h) => handles.push(h));

          PushNotifications.addListener('registrationError', (err) => {
            if (process.env.NODE_ENV !== 'production') {
              console.error('FCM registration error:', err.error);
            }
          }).then((h) => handles.push(h));

          // Foreground notification → in-app toast + refresh badge
          PushNotifications.addListener('pushNotificationReceived', (notification) => {
            onToast({
              id: Date.now(),
              message: notification.body || notification.title || 'Nova notificação',
              count: 1,
            });
            const authToken = getStoredToken();
            if (authToken) {
              fetchNotificationCount(authToken)
                .then((d) => setUnreadCount(d.count || 0))
                .catch(() => {});
            }
          }).then((h) => handles.push(h));

          // Notification tap (background/killed) → go to notifications screen
          PushNotifications.addListener('pushNotificationActionPerformed', () => {
            navigate?.('/notifications');
          }).then((h) => handles.push(h));

          removeListeners = () => handles.forEach((h) => h?.remove?.());
        })
        .catch(() => {});

      return () => removeListeners();
    }

    // ── Web / dev: polling fallback ─────────────────────────────────────────
    let timerId;

    async function check() {
      const token = getStoredToken();
      if (!token) return;
      try {
        const data = await fetchNotificationCount(token);
        const count = data?.count ?? 0;
        setUnreadCount(count);
        if (prevCountRef.current !== null && count > prevCountRef.current) {
          const diff = count - prevCountRef.current;
          onToast({
            id: Date.now(),
            message:
              diff === 1
                ? 'Você tem uma nova notificação'
                : `Você tem ${diff} novas notificações`,
            count,
          });
        }
        prevCountRef.current = count;
      } catch {
        // Silent — network may be offline
      }
    }

    check();
    timerId = window.setInterval(check, POLL_INTERVAL_MS);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(timerId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
