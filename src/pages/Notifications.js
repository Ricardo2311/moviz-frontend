import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api';
import { getStoredToken } from '../authStorage';

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

const FILTERS = [
  { id: 'all',      label: 'Todas' },
  { id: 'likes',    label: '❤️ Curtidas' },
  { id: 'followers',label: '👤 Seguidores' },
  { id: 'comments', label: '💬 Comentários' },
  { id: 'mentions', label: '@ Menções' },
  { id: 'clubs',    label: '🎬 Clubes' },
];

const TYPE_MAP = {
  likes:     ['post_like'],
  followers: ['new_follower', 'follow_request', 'follow_request_approved', 'follow_request_rejected'],
  comments:  ['post_comment', 'comment_reply'],
  mentions:  ['post_mention', 'comment_mention', 'club_post_mention'],
  clubs:     ['club_join_request', 'club_request_approved', 'club_request_rejected', 'club_new_post', 'club_post_report'],
};

function typeIcon(type) {
  if (type === 'post_like') return '❤️';
  if (type === 'new_follower' || type === 'follow_request') return '👤';
  if (type === 'follow_request_approved' || type === 'follow_request_rejected') return '✅';
  if (type === 'post_comment' || type === 'comment_reply') return '💬';
  if (type.includes('mention')) return '@';
  if (type.includes('club')) return '🎬';
  if (type === 'direct_message') return '✉️';
  if (type === 'following_post') return '📝';
  return '🔔';
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default function Notifications() {
  const navigate = useNavigate();
  const token = useMemo(() => getStoredToken(), []);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (!token) { navigate('/login', { replace: true }); return; }
    setLoading(true);
    fetchNotifications(token)
      .then((data) => setNotifications(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, navigate]);

  const visible = useMemo(() => {
    if (filter === 'all') return notifications;
    const types = TYPE_MAP[filter] || [];
    return notifications.filter((n) => types.includes(n.notification_type));
  }, [notifications, filter]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const handleMarkAll = useCallback(async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead(token);
      setNotifications([]);
    } catch {}
    finally { setMarkingAll(false); }
  }, [token, markingAll, unreadCount]);

  const handleTap = useCallback(async (n) => {
    if (!n.is_read) {
      markNotificationRead(token, n.id).catch(() => {});
      setNotifications((prev) => prev.filter((x) => x.id !== n.id));
    }
    // Navigate to relevant content
    if (n.post_id) { navigate(`/feed?post=${n.post_id}`); return; }
    if (n.club_id) { navigate(`/clubs/${n.club_id}`); return; }
    if (n.conversation_id) { navigate(`/direct?conversation=${n.conversation_id}`); return; }
    if (n.actor?.username) { navigate(`/users/${n.actor.username}`); return; }
  }, [token, navigate]);

  return (
    <div className="ntf-page">
      {/* Header */}
      <header className="ntf-header">
        <button className="dm-back" onClick={() => navigate(-1)} aria-label="Voltar">
          <BackIcon />
        </button>
        <h1 className="ntf-title">Notificações</h1>
        {unreadCount > 0 && (
          <button
            className="ntf-mark-all"
            onClick={handleMarkAll}
            disabled={markingAll}
          >
            Marcar todas
          </button>
        )}
      </header>

      {/* Filter tabs */}
      <div className="ntf-filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`ntf-filter${filter === f.id ? ' ntf-filter--active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="ntf-list">
        {loading && [1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="ntf-row ntf-row--skeleton">
            <div className="ntf-skel ntf-icon-skel" />
            <div className="ntf-skel ntf-avatar-skel" />
            <div className="ntf-row-body">
              <div className="ntf-skel" style={{ width: '70%', height: 13, borderRadius: 6 }} />
              <div className="ntf-skel" style={{ width: '40%', height: 10, borderRadius: 6, marginTop: 5 }} />
            </div>
          </div>
        ))}

        {!loading && visible.length === 0 && (
          <div className="ntf-empty">
            <span>🔔</span>
            <p>{filter === 'all' ? 'Nenhuma notificação ainda.' : 'Nenhuma notificação nessa categoria.'}</p>
          </div>
        )}

        {!loading && visible.map((n) => (
          <button
            key={n.id}
            className={`ntf-row${n.is_read ? '' : ' ntf-row--unread'}`}
            onClick={() => handleTap(n)}
          >
            <span className="ntf-type-icon">{typeIcon(n.notification_type)}</span>
            {n.actor?.profile_image_url ? (
              <img className="ntf-avatar" src={n.actor.profile_image_url} alt={n.actor.username} />
            ) : (
              <div className="ntf-avatar ntf-avatar--fallback">
                {n.actor?.username?.slice(0, 1).toUpperCase() || '?'}
              </div>
            )}
            <div className="ntf-row-body">
              <p className="ntf-msg">{n.message}</p>
              <p className="ntf-time">{timeAgo(n.created_at)}</p>
            </div>
            {!n.is_read && <span className="ntf-dot" />}
          </button>
        ))}
      </div>
    </div>
  );
}
