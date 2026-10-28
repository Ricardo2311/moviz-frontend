import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePullToRefresh, PullRefreshIndicator } from '../hooks/usePullToRefresh';
import { useNavigate } from 'react-router-dom';


import HomeButton from '../components/HomeButton';
import MovieDetailsModal from '../components/MovieDetailsModal';
import { fetchMovieDetails, fetchRecommendationRows } from '../api';
import { clearStoredToken, getStoredToken } from '../authStorage';

/* ── match-score badge colour ─────────────────────────────────────────────── */
function matchColour(score) {
  if (score == null) return null;
  if (score >= 80) return 'match-high';
  if (score >= 65) return 'match-mid';
  return 'match-low';
}

/* ── skeleton card for loading state ─────────────────────────────────────── */
function SkeletonCard() {
  return <div className="rec-card rec-card--skeleton" aria-hidden="true" />;
}

/* ── single movie card ────────────────────────────────────────────────────── */
function MovieCard({ movie, onOpen }) {
  return (
    <article className="rec-card" onClick={() => onOpen(movie)}>
      <div className="rec-card__poster-wrap">
        {movie.poster_path ? (
          <img
            src={`https://image.tmdb.org/t/p/w300${movie.poster_path}`}
            alt={movie.title}
            className="rec-card__poster"
            loading="lazy"
          />
        ) : (
          <div className="rec-card__no-poster">{movie.title}</div>
        )}

        {movie.match_score != null && (
          <span className={`rec-card__match ${matchColour(movie.match_score)}`}>
            {movie.match_score}% match
          </span>
        )}
      </div>

      <div className="rec-card__info">
        <p className="rec-card__title">{movie.title}</p>

        {movie.reason_tags && movie.reason_tags.length > 0 && (
          <div className="rec-card__tags">
            {movie.reason_tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rec-card__tag">{tag}</span>
            ))}
          </div>
        )}

        {movie.vote_average != null && (
          <p className="rec-card__vote">
            <span className="rec-card__star">★</span>
            {(Number(movie.vote_average) / 2).toFixed(1)}
          </p>
        )}
      </div>
    </article>
  );
}

/* ── horizontal scrolling row ─────────────────────────────────────────────── */
function RecommendationRow({ row, onOpen, onSeeAll }) {
  const trackRef = useRef(null);

  const scroll = useCallback((dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 640, behavior: 'smooth' });
  }, []);

  return (
    <section className={`rec-row${row.is_sponsored ? ' rec-row--sponsored' : ''}`}>
      <div className="rec-row__header">
        <div className="rec-row__title-group">
          <h2 className="rec-row__title">{row.title}</h2>
          {row.is_sponsored && (
            <span className="rec-row__sponsored-badge">Patrocinado</span>
          )}
        </div>
        <div className="rec-row__nav">
          {!row.is_sponsored && (
            <button
              className="home-rail-see-more"
              onClick={() => onSeeAll(row)}
              aria-label="Ver todos"
            >Ver todos</button>
          )}
          <button
            className="rec-row__arrow"
            onClick={() => scroll(-1)}
            aria-label="Rolar para esquerda"
          >‹</button>
          <button
            className="rec-row__arrow"
            onClick={() => scroll(1)}
            aria-label="Rolar para direita"
          >›</button>
        </div>
      </div>

      <div className="rec-row__track" ref={trackRef}>
        {row.movies.map((movie) => (
          <MovieCard key={movie.movie_id} movie={movie} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

/* ── skeleton row ─────────────────────────────────────────────────────────── */
function SkeletonRow({ title }) {
  return (
    <section className="rec-row">
      <div className="rec-row__header">
        <div className="rec-row__title rec-skeleton-text" style={{ width: 220 }} />
      </div>
      <div className="rec-row__track">
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </section>
  );
}

/* ── page ─────────────────────────────────────────────────────────────────── */
export default function Recommendations() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [movieDetails, setMovieDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const navigate = useNavigate();

  const loadRows = useCallback(async () => {
    const token = getStoredToken();
    if (!token) { navigate('/login', { replace: true }); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRecommendationRows(token);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      if (/session|credential|authenticated/i.test(err.message)) {
        clearStoredToken();
        navigate('/login', { replace: true });
        return;
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { loadRows(); }, [loadRows]);

  const refreshing = usePullToRefresh(loadRows);

  const handleOpen = useCallback(async (movie) => {
    const token = getStoredToken();
    if (!token) { navigate('/login', { replace: true }); return; }
    setSelectedMovie(movie);
    setMovieDetails(null);
    setDetailsError(null);
    setDetailsLoading(true);
    try {
      const details = await fetchMovieDetails(token, movie.movie_id ?? movie.id);
      setMovieDetails(details);
    } catch (err) {
      setDetailsError(err.message || 'Falha ao carregar detalhes.');
    } finally {
      setDetailsLoading(false);
    }
  }, [navigate]);

  const handleClose = useCallback(() => {
    setSelectedMovie(null);
    setMovieDetails(null);
    setDetailsError(null);
  }, []);

  const handleSeeAll = useCallback((row) => {
    navigate('/browse/rec', { state: { title: row.title, movies: row.movies } });
  }, [navigate]);

  return (
    <div className="recommendations-page">
      <PullRefreshIndicator refreshing={refreshing} />
      <HomeButton />

      <header className="rec-page-header">
        <button
          type="button"
          className="browse-back-btn"
          onClick={() => navigate(-1)}
          aria-label="Voltar"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="rec-page-title">Para voce</h1>
        <p className="rec-page-sub">
          Curado com base nas suas avaliacoes, generos favoritos e tendencias da comunidade.
        </p>
      </header>

      {error && <p className="error" style={{ margin: '2rem' }}>{error}</p>}

      {loading ? (
        <>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </>
      ) : rows.length === 0 ? (
        <div className="empty-filter-state" style={{ marginTop: '4rem' }}>
          <h2>Nenhuma recomendacao ainda.</h2>
          <p>Avalie alguns filmes para personalizarmos suas sugestoes.</p>
        </div>
      ) : (
        rows.map((row) =>
          row.movies.length > 0 ? (
            <RecommendationRow key={row.row_id} row={row} onOpen={handleOpen} onSeeAll={handleSeeAll} />
          ) : null
        )
      )}

      <MovieDetailsModal
        details={movieDetails || selectedMovie}
        loading={detailsLoading}
        error={detailsError}
        onOpenMovie={handleOpen}
        onClose={handleClose}
      />
    </div>
  );
}
