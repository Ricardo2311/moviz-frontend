import { useCallback, useEffect, useRef, useState } from 'react';
import React from 'react';
import { Capacitor } from '@capacitor/core';

const THRESHOLD = 80; // px of vertical drag before triggering refresh

export function usePullToRefresh(onRefresh) {
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef(null);
  const startXRef = useRef(null);
  const refreshingRef = useRef(false);

  const trigger = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    try {
      // Light haptic on trigger
      if (Capacitor.isNativePlatform()) {
        import('@capacitor/haptics')
          .then(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Light }))
          .catch(() => {});
      }
      await onRefresh();
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const onStart = (e) => {
      // Only start if scrolled to the top of the page
      const scrollTop =
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        window.scrollY ||
        0;
      if (scrollTop > 4) return;
      startYRef.current = e.touches[0].clientY;
      startXRef.current = e.touches[0].clientX;
    };

    const onMove = (e) => {
      if (startYRef.current === null || refreshingRef.current) return;
      const dy = e.touches[0].clientY - startYRef.current;
      const dx = e.touches[0].clientX - startXRef.current;
      // Abort if this is predominantly a horizontal swipe (e.g. carousel)
      if (Math.abs(dx) > Math.abs(dy) * 1.5) {
        startYRef.current = null;
        return;
      }
      if (dy >= THRESHOLD) {
        startYRef.current = null;
        trigger();
      }
    };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
    };
  }, [trigger]);

  return refreshing;
}

export function PullRefreshIndicator({ refreshing }) {
  if (!refreshing) return null;
  return React.createElement(
    'div',
    { className: 'pull-refresh-indicator', 'aria-live': 'polite', 'aria-label': 'Atualizando' },
    React.createElement('div', { className: 'pull-refresh-spinner' })
  );
}
