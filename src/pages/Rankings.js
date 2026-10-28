import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  fetchCountryRanking,
  fetchFriendsRanking,
  fetchGlobalRanking,
  getCurrentUser,
} from '../api';
import { clearStoredToken, getStoredToken } from '../authStorage';

const TABS = [
  { id: 'global', label: '🌍 Global' },
  { id: 'country', label: '🏳️ País' },
  { id: 'friends', label: '👥 Amigos' },
];

const MEDALS = ['🥇', '🥈', '🥉'];

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function ScoreInfoModal({ onClose }) {
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => { document.documentElement.style.overflow = prev; };
  }, []);

  return (
    <div className="rnk-modal-overlay" onClick={onClose}>
      <div className="rnk-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rnk-modal-header">
          <h2 className="rnk-modal-title">Como a pontuação é calculada</h2>
          <button className="rnk-modal-close" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <div className="rnk-modal-body">
          <div className="rnk-score-row">
            <span className="rnk-score-icon">🎬</span>
            <div>
              <p className="rnk-score-label">Filmes avaliados</p>
              <p className="rnk-score-desc">Cada filme avaliado vale 3 pts</p>
            </div>
            <span className="rnk-score-pts">×3</span>
          </div>
          <div className="rnk-score-row">
            <span className="rnk-score-icon">📝</span>
            <div>
              <p className="rnk-score-label">Posts publicados</p>
              <p className="rnk-score-desc">Cada post no feed vale 2 pts</p>
            </div>
            <span className="rnk-score-pts">×2</span>
          </div>
          <div className="rnk-score-row">
            <span className="rnk-score-icon">👥</span>
            <div>
              <p className="rnk-score-label">Seguidores</p>
              <p className="rnk-score-desc">Cada seguidor vale 4 pts</p>
            </div>
            <span className="rnk-score-pts">×4</span>
          </div>
          <div className="rnk-score-row">
            <span className="rnk-score-icon">🏅</span>
            <div>
              <p className="rnk-score-label">Insígnias conquistadas</p>
              <p className="rnk-score-desc">Cada insígnia desbloqueada vale 10 pts</p>
            </div>
            <span className="rnk-score-pts">×10</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="rnk-row rnk-row--skeleton">
      <div className="rnk-pos" />
      <div className="rnk-avatar rnk-skel" />
      <div className="rnk-info">
        <div className="rnk-skel" style={{ width: '40%', height: 13, borderRadius: 6 }} />
        <div className="rnk-skel" style={{ width: '60%', height: 10, borderRadius: 6, marginTop: 5 }} />
      </div>
      <div className="rnk-skel" style={{ width: 38, height: 20, borderRadius: 10 }} />
    </div>
  );
}

