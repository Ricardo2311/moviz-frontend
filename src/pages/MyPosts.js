import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MovieDetailsModal from '../components/MovieDetailsModal';
import { fetchMyPosts, fetchMySavedPosts, fetchMovieDetails } from '../api';
import { getStoredToken } from '../authStorage';

function PostMiniCard({ post, onNavigate }) {
  const hasPoster = Boolean(post.movie_poster_path);
  const previewText = post.review_headline || (post.text_content ? post.text_content.slice(0, 80) : null);

  return (
    <article className="myposts-card" onClick={() => onNavigate(`/posts/${post.id}`)}>
      {hasPoster ? (
        <img
          className="myposts-card-img"
          src={`https://image.tmdb.org/t/p/w300${post.movie_poster_path}`}
          alt={post.movie_title || 'Post'}
          loading="lazy"
        />
      ) : (
        <div className="myposts-card-noposter">
          {previewText && (
            <p className="myposts-noposter-text">"{previewText}"</p>
          )}
          {post.movie_title && (
            <p className="myposts-noposter-movie">{post.movie_title}</p>
          )}
        </div>
      )}

      {/* Hover overlay with stats */}
      <div className="myposts-card-overlay">
        <div className="myposts-card-stats">
          <span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            {post.like_count || 0}
          </span>
          <span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {post.comment_count || 0}
          </span>
        </div>
      </div>
    </article>
  );
}

export default function MyPosts() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const isSaved    = location.pathname === '/profile/saved';
  const token      = getStoredToken();

  const [posts, setPosts]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]         = useState(false);
  const [skip, setSkip]               = useState(0);
  const LIMIT                         = 20;

  const [selectedMovie, setSelectedMovie]   = useState(null);
  const [movieDetails, setMovieDetails]     = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    if (!token) { navigate('/login', { replace: true }); return; }
    setLoading(true);
    const fetcher = isSaved ? fetchMySavedPosts : fetchMyPosts;
    fetcher(token, 0, LIMIT)
      .then((data) => {
        setPosts(data || []);
        setHasMore((data || []).length === LIMIT);
        setSkip(LIMIT);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, isSaved, navigate]);

  const loadMore = useCallback(async () => {
    if (!token || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const fetcher = isSaved ? fetchMySavedPosts : fetchMyPosts;
    try {
      const data = await fetcher(token, skip, LIMIT);
      setPosts((prev) => [...prev, ...(data || [])]);
      setHasMore((data || []).length === LIMIT);
      setSkip((s) => s + LIMIT);
    } catch {}
    finally { setLoadingMore(false); }
  }, [token, loadingMore, hasMore, skip, isSaved]);

  const openMovie = useCallback(async (movie) => {
    setSelectedMovie(movie);
    setMovieDetails(null);
    setDetailsLoading(true);
    try {
      const d = await fetchMovieDetails(token, movie.movie_id || movie.id);
      setMovieDetails(d);
    } catch {}
    finally { setDetailsLoading(false); }
  }, [token]);

  const title    = isSaved ? 'Posts Salvos' : 'Meus Posts';
  const emptyMsg = isSaved ? 'Nenhum post salvo ainda.' : 'Nenhum post feito ainda.';
  const emptyIcon = isSaved ? '🔖' : '📝';

  return (
    <div className="myposts-page">
      {/* Sticky header */}
      <div className="myposts-header">
        <button className="myposts-back-btn" onClick={() => navigate('/profile')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 className="myposts-title">{title}</h1>
        {!loading && posts.length > 0 && (
          <span className="myposts-count">{posts.length}{hasMore ? '+' : ''}</span>
        )}
      </div>

      {/* Skeleton */}
      {loading && (
        <div className="myposts-grid">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="myposts-card myposts-card--skel">
              <div className="myposts-skel myposts-skel--cell" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && posts.length === 0 && (
        <div className="myposts-empty">
          <p className="myposts-empty-icon">{emptyIcon}</p>
          <p className="myposts-empty-msg">{emptyMsg}</p>
          {!isSaved && (
            <button className="myposts-create-btn" onClick={() => navigate('/posts/new')}>
              Criar primeiro post
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {!loading && posts.length > 0 && (
        <>
          <div className="myposts-grid">
            {posts.map((post) => (
              <PostMiniCard
                key={post.id}
                post={post}
                onNavigate={navigate}
                onMovieClick={openMovie}
              />
            ))}
          </div>

          {hasMore && (
            <div className="myposts-load-more">
              <button
                className="myposts-load-btn"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Carregando...' : 'Ver mais'}
              </button>
            </div>
          )}
        </>
      )}

      <MovieDetailsModal
        details={movieDetails || selectedMovie}
        loading={detailsLoading}
        onClose={() => { setSelectedMovie(null); setMovieDetails(null); }}
        onOpenMovie={openMovie}
      />
    </div>
  );
}
