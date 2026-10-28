import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * In-app notification banner.
 * Appears at the top of the screen when a new notification arrives
 * while the user is inside the app.
 *
 * Props:
 *   toast   — { id, message, count } | null
 *   onDismiss — () => void
 */
export default function NotificationToast({ toast, onDismiss }) {
  const navigate  = useNavigate();
  const timerRef  = useRef(null);

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    if (!toast) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timerRef.current);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const handleClick = () => {
    onDismiss();
    navigate('/notifications');
  };

  return (
    <div className="notif-toast" onClick={handleClick} role="alert" aria-live="polite">
      <span className="notif-toast-bell" aria-hidden="true">🔔</span>
      <span className="notif-toast-msg">{toast.message}</span>
      <button
        className="notif-toast-close"
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        aria-label="Fechar"
      >
        ✕
      </button>
    </div>
  );
}