export default function Rankings() {
  const navigate = useNavigate();
  const token = useMemo(() => getStoredToken(), []);

  const [tab, setTab] = useState('global');
  const [currentUser, setCurrentUser] = useState(null);
  const [data, setData] = useState({ global: null, country: null, friends: null });
  const [loading, setLoading] = useState({ global: false, country: false, friends: false });
  const [error, setError] = useState({ global: '', country: '', friends: '' });
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    if (!token) { navigate('/login', { replace: true }); return; }
    getCurrentUser(token)
      .then(setCurrentUser)
      .catch(() => { clearStoredToken(); navigate('/login', { replace: true }); });
  }, [navigate, token]);

  const loadTab = useCallback(async (tabId) => {
    if (data[tabId] !== null) return;
    setLoading((l) => ({ ...l, [tabId]: true }));
    setError((e) => ({ ...e, [tabId]: '' }));
    try {
      const fetcher = tabId === 'global' ? fetchGlobalRanking
        : tabId === 'friends' ? fetchFriendsRanking
        : fetchCountryRanking;
      const res = await fetcher(token);
      setData((d) => ({ ...d, [tabId]: res.entries || [] }));
    } catch (err) {
      setError((e) => ({ ...e, [tabId]: err.message || 'Falha ao carregar.' }));
    } finally {
      setLoading((l) => ({ ...l, [tabId]: false }));
    }
  }, [data, token]);

  useEffect(() => { if (token) loadTab(tab); }, [tab, token]); // eslint-disable-line

  const entries = data[tab] || [];
  const isLoading = loading[tab];
  const tabError = error[tab];

  const noCountry = tab === 'country' && !currentUser?.country && data.country !== null;
  const noFriends = tab === 'friends' && data.friends?.length === 0;

  return (
    <div className="rnk-page">
      {showInfo && <ScoreInfoModal onClose={() => setShowInfo(false)} />}

      {/* Header */}
      <header className="rnk-header">
        <button className="dm-back" onClick={() => navigate(-1)} aria-label="Voltar">
          <BackIcon />
        </button>
        <h1 className="rnk-title">Ranking</h1>
        <button className="rnk-info-btn" onClick={() => setShowInfo(true)} aria-label="Como funciona a pontuação">
          <InfoIcon />
        </button>
      </header>

      {/* Tab bar */}
      <div className="rnk-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`rnk-tab${tab === t.id ? ' rnk-tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Top 3 podium — only when data loaded and not empty */}
      {!isLoading && entries.length >= 3 && (
        <div className="rnk-podium">
          {[entries[1], entries[0], entries[2]].map((entry, i) => {
            const podiumPos = i === 0 ? 1 : i === 1 ? 0 : 2;
            const isCenter = podiumPos === 0;
            return (
              <button
                key={entry.user.id}
                className={`rnk-podium-item${isCenter ? ' rnk-podium-item--center' : ''}`}
                onClick={() => navigate(`/users/${entry.user.username}`)}
              >
                {entry.user.profile_image_url ? (
                  <img
                    className="rnk-podium-avatar"
                    src={entry.user.profile_image_url}
                    alt={entry.user.username}
                  />
                ) : (
                  <div className="rnk-podium-avatar rnk-podium-avatar--fallback">
                    {entry.user.username.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="rnk-podium-medal">{MEDALS[entry.rank - 1]}</span>
                <p className="rnk-podium-name">@{entry.user.username}</p>
                <p className="rnk-podium-score">{entry.score} pts</p>
              </button>
            );
          })}
        </div>
      )}

      {/* List */}
      <div className="rnk-list">
        {isLoading && [1, 2, 3, 4, 5, 6].map((i) => <SkeletonRow key={i} />)}

        {!isLoading && tabError && (
          <p className="rnk-empty">{tabError}</p>
        )}

        {!isLoading && !tabError && noCountry && (
          <div className="rnk-empty-block">
            <p>🌐</p>
            <p>Você ainda não definiu seu país no perfil.</p>
            <button className="rnk-cta" onClick={() => navigate('/profile', { state: { editCountry: true } })}>
              Definir meu país
            </button>
          </div>
        )}

        {!isLoading && !tabError && noFriends && (
          <div className="rnk-empty-block">
            <p>👥</p>
            <p>Siga outras pessoas para ver o ranking de amigos.</p>
            <button className="rnk-cta" onClick={() => navigate('/explore')}>
              Explorar usuários
            </button>
          </div>
        )}

        {!isLoading && !tabError && entries.slice(entries.length >= 3 ? 3 : 0).map((entry) => (
          <button
            key={entry.user.id}
            className="rnk-row"
            onClick={() => navigate(`/users/${entry.user.username}`)}
          >
            <span className="rnk-pos">#{entry.rank}</span>
            {entry.user.profile_image_url ? (
              <img className="rnk-avatar" src={entry.user.profile_image_url} alt={entry.user.username} />
            ) : (
              <div className="rnk-avatar rnk-avatar--fallback">
                {entry.user.username.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="rnk-info">
              <p className="rnk-name">@{entry.user.username}</p>
              <p className="rnk-stats">
                {entry.rated_count} filmes · {entry.post_count} posts · {entry.follower_count} seguidores
              </p>
            </div>
            <span className="rnk-score">{entry.score}<small>pts</small></span>
          </button>
        ))}
      </div>
    </div>
  );
}
