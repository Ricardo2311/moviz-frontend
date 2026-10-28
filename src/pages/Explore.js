import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import MovieDetailsModal from '../components/MovieDetailsModal';
import RichText from '../components/RichText';
import { fetchMovieDetails, fetchTrending, followUser, searchCatalog } from '../api';
import { getStoredToken } from '../authStorage';

const FILTERS = [
  { id: 'all',    label: 'Tudo'     },
  { id: 'movies', label: 'Filmes'   },
  { id: 'users',  label: 'Pessoas'  },
  { id: 'clubs',  label: 'Clubes'   },
  { id: 'lists',  label: 'Listas'   },
];

/* ── helpers ─────────────────────────────────────────────────────────────── */

function posterUrl(path, size = 'w300') {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : '';
}

function releaseYear(dateStr) {
  return dateStr ? dateStr.slice(0, 4) : '';
}

function listCover(movieList) {
  const url = movieList?.cover_image_url || movieList?.poster_paths?.[0];
  if (!url) return '';
  return url.startsWith('http') ? url : `https://image.tmdb.org/t/p/w500${url}`;
}

/* ── sub-components ──────────────────────────────────────────────────────── */

function MovieCard({ movie, onOpen, size = 'normal' }) {
  return (
    <article className={`srch-movie-card${size === 'small' ? ' srch-movie-card--sm' : ''}`}>
      <button type="button" onClick={() => onOpen(movie)}>
        {movie.poster_path ? (
          <img src={posterUrl(movie.poster_path)} alt={movie.title} loading="lazy" />
        ) : (
          <div className="srch-movie-no-poster">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="2"/>
              <path d="M7 8h10M7 12h6"/>
            </svg>
          </div>
        )}
        <div className="srch-movie-overlay">
          <p className="srch-movie-name">{movie.title}</p>
          {releaseYear(movie.release_date) && (
            <p className="srch-movie-year">{releaseYear(movie.release_date)}</p>
          )}
        </div>
      </button>
    </article>
  );
}

function UserRow({ user, onNavigate, onFollow }) {
  return (
    <div className="srch-user-row" onClick={() => onNavigate(`/users/${user.username}`)}>
      {user.profile_image_url ? (
        <img src={user.profile_image_url} alt={user.username} className="srch-user-avatar" />
      ) : (
        <div className="srch-user-fallback">{user.username.slice(0, 1).toUpperCase()}</div>
      )}
      <div className="srch-user-info">
        <p className="srch-user-name">
          @{user.username}
          {user.is_verified_critic && (
            <span className="critic-badge critic-badge-sm"> Crítico</span>
          )}
        </p>
        <p className="srch-user-sub">
          {user.is_following ? 'Você já segue' : 'Ver perfil'}
        </p>
      </div>
      {onFollow && (
        <button
          type="button"
          className={`srch-follow-btn${user.is_following ? ' srch-follow-btn--following' : ''}`}
          onClick={(e) => { e.stopPropagation(); onFollow(user); }}
        >
          {user.is_following ? 'Seguindo' : 'Seguir'}
        </button>
      )}
    </div>
  );
}

function EntityCard({ name, meta, cover, fallbackEmoji = '🎬', onClick }) {
  return (
    <div className="srch-card" onClick={onClick}>
      <div className="srch-card-cover">
        {cover ? (
          <img src={cover} alt={name} loading="lazy" />
        ) : (
          <div className="srch-card-cover-fallback">{fallbackEmoji}</div>
        )}
      </div>
      <div className="srch-card-info">
        <p className="srch-card-name">{name}</p>
        {meta && <p className="srch-card-meta">{meta}</p>}
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-3)', flexShrink: 0 }}>
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>
  );
}

function SectionLabel({ children }) {
  return <p className="srch-section-label">{children}</p>;
}

function Divider() {
  return <div className="srch-divider" />;
}

