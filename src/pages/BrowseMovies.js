import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import MovieDetailsModal from '../components/MovieDetailsModal';
import { fetchBrowseMovies, fetchMovieDetails, fetchMovieGenres } from '../api';
import { clearStoredToken, getStoredToken } from '../authStorage';

const SECTION_LABELS = {
  top_rated: 'Mais Bem Avaliados',
  recent: 'Lançamentos Recentes',
};

function ArrowUp() {
  return (
    <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" width="10" height="10" style={{ marginLeft: 4 }}>
      <polyline points="2 7 5 3 8 7" />
    </svg>
  );
}

function ArrowDown() {
  return (
    <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" width="10" height="10" style={{ marginLeft: 4 }}>
      <polyline points="2 3 5 7 8 3" />
    </svg>
  );
}

export default function BrowseMovies() {
  const { section } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Pre-loaded movies passed via navigation state (e.g. from Recommendations page)
  const preloaded = location.state?.movies || null;
  const preloadedTitle = location.state?.title || null;

  const [movies, setMovies] = useState(preloaded || []);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(!preloaded);
  const [error, setError] = useState(null);
  const [selectedGenres, setSelectedGenres] = useState(new Set());
  const [sortField, setSortField] = useState('rating');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [movieDetails, setMovieDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  useEffect(() => {
    if (preloaded) {
      // Build genre list from genre name strings on the movies themselves
      const nameSet = new Set(preloaded.flatMap((m) => m.genres || []));
      setGenres([...nameSet].sort().map((name) => ({ id: name, name })));
      return;
    }

    const token = getStoredToken();
    if (!token) { navigate('/login', { replace: true }); return; }

    setLoading(true);
    setSelectedGenres(new Set());
    setSortField(section === 'recent' ? 'date' : 'rating');
    setSortDir('desc');

    Promise.all([fetchBrowseMovies(token, section), fetchMovieGenres(token)])
      .then(([data, genreList]) => {
        setMovies(data.results || []);
        setGenres(genreList || []);
      })
      .catch((err) => {
        if (/session|credential|authenticated/i.test(err.message)) {
          clearStoredToken();
          navigate('/login', { replace: true });
          return;
        }
        setError(err.message);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const handleSortClick = useCallback((field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }, [sortField]);

  const toggleGenre = useCallback((id) => {
    setSelectedGenres((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // Genre chips only show genres that exist in the current movie list
  const availableGenres = useMemo(() => {
    if (preloaded) return genres; // already built from movie data
    const ids = new Set(movies.flatMap((m) => m.genre_ids || []));
    return genres.filter((g) => ids.has(g.id));
  }, [preloaded, movies, genres]);

  const filteredMovies = useMemo(() => {
    let list = [...movies];

    if (selectedGenres.size > 0) {
      list = list.filter((m) => {
        // Recommendation movies: genres is array of strings; id===name
        if (m.genres) return m.genres.some((g) => selectedGenres.has(g));
        // Browse movies: genre_ids is array of ints
        return (m.genre_ids || []).some((g) => selectedGenres.has(g));
      });
    }

    list.sort((a, b) => {
      if (sortField === 'rating') {
        const diff = (b.vote_average || 0) - (a.vote_average || 0);
        return sortDir === 'desc' ? diff : -diff;
      } else {
        const diff = String(b.release_date || '').localeCompare(String(a.release_date || ''));
        return sortDir === 'desc' ? diff : -diff;
      }
    });
    return list;
  }, [movies, selectedGenres, sortField, sortDir, preloaded]);

  const handleOpenMovie = useCallback(async (movie) => {
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
      setDetailsError(err.message);
    } finally {
      setDetailsLoading(false);
    }
  }, [navigate]);

  const handleCloseMovie = useCallback(() => {
    setSelectedMovie(null);
    setMovieDetails(null);
    setDetailsError(null);
  }, []);

  const title = preloadedTitle || SECTION_LABELS[section] || 'Filmes';

  return (
    <div className="browse-page">
      <header className="browse-header">
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
        <h1 className="browse-title">{title}</h1>
      </header>

      <div className="browse-filters">
        <div className="browse-filter-row">
          <button
            type="button"
            className={`browse-chip${sortField === 'rating' ? ' browse-chip--active' : ''}`}
            onClick={() => handleSortClick('rating')}
          >
            ★ Nota {sortField === 'rating' && (sortDir === 'desc' ? <ArrowDown /> : <ArrowUp />)}
          </button>
          <button
            type="button"
            className={`browse-chip${sortField === 'date' ? ' browse-chip--active' : ''}`}
            onClick={() => handleSortClick('date')}
          >
            Data {sortField === 'date' && (sortDir === 'desc' ? <ArrowDown /> : <ArrowUp />)}
          </button>
        </div>

        {availableGenres.length > 0 && (
          <div className="browse-filter-row">
            <button
              type="button"
              className={`browse-chip${selectedGenres.size === 0 ? ' browse-chip--active' : ''}`}
              onClick={() => setSelectedGenres(new Set())}
            >
              Todos
            </button>
            {availableGenres.map((g) => (
              <button
                key={g.id}
                type="button"
                className={`browse-chip${selectedGenres.has(g.id) ? ' browse-chip--active' : ''}`}
                onClick={() => toggleGenre(g.id)}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="browse-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="home-skeleton-poster" />
          ))}
        </div>
      ) : error ? (
        <p className="error" style={{ padding: '16px' }}>{error}</p>
      ) : (
        <>
          <p className="browse-count">{filteredMovies.length} filme(s)</p>
          <div className="browse-grid">
            {filteredMovies.map((movie) => (
              <article key={movie.movie_id ?? movie.id} className="browse-card">
                <button
                  type="button"
                  className="movie-poster-button"
                  onClick={() => handleOpenMovie(movie)}
                  aria-label={movie.title}
                >
                  {movie.poster_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w300${movie.poster_path}`}
                      alt={movie.title}
                    />
                  ) : (
                    <div className="no-poster">{movie.title}</div>
                  )}
                  <div className="browse-card-overlay">
                    <span className="browse-card-score">
                      ★ {(Number(movie.vote_average || 0) / 2).toFixed(1)}
                    </span>
                  </div>
                </button>
                <p className="browse-card-title">{movie.title}</p>
                <p className="browse-card-year">
                  {movie.release_date ? movie.release_date.slice(0, 4) : '—'}
                </p>
              </article>
            ))}
          </div>
        </>
      )}

      <MovieDetailsModal
        details={movieDetails || selectedMovie}
        loading={detailsLoading}
        error={detailsError}
        onOpenMovie={handleOpenMovie}
        onClose={handleCloseMovie}
      />
    </div>
  );
}
