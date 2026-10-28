import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import HomeButton from '../components/HomeButton';
import { fetchUserConnections, getCurrentUser, removeFollower, unfollowUser } from '../api';
import { getStoredToken } from '../authStorage';

function ConfirmActionModal({ open, title, message, confirmLabel, loading, onClose, onConfirm }) {
  if (!open) {
    return null;
  }

  return (
    <div className="feed-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="feed-modal confirm-action-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button type="button" className="feed-modal-close" onClick={onClose}>
          x
        </button>
        <p className="eyebrow">Confirmacao</p>
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="create-post-actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button type="button" className="primary-button" onClick={onConfirm} disabled={loading}>
            {loading ? 'Atualizando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Connections() {
  const { username, kind } = useParams();
  const navigate = useNavigate();
  const token = useMemo(() => getStoredToken(), []);
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [query, setQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [pendingActionItem, setPendingActionItem] = useState(null);

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    Promise.all([getCurrentUser(token), fetchUserConnections(token, username, kind)])
      .then(([currentUser, connections]) => {
        setCurrentUsername(currentUser.username);
        setPayload(connections);
      })
      .catch((err) => setError(err.message || 'Falha ao carregar conexoes.'));
  }, [kind, navigate, token, username]);

  if (error) {
    return (
      <div className="profile-page">
        <HomeButton />
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="profile-page">
        <HomeButton />
        <p className="loading-copy">Carregando conexoes...</p>
      </div>
    );
  }

  const title = payload.kind === 'followers' ? 'Seguidores' : 'Seguindo';
  const emptyCopy =
    payload.kind === 'followers'
      ? 'Esse perfil ainda nao tem seguidores.'
      : 'Esse perfil ainda nao segue ninguem.';
  const isOwnList = currentUsername === payload.username;
  const filteredItems = payload.items.filter((item) =>
    item.username.toLowerCase().includes(query.trim().toLowerCase())
  );

  const handleAction = async (item) => {
    if (!isOwnList) {
      return;
    }
    setPendingActionItem(item);
  };

  const handleConfirmAction = async () => {
    const item = pendingActionItem;
    if (!token || !isOwnList || !item) {
      return;
    }
    const isFollowersList = payload.kind === 'followers';
    setActionLoadingId(item.id);
    setError('');
    try {
      if (isFollowersList) {
        await removeFollower(token, item.id);
      } else {
        await unfollowUser(token, item.id);
      }
      setPayload((current) =>
        current
          ? {
              ...current,
              items: current.items.filter((entry) => entry.id !== item.id),
              total: Math.max(0, (current.total || 0) - 1),
            }
          : current
      );
      setPendingActionItem(null);
    } catch (err) {
      setError(err.message || 'Falha ao atualizar conexao.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="profile-page">
      <HomeButton />
      <section className="profile-section-card connections-shell">
        <div className="profile-section-header">
          <div>
            <p className="eyebrow">Rede social</p>
            <h2>{title} de @{payload.username}</h2>
            <p>{payload.total} perfil(is) nesta lista.</p>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              navigate(currentUsername === payload.username ? '/profile' : `/users/${payload.username}`)
            }
          >
            Voltar ao perfil
          </button>
        </div>

        <div className="profile-filter-bar">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar usuario por nome"
          />
        </div>

        {!filteredItems.length ? (
          <p className="empty-inline-copy">{emptyCopy}</p>
        ) : (
          <div className="connections-list">
            {filteredItems.map((item) => (
              <article key={item.id} className="connection-row">
                <button
                  type="button"
                  className="connection-main"
                  onClick={() => navigate(`/users/${item.username}`)}
                >
                  {item.profile_image_url ? (
                    <img src={item.profile_image_url} alt={item.username} />
                  ) : (
                    <div className="feed-avatar-fallback">{item.username.slice(0, 1).toUpperCase()}</div>
                  )}
                  <div className="connection-copy">
                    <strong>@{item.username}</strong>
                    <span>{item.is_verified_critic ? 'Critico verificado' : 'Perfil Moviz'}</span>
                  </div>
                </button>
                {isOwnList ? (
                  <button
                    type="button"
                    className="secondary-button connection-action-button"
                    onClick={() => handleAction(item)}
                    disabled={actionLoadingId === item.id}
                  >
                    {actionLoadingId === item.id
                      ? 'Atualizando...'
                      : payload.kind === 'followers'
                        ? 'Remover seguidor'
                        : 'Deixar de seguir'}
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
      <ConfirmActionModal
        open={Boolean(pendingActionItem)}
        title={payload.kind === 'followers' ? 'Remover seguidor?' : 'Parar de seguir?'}
        message={
          pendingActionItem
            ? payload.kind === 'followers'
              ? `Tem certeza que deseja remover @${pendingActionItem.username} dos seus seguidores?`
              : `Tem certeza que deseja parar de seguir @${pendingActionItem.username}?`
            : ''
        }
        confirmLabel={payload.kind === 'followers' ? 'Remover seguidor' : 'Parar de seguir'}
        loading={Boolean(pendingActionItem && actionLoadingId === pendingActionItem.id)}
        onClose={() => {
          if (!actionLoadingId) {
            setPendingActionItem(null);
          }
        }}
        onConfirm={handleConfirmAction}
      />
    </div>
  );
}

export default Connections;