function SkeletonRows({ count = 4 }) {
  return (
    <div className="srch-skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="srch-skel-row">
          <div className="srch-skel srch-skel--circle" />
          <div style={{ flex: 1 }}>
            <div className="srch-skel" style={{ width: '55%', height: 13 }} />
            <div className="srch-skel" style={{ width: '35%', height: 11, marginTop: 6 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── page ────────────────────────────────────────────────────────────────── */

export default function Explore() {
  const navigate = useNavigate();
  const token = useMemo(() => getStoredToken(), []);
  const inputRef = useRef(null);

  const [query, setQuery]               = useState('');
  const [debouncedQuery, setDebounced]  = useState('');
  const [filter, setFilter]             = useState('all');
  const [trending, setTrending]         = useState(null);
  const [results, setResults]           = useState(null);
  const [loading, setLoading]           = useState(false);
  const [trendingLoaded, setTrendingLoaded] = useState(false);
  const [selectedMovie, setSelectedMovie]   = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [detailsLoading, setDetailsLoading]   = useState(false);
  const [detailsError, setDetailsError]       = useState(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!token) navigate('/login', { replace: true });
  }, [navigate, token]);

  // Debounce query
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 240);
    return () => clearTimeout(t);
  }, [query]);

  // Load trending once on mount
  useEffect(() => {
    if (!token || trendingLoaded) return;
    setTrendingLoaded(true);
    fetchTrending(token)
      .then(setTrending)
      .catch(() => {});
  }, [token, trendingLoaded]);

  // Search when debounced query or filter changes
  useEffect(() => {
    if (!token || !debouncedQuery) {
      setResults(null);
      return;
    }
    setLoading(true);
    searchCatalog(token, debouncedQuery, filter)
      .then(setResults)
      .catch(() => setResults({ movies: [], users: [], clubs: [], lists: [] }))
      .finally(() => setLoading(false));
  }, [debouncedQuery, filter, token]);

  const openMovie = useCallback(async (movie) => {
    setSelectedMovie(movie);
    setSelectedDetails(null);
    setDetailsError(null);
    setDetailsLoading(true);
    try {
      const d = await fetchMovieDetails(token, movie.id);
      setSelectedDetails(d);
    } catch (err) {
      setDetailsError(err.message || 'Falha ao carregar detalhes.');
    } finally {
      setDetailsLoading(false);
    }
  }, [token]);

  const handleFollow = useCallback(async (user) => {
    if (!token) return;
    try {
      await followUser(token, user.id);
      // Update in results
      setResults((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          users: prev.users?.map((u) =>
            u.id === user.id ? { ...u, is_following: !u.is_following } : u
          ),
        };
      });
      // Update in trending
      setTrending((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          users: prev.users?.map((u) =>
            u.id === user.id ? { ...u, is_following: !u.is_following } : u
          ),
        };
      });
    } catch {}
  }, [token]);

  const hasQuery   = Boolean(debouncedQuery);
  const hasResults = results && (
    results.movies?.length || results.users?.length ||
    results.clubs?.length  || results.lists?.length
  );

  const showMovies = filter === 'all' || filter === 'movies';
  const showUsers  = filter === 'all' || filter === 'users';
  const showClubs  = filter === 'all' || filter === 'clubs';
  const showLists  = filter === 'all' || filter === 'lists';

  return (
    <div className="srch-page">

      {/* Sticky top bar */}
      <div className="srch-topbar">
        <div className="srch-input-wrap">
          {/* Search icon */}
          <svg className="srch-input-icon" width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            className="srch-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filmes, pessoas, clubes, listas…"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              type="button"
              className="srch-clear-btn"
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              aria-label="Limpar"
            >
              ×
            </button>
          )}
        </div>

        {/* Filter pills */}
        <div className="srch-filters">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`srch-filter-pill${filter === f.id ? ' srch-filter-pill--active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading ─────────────────────────────────────────── */}
      {loading && <SkeletonRows count={5} />}

      {/* ── Search results ──────────────────────────────────── */}
      {!loading && hasQuery && (
        <>
          {hasResults ? (
            <div className="srch-results">

              {/* Movies */}
              {showMovies && results.movies?.length > 0 && (
                <section className="srch-section">
                  <SectionLabel>Filmes</SectionLabel>
                  <div className="srch-movie-grid">
                    {results.movies.map((m) => (
                      <MovieCard key={m.id} movie={m} onOpen={openMovie} />
                    ))}
                  </div>
                </section>
              )}

              {showMovies && results.movies?.length > 0 && (showUsers || showClubs || showLists) &&
                (results.users?.length || results.clubs?.length || results.lists?.length) && <Divider />}

              {/* Users */}
              {showUsers && results.users?.length > 0 && (
                <section className="srch-section">
                  <SectionLabel>Pessoas</SectionLabel>
                  {results.users.map((u) => (
                    <UserRow key={u.id} user={u} onNavigate={navigate} onFollow={handleFollow} />
                  ))}
                </section>
              )}

              {showUsers && results.users?.length > 0 &&
                (showClubs || showLists) && (results.clubs?.length || results.lists?.length) && <Divider />}

              {/* Clubs */}
              {showClubs && results.clubs?.length > 0 && (
                <section className="srch-section">
                  <SectionLabel>Clubes</SectionLabel>
                  {results.clubs.map((c) => (
                    <EntityCard
                      key={c.id}
                      name={c.name}
                      meta={`${c.member_count} membro${c.member_count !== 1 ? 's' : ''} · ${c.short_description}`}
                      cover={c.cover_image_url}
                      fallbackEmoji="🎭"
                      onClick={() => navigate(`/clubs/${c.id}`)}
                    />
                  ))}
                </section>
              )}

              {showClubs && results.clubs?.length > 0 && showLists && results.lists?.length > 0 && <Divider />}

              {/* Lists */}
              {showLists && results.lists?.length > 0 && (
                <section className="srch-section">
                  <SectionLabel>Listas</SectionLabel>
                  {results.lists.map((l) => (
                    <EntityCard
                      key={l.id}
                      name={l.title}
                      meta={`${l.item_count} filme${l.item_count !== 1 ? 's' : ''} · @${l.owner_username || 'moviz'}`}
                      cover={listCover(l)}
                      fallbackEmoji="📋"
                      onClick={() =>
                        l.owner_username
                          ? navigate(`/users/${l.owner_username}/lists/${l.id}`)
                          : navigate(`/lists/${l.id}`)
                      }
                    />
                  ))}
                </section>
              )}
            </div>
          ) : (
            <div className="srch-empty">
              <p className="srch-empty-icon">🔍</p>
              <p className="srch-empty-title">Nenhum resultado</p>
              <p className="srch-empty-sub">Tente buscar com outro termo ou mude o filtro.</p>
            </div>
          )}
        </>
      )}

      {/* ── Discovery (no query) ────────────────────────────── */}
      {!loading && !hasQuery && trending && (
        <div className="srch-discovery">

          {/* Trending movies */}
          {trending.movies?.map((cat) => (
            <section key={cat.key} className="srch-section">
              <SectionLabel>{cat.title}</SectionLabel>
              <div className="srch-movie-row">
                {cat.items.map((m) => (
                  <MovieCard key={`${cat.key}-${m.id}`} movie={m} onOpen={openMovie} size="small" />
                ))}
              </div>
            </section>
          ))}

          {trending.movies?.length > 0 && <Divider />}

          {/* Trending hashtags */}
          {trending.trending_hashtags?.length > 0 && (
            <section className="srch-section">
              <SectionLabel>Hashtags em alta</SectionLabel>
              <div className="srch-hashtag-grid">
                {trending.trending_hashtags.map((h) => (
                  <button
                    key={h.tag}
                    type="button"
                    className="srch-hashtag-pill"
                    onClick={() => navigate(`/hashtags/${h.tag}`)}
                  >
                    <span className="srch-hashtag-tag">#{h.tag}</span>
                    <span className="srch-hashtag-count">{h.post_count} posts</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {trending.trending_hashtags?.length > 0 && <Divider />}

          {/* Trending users */}
          {trending.users?.length > 0 && (
            <section className="srch-section">
              <SectionLabel>Pessoas em alta</SectionLabel>
              {trending.users.map((u) => (
                <UserRow key={u.id} user={u} onNavigate={navigate} onFollow={handleFollow} />
              ))}
            </section>
          )}

          {trending.users?.length > 0 && <Divider />}

          {/* Trending clubs */}
          {trending.clubs?.length > 0 && (
            <section className="srch-section">
              <SectionLabel>Clubes em destaque</SectionLabel>
              {trending.clubs.map((c) => (
                <EntityCard
                  key={c.id}
                  name={c.name}
                  meta={`${c.member_count} membros · ${c.short_description}`}
                  cover={c.cover_image_url}
                  fallbackEmoji="🎭"
                  onClick={() => navigate(`/clubs/${c.id}`)}
                />
              ))}
            </section>
          )}

          {trending.clubs?.length > 0 && <Divider />}

          {/* Trending lists */}
          {trending.lists?.length > 0 && (
            <section className="srch-section">
              <SectionLabel>Listas em destaque</SectionLabel>
              {trending.lists.map((l) => (
                <EntityCard
                  key={l.id}
                  name={l.title}
                  meta={`${l.item_count} filmes · @${l.owner_username || 'moviz'}`}
                  cover={listCover(l)}
                  fallbackEmoji="📋"
                  onClick={() =>
                    l.owner_username
                      ? navigate(`/users/${l.owner_username}/lists/${l.id}`)
                      : navigate(`/lists/${l.id}`)
                  }
                />
              ))}
            </section>
          )}

          {trending.lists?.length > 0 && trending.trending_posts?.length > 0 && <Divider />}

          {/* Trending posts */}
          {trending.trending_posts?.length > 0 && (
            <section className="srch-section">
              <SectionLabel>Posts em alta</SectionLabel>
              <div className="srch-posts-list">
                {trending.trending_posts.map((post) => (
                  <article key={post.id} className="srch-post-card"
                    onClick={() => navigate(`/users/${post.author.username}`)}>
                    <div className="srch-post-author">
                      {post.author.profile_image_url ? (
                        <img src={post.author.profile_image_url} alt={post.author.username}
                          className="srch-user-avatar srch-user-avatar--sm" />
                      ) : (
                        <div className="srch-user-fallback srch-user-fallback--sm">
                          {post.author.username.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <strong className="srch-post-username">@{post.author.username}</strong>
                        {post.movie_title && (
                          <span className="srch-post-movie"> · {post.movie_title}</span>
                        )}
                      </div>
                    </div>
                    {post.text_content && (
                      <p className="srch-post-text">
                        <RichText text={post.text_content} />
                      </p>
                    )}
                    <div className="srch-post-stats">
                      <span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                        {post.like_count}
                      </span>
                      <span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        {post.comment_count}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <MovieDetailsModal
        details={selectedDetails || selectedMovie}
        loading={detailsLoading}
        error={detailsError}
        onOpenMovie={openMovie}
        onClose={() => {
          setSelectedMovie(null);
          setSelectedDetails(null);
          setDetailsLoading(false);
          setDetailsError(null);
        }}
      />
    </div>
  );
}
