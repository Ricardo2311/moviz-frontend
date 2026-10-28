import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import MovieDetailsModal from '../components/MovieDetailsModal';
import { usePullToRefresh, PullRefreshIndicator } from '../hooks/usePullToRefresh';
import { fetchMovieDetails, fetchMovies, fetchNotificationCount, getCurrentUser } from '../api';
import { clearStoredToken, getStoredToken } from '../authStorage';
import { apiCache } from '../apiCache';

function ScrollRail({ title, movies, onMovieClick, seeMorePath, onSeeMore, navigate }) {
  return (
    <section className="home-rail">
      <div className="home-rail-header">
        <h2 className="home-rail-title">{title}</h2>
        {(seeMorePath || onSeeMore) && (
          <button
            type="button"
            className="home-rail-see-more"
            onClick={() => onSeeMore ? onSeeMore() : navigate(seeMorePath)}
          >
            Ver todos
          </button>
        )}
      </div>
      <div className="home-rail-track">
        {movies.map((movie) => (
          <article key={movie.id} className="home-rail-card">
            <button
              type="button"
              className="home-rail-poster-btn"
              onClick={() => onMovieClick(movie)}
              aria-label={movie.title}
            >
              {movie.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w300${movie.poster_path}`}
                  alt={movie.title}
                  className="home-rail-img"
                />
              ) : (
                <div className="home-rail-no-poster">{movie.title}</div>
              )}
              <div className="home-rail-overlay">
                <span className="home-rail-score">
                  ★ {(Number(movie.vote_average || 0) / 2).toFixed(1)}
                </span>
              </div>
            </button>
            <p className="home-rail-name">{movie.title}</p>
            <p className="home-rail-year">
              {movie.release_date ? movie.release_date.slice(0, 4) : '—'}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Home() {
  // Initialize from cache for instant render on revisit
  const _cachedMovies   = apiCache.get('home-movies');
  const _cachedUsername = apiCache.get('home-username');

  const [movies, setMovies]     = useState(_cachedMovies ?? []);
  const [error, setError]       = useState(null);
  const [username, setUsername] = useState(_cachedUsername ?? '');
  const [message, setMessage]   = useState('');
  const [selectedMovie, setSelectedMovie]           = useState(null);
  const [selectedMovieDetails, setSelectedMovieDetails] = useState(null);
  const [detailsLoading, setDetailsLoading]         = useState(false);
  const [detailsError, setDetailsError]             = useState(null);
  const [unreadCount, setUnreadCount]               = useState(0);
  const navigate = useNavigate();

  const loadData = useCallback(async (force = false) => {
    const token = getStoredToken();
    if (!token) { navigate('/login', { replace: true }); return; }

    if (!force && !apiCache.isStale('home-movies') && !apiCache.isStale('home-username')) {
      fetchNotificationCount(token).then((d) => setUnreadCount(d.count || 0)).catch(() => {});
      return;
    }

    try {
      const [user, payload, notifData] = await Promise.all([
        getCurrentUser(token),
        fetchMovies(token),
        fetchNotificationCount(token).catch(() => ({ count: 0 })),
      ]);
      apiCache.set('home-username', user.username);
      apiCache.set('home-movies',   payload.results || []);
      setUsername(user.username);
      setMovies(payload.results || []);
      setUnreadCount(notifData.count || 0);
    } catch (err) {
      if (/session|credential|authenticated/i.test(err.message)) {
        clearStoredToken();
        navigate('/login', { replace: true });
        return;
      }
      setError(err.message);
    }
  }, [navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = useCallback(async () => {
    apiCache.expire('home-movies');
    apiCache.expire('home-username');
    await loadData(true);
  }, [loadData]);

  const refreshing = usePullToRefresh(handleRefresh);

  const handleMovieClick = async (movie) => {
    const token = getStoredToken();
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    setSelectedMovie(movie);
    setSelectedMovieDetails(null);
    setDetailsError(null);
    setDetailsLoading(true);

    try {
      const details = await fetchMovieDetails(token, movie.id);
      setSelectedMovieDetails(details);
    } catch (err) {
      setDetailsError(err.message || 'Falha ao carregar detalhes do filme.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const topRatedMovies = [...movies]
    .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
    .slice(0, 15);

  const recentMovies = [...movies]
    .sort((a, b) =>
      String(b.release_date || '').localeCompare(String(a.release_date || ''))
    )
    .slice(0, 15);

  const forYouMovies = movies.slice(0, 15);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  const handleChatSubmit = (e) => {
    e.preventDefault();
    navigate('/chat', { state: { prompt: message } });
  };

  return (
    <div className="home-page">
      <PullRefreshIndicator refreshing={refreshing} />
      {/* ── Sticky greeting header ────────────────────────────────────────── */}
      <header className="home-header-bar">
        <div className="home-greeting">
          <p className="home-greeting-sub">{greeting},</p>
          <h1 className="home-greeting-name">@{username || '...'}</h1>
        </div>
        <div className="home-header-icons">
          <button
            type="button"
            className="home-icon-btn home-icon-btn--bell"
            onClick={() => navigate('/notifications')}
            aria-label="Notificações"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="home-bell-badge">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            className="home-icon-btn"
            onClick={() => navigate('/direct')}
            aria-label="Mensagens"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="20"
              height="20"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <button
            type="button"
            className="home-icon-btn"
            onClick={() => navigate('/clubs')}
            aria-label="Clubes"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="20"
              height="20"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Quick action chips ────────────────────────────────────────────── */}
      <div className="home-quick-actions" role="toolbar" aria-label="Ações rápidas">
        <button
          type="button"
          className="home-quick-chip home-quick-chip--brand"
          onClick={() => navigate('/posts/new')}
        >
          <span aria-hidden="true">+</span> Post
        </button>
        <button
          type="button"
          className="home-quick-chip"
          onClick={() => navigate('/rankings')}
        >
          Rankings
        </button>
        <button
          type="button"
          className="home-quick-chip"
          onClick={() => navigate('/recommendations')}
        >
          Recomendações
        </button>
      </div>

      {error ? (
        <p className="error" style={{ padding: '4px 18px' }}>
          {error}
        </p>
      ) : null}

      {/* ── Movie rails ───────────────────────────────────────────────────── */}
      {movies.length ? (
        <>
          <ScrollRail
            title="Mais Bem Avaliados"
            movies={topRatedMovies}
            onMovieClick={handleMovieClick}
            seeMorePath="/browse/top_rated"
            navigate={navigate}
          />
          <ScrollRail
            title="Lançamentos Recentes"
            movies={recentMovies}
            onMovieClick={handleMovieClick}
            seeMorePath="/browse/recent"
            navigate={navigate}
          />
          <ScrollRail
            title="Para Você"
            movies={forYouMovies}
            onMovieClick={handleMovieClick}
            onSeeMore={() => navigate('/browse/rec', { state: { title: 'Para Você', movies: forYouMovies } })}
            navigate={navigate}
          />
        </>
      ) : !error ? (
        <div className="home-skeleton-wrap">
          {[1, 2, 3].map((r) => (
            <div key={r} className="home-rail">
              <div className="home-rail-header">
                <div className="home-skeleton-line" style={{ width: 140 }} />
              </div>
              <div className="home-rail-track">
                {[1, 2, 3, 4, 5].map((c) => (
                  <div key={c} className="home-rail-card">
                    <div className="home-skeleton-poster" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* ── AI chat strip ─────────────────────────────────────────────────── */}
      <section className="home-ai-strip" aria-label="Assistente Cinebot">
        <span className="home-ai-icon" aria-hidden="true">🎬</span>
        <form className="home-ai-form" onSubmit={handleChatSubmit}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Pedir sugestão ao Cinebot..."
            className="home-ai-input"
            aria-label="Mensagem para o Cinebot"
          />
          <button
            type="submit"
            className="home-ai-send"
            aria-label="Enviar"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="16"
              height="16"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </section>

      <MovieDetailsModal
        details={selectedMovieDetails || selectedMovie}
        loading={detailsLoading}
        error={detailsError}
        onOpenMovie={handleMovieClick}
        onClose={() => {
          setSelectedMovie(null);
          setSelectedMovieDetails(null);
          setDetailsError(null);
          setDetailsLoading(false);
        }}
      />
    </div>
  );
}

export default Home;
