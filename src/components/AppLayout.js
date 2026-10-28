import React, { useCallback, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import BottomNav from './BottomNav';
import NotificationToast from './NotificationToast';
import { usePushNotifications } from '../hooks/usePushNotifications';

function AppLayout() {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [, setUnreadCount] = useState(0);

  const handleToast = useCallback((notif) => setToast(notif), []);
  const handleDismiss = useCallback(() => setToast(null), []);

  usePushNotifications({ onToast: handleToast, setUnreadCount, navigate });

  return (
    <>
      <Outlet />
      <NotificationToast toast={toast} onDismiss={handleDismiss} />
      <BottomNav />
    </>
  );
}

export default AppLayout;
