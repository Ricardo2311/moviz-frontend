import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import MovieDetailsModal from '../components/MovieDetailsModal';
import { fetchMovieDetails, fetchMyRatings, fetchUserRatings } from '../api';
import { getStoredToken } from '../authStorage';

function RatingStars({ rating }) {
  const value = Number(rating || 0);
  return (
    <span className="rm-stars" aria-label={`${value} estrelas`}>
      {'★'.repeat(Math.floor(value))}
      {value % 1 >= 0.5 ? '½' : ''}
      <span className="rm-stars-value">{value.toFixed(1)}</span>
    </span>
  );
}

function RatedMovies() {
  const [ratings, setRatings]                       = useState([]);
  const [pageError, setPageError]                   = useState(null);
  const [selectedMovie, setSelectedMovie]           = useState(null);
  const [selectedMovieDetails, setSelectedMovieDetails] = useState(null);
  const [detailsLoading, setDetailsLoading]         = useState(false);
  const [detailsError, setDetailsError]             = useState(null);
  const [filterQuery, setFilterQuery]               = useState('');
  const [activeGenre, setActiveGenre]               = useState('');
  const [genreMap, setGenreMap]                     = useState({});
  const { username } = useParams();
  const navigate     = useNavigate();
  const isFriendView = Boolean(username);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) { navigate('/login', { replace: true }); return; }
    const req = isFriendView ? fetchUserRatings(token, username) : fetchMyRatings(token);
    req.then(setRatings).catch((err) => setPageError(err.message));
  }, [isFriendView, navigate, username]);

  useEffect(() => {
    const token = getStoredToken();
    if (!token || !ratings.length) { setGenreMap({}); return; }
    let ignore = false;
    Promise.all(
      ratings.map((movie) =>
        fetchMovieDetails(token, movie.movie_id || movie.id)
          .then((details) => [movie.movie_id || movie.id, details.genres || []])
          .catch(() => [movie.movie_id || movie.id, []])
      )
    ).then((entries) => { if (!ignore) setGenreMap(Object.fromEntries(entries)); });
    return () => { ignore = true; };
  }, [ratings]);

  const handleMovieClick = async (movie) => {
    const token = getStoredToken();
    setSelectedMovie(movie);
    setDetailsLoading(true);
    setDetailsError(null);
    setSelectedMovieDetails(null);
    try {
      const details = await fetchMovieDetails(token, movie.movie_id || movie.id);
      setSelectedMovieDetails(details);
    } catch (err) {
      setDetailsError(err.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleRatingSaved = (ratedMovie) => {
    if (isFriendView) return;
    setRatings((current) => {
      const next = [ratedMovie, ...current.filter((item) => item.movie_id !== ratedMovie.movie_id)];
      return next.sort((a, b) => new Date(b.rated_at).getTime() - new Date(a.rated_at).getTime() || b.id - a.id);
    });
    setSelectedMovieDetails((current) =>
      current ? { ...current, user_rating: ratedMovie.rating } : current
    );
  };

  if (pageError) return <p className="error">{pageError}</p>;

  const genres = Array.from(
    new Set(ratings.flatMap((movie) => genreMap[movie.movie_id || movie.id] || []))
  ).sort((a, b) => a.localeCompare(b));

  const filteredRatings = ratings.filter((movie) => {
    const matchesQuery = (movie.title || '').toLowerCase().includes(filterQuery.trim().toLowerCase());
    const movieGenres  = genreMap[movie.movie_id || movie.id] || [];
    const matchesGenre = !activeGenre || movieGenres.includes(activeGenre);
    return matchesQuery && matchesGenre;
  });

  return (
    <div className="rm-page">
      {/* Sticky header */}
      <div className="rm-header">
        <button
          className="rm-back-btn"
          onClick={() => navigate(isFriendView ? `/users/${username}` : '/profile')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div className="rm-header-text">
          <h1 className="rm-title">
            {isFriendView ? `Filmes de @${username}` : 'Meus Filmes'}
          </h1>
          <span className="rm-subtitle">{filteredRatings.length} avaliado{filteredRatings.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Search bar */}
      <div className="rm-search-bar">
        <div className="rm-search-wrap">
          <svg className="rm-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="rm-search-input"
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Pesquisar por título..."
          />
          {filterQuery && (
            <button className="rm-search-clear" onClick={() => setFilterQuery('')}>✕</button>
          )}
        </div>
      </div>

      {/* Genre chips */}
      {genres.length > 0 && (
        <div className="rm-chips">
          <button
            className={`rm-chip${!activeGenre ? ' rm-chip--active' : ''}`}
            onClick={() => setActiveGenre('')}
          >
            Todos
          </button>
          {genres.map((genre) => (
            <button
              key={genre}
              className={`rm-chip${activeGenre === genre ? ' rm-chip--active' : ''}`}
              onClick={() => setActiveGenre(genre)}
            >
              {genre}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {filteredRatings.length === 0 && (
        <div className="rm-empty">
          <p className="rm-empty-icon">🎬</p>
          <p className="rm-empty-msg">
            {filterQuery || activeGenre ? 'Nenhum resultado.' : 'Nenhum filme avaliado ainda.'}
          </p>
        </div>
      )}

      {/* Poster grid */}
      {filteredRatings.length > 0 && (
        <div className="rm-grid">
          {filteredRatings.map((movie) => (
            <div
              key={movie.id}
              className="rm-card"
              onClick={() => handleMovieClick(movie)}
            >
              {movie.poster_path ? (
                <img
                  className="rm-card-img"
                  src={`https://image.tmdb.org/t/p/w300${movie.poster_path}`}
                  alt={movie.title}
                  loading="lazy"
                />
              ) : (
                <div className="rm-card-noposter">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="3"/><path d="m9 9 6 6m0-6-6 6"/>
                  </svg>
                </div>
              )}
              <div className="rm-card-info">
                <p className="rm-card-title">{movie.title}</p>
                {movie.rating != null && <RatingStars rating={movie.rating} />}
              </div>
            </div>
          ))}
        </div>
      )}

      <MovieDetailsModal
        details={selectedMovieDetails || selectedMovie}
        loading={detailsLoading}
        error={detailsError}
        onRatingSaved={handleRatingSaved}
        onOpenMovie={handleMovieClick}
        onClose={() => {
          setSelectedMovie(null);
          setSelectedMovieDetails(null);
          setDetailsLoading(false);
          setDetailsError(null);
        }}
      />
    </div>
  );
}

export default RatedMovies;
