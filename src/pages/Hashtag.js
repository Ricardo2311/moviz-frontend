import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import HomeButton from '../components/HomeButton';
import RichText from '../components/RichText';
import { fetchPostsByHashtag, getCurrentUser } from '../api';
import { clearStoredToken, getStoredToken } from '../authStorage';

function formatRelativeDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} d`;
  return date.toLocaleDateString('pt-BR');
}

function Hashtag() {
  const { tag } = useParams();
  const navigate = useNavigate();
  const token = useMemo(() => getStoredToken(), []);
  const [posts, setPosts] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    getCurrentUser(token).catch(() => {
      clearStoredToken();
      navigate('/login', { replace: true });
    });

    setLoading(true);
    setError('');
    fetchPostsByHashtag(token, tag)
      .then((data) => {
        setPosts(data.items || []);
        setNextCursor(data.next_cursor || null);
      })
      .catch((err) => setError(err.message || 'Falha ao carregar posts.'))
      .finally(() => setLoading(false));
  }, [navigate, tag, token]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchPostsByHashtag(token, tag, nextCursor);
      setPosts((current) => [...current, ...(data.items || [])]);
      setNextCursor(data.next_cursor || null);
    } catch (err) {
      setError(err.message || 'Falha ao carregar mais posts.');
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, nextCursor, tag, token]);

  return (
    <div className="hashtag-page">
      <HomeButton />

      <section className="hashtag-hero">
        <div>
          <p className="eyebrow">Hashtag</p>
          <h1>#{tag}</h1>
          <p>Posts da comunidade com essa tag.</p>
        </div>
        <button type="button" className="secondary-button" onClick={() => navigate(-1)}>
          Voltar
        </button>
      </section>

      {error ? <p className="error">{error}</p> : null}
      {loading ? <p className="loading-copy">Carregando posts...</p> : null}

      {!loading && !posts.length && !error ? (
        <p className="helper-copy">Nenhum post encontrado para #{tag}.</p>
      ) : null}

      {posts.length ? (
        <div className="hashtag-posts">
          {posts.map((post) => (
            <article key={post.id} className="feed-card hashtag-post-card">
              <button
                type="button"
                className="feed-author"
                onClick={() => navigate(`/users/${post.author.username}`)}
              >
                {post.author.profile_image_url ? (
                  <img src={post.author.profile_image_url} alt={post.author.username} />
                ) : (
                  <div className="feed-avatar-fallback">{post.author.username.slice(0, 1)}</div>
                )}
                <div>
                  <strong>@{post.author.username}</strong>
                  <span>{formatRelativeDate(post.created_at)}</span>
                </div>
              </button>

              {post.movie_title ? (
                <div className="hashtag-post-movie">
                  {post.movie_poster_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w92${post.movie_poster_path}`}
                      alt={post.movie_title}
                      className="hashtag-post-poster"
                    />
                  ) : null}
                  <strong>{post.movie_title}</strong>
                </div>
              ) : null}

              {post.text_content ? (
                <p className="feed-text">
                  <RichText text={post.text_content} />
                </p>
              ) : null}

              {post.tags?.length ? (
                <div className="feed-tags">
                  {post.tags.map((t) => (
                    <span key={`${post.id}-${t}`}>#{t}</span>
                  ))}
                </div>
              ) : null}

              <div className="feed-actions">
                <span className="feed-act-stat">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  {post.like_count > 0 ? post.like_count : null}
                </span>
                <span className="feed-act-stat">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  {post.comment_count > 0 ? post.comment_count : null}
                </span>
              </div>
            </article>
          ))}

          {nextCursor ? (
            <div className="hashtag-load-more">
              <button
                type="button"
                className="secondary-button"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Carregando...' : 'Carregar mais'}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default Hashtag;
