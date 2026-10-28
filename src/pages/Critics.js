import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import HomeButton from '../components/HomeButton';
import { fetchCritics, fetchCriticReviews } from '../api';
import { getStoredToken } from '../authStorage';

const anonymousAvatar = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
    <rect width="160" height="160" rx="36" fill="#eadfce"/>
    <circle cx="80" cy="62" r="28" fill="#c3b39c"/>
    <path d="M38 132c8-24 26-36 42-36s34 12 42 36" fill="#c3b39c"/>
  </svg>
`)}`;

function CriticReviewsPanel({ username, onClose }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = getStoredToken();
    if (!token || !username) return;

    setLoading(true);
    setError(null);
    fetchCriticReviews(token, username, null, 8)
      .then((data) => {
        setReviews(data.items || []);
        setCursor(data.next_cursor || null);
        setHasMore(!!data.next_cursor);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [username]);

  function loadMore() {
    const token = getStoredToken();
    if (!token || !cursor) return;

    fetchCriticReviews(token, username, cursor, 8)
      .then((data) => {
        setReviews((prev) => [...prev, ...(data.items || [])]);
        setCursor(data.next_cursor || null);
        setHasMore(!!data.next_cursor);
      })
      .catch(() => {});
  }

  return (
    <div className="feed-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="feed-modal critics-reviews-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button type="button" className="feed-modal-close" onClick={onClose}>
          x
        </button>
        <p className="eyebrow">Critico verificado</p>
        <h2>Reviews de @{username}</h2>

        {loading ? <p className="loading-copy">Carregando reviews...</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {!loading && !error && !reviews.length ? (
          <p className="helper-copy">Este critico ainda nao publicou reviews.</p>
        ) : null}

        <div className="critics-reviews-list">
          {reviews.map((post) => (
            <article key={post.id} className="critics-review-card">
              {post.movie_poster_path ? (
                <img
                  className="critics-review-poster"
                  src={`https://image.tmdb.org/t/p/w200${post.movie_poster_path}`}
                  alt={post.movie_title}
                />
              ) : null}
              <div className="critics-review-body">
                {post.movie_title ? (
                  <strong className="critics-review-movie">{post.movie_title}</strong>
                ) : null}
                {post.review_headline ? (
                  <h4 className="critics-review-headline">{post.review_headline}</h4>
                ) : null}
                {typeof post.rating === 'number' ? (
                  <span className="critics-review-rating">{post.rating.toFixed(1)} / 5</span>
                ) : null}
                {post.text_content ? (
                  <p className="critics-review-text">{post.text_content}</p>
                ) : null}
                <div className="critics-review-flags">
                  {post.contains_spoiler ? <span className="spoiler-flag">Spoiler</span> : null}
                  {post.would_watch_again === true ? <span className="filter-chip">Assistiria de novo</span> : null}
                  {post.would_watch_again === false ? <span className="filter-chip">Nao assistiria de novo</span> : null}
                </div>
              </div>
            </article>
          ))}
        </div>

        {hasMore ? (
          <button type="button" className="secondary-button critics-load-more" onClick={loadMore}>
            Carregar mais
          </button>
        ) : null}

        <button
          type="button"
          className="primary-button critics-view-profile"
          onClick={() => {
            onClose();
            navigate(`/users/${username}`);
          }}
        >
          Ver perfil completo
        </button>
      </div>
    </div>
  );
}

function Critics() {
  const [critics, setCritics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCritic, setSelectedCritic] = useState(null);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    fetchCritics(token)
      .then((data) => setCritics(data.critics || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [navigate]);

  const filtered = critics.filter((c) =>
    c.username.toLowerCase().includes(query.toLowerCase()) ||
    (c.bio || '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="page-shell">
      <HomeButton />

      <div className="critics-page">
        <header className="critics-page-header">
          <p className="eyebrow">Comunidade Moviz</p>
          <h1>Criticos verificados</h1>
          <p className="critics-page-subtitle">
            Vozes com credencial. Reviews com mais profundidade e contexto.
          </p>
        </header>

        <div className="critics-search-bar">
          <input
            type="text"
            placeholder="Buscar critico por nome ou especialidade..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {loading ? <p className="loading-copy">Carregando criticos...</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {!loading && !error && !filtered.length ? (
          <p className="helper-copy">Nenhum critico encontrado.</p>
        ) : null}

        <div className="critics-grid">
          {filtered.map((critic) => (
            <article key={critic.id} className="critic-card">
              <button
                type="button"
                className="critic-card-avatar-btn"
                onClick={() => navigate(`/users/${critic.username}`)}
                aria-label={`Ver perfil de @${critic.username}`}
              >
                <img
                  className="critic-card-avatar"
                  src={critic.profile_image_url || anonymousAvatar}
                  alt={critic.username}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = anonymousAvatar;
                  }}
                />
              </button>

              <div className="critic-card-body">
                <div className="critic-card-name-row">
                  <button
                    type="button"
                    className="critic-card-username"
                    onClick={() => navigate(`/users/${critic.username}`)}
                  >
                    @{critic.username}
                  </button>
                  <span className="critic-badge critic-badge-inline">Critico verificado</span>
                </div>

                {critic.bio ? (
                  <p className="critic-card-bio">{critic.bio}</p>
                ) : null}

                <div className="critic-card-stats">
                  <span>{critic.review_count} reviews</span>
                  <span>{critic.follower_count} seguidores</span>
                </div>

                <div className="critic-card-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setSelectedCritic(critic.username)}
                  >
                    Ver reviews
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => navigate(`/users/${critic.username}`)}
                  >
                    Perfil
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {selectedCritic ? (
        <CriticReviewsPanel
          username={selectedCritic}
          onClose={() => setSelectedCritic(null)}
        />
      ) : null}
    </div>
  );
}

export default Critics;
