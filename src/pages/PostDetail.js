import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import RichText from '../components/RichText';
import MovieDetailsModal from '../components/MovieDetailsModal';
import {
  fetchFeedPost,
  fetchMovieDetails,
  togglePostLike,
  savePost,
  createPostComment,
  fetchPostComments,
} from '../api';
import { getStoredToken } from '../authStorage';

const anonymousAvatar = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" rx="36" fill="#eadfce"/><circle cx="80" cy="62" r="28" fill="#c3b39c"/><path d="M38 132c8-24 26-36 42-36s34 12 42 36" fill="#c3b39c"/></svg>`
)}`;

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function StarRating({ rating }) {
  const stars = Math.round(rating * 2) / 2;
  return (
    <span className="pd-stars" aria-label={`${rating} estrelas`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i + 1 <= stars ? 1 : i + 0.5 <= stars ? 0.5 : 0;
        return (
          <svg key={i} width="16" height="16" viewBox="0 0 24 24" className={`pd-star${filled === 1 ? ' full' : filled === 0.5 ? ' half' : ''}`}>
            <defs>
              {filled === 0.5 && (
                <linearGradient id={`hg${i}`} x1="0" x2="1" y1="0" y2="0">
                  <stop offset="50%" stopColor="currentColor" />
                  <stop offset="50%" stopColor="var(--bg-4)" />
                </linearGradient>
              )}
            </defs>
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={filled === 0.5 ? `url(#hg${i})` : filled === 1 ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        );
      })}
    </span>
  );
}

export default function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const token = getStoredToken();

  const [post, setPost]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [liked, setLiked]             = useState(false);
  const [likeCount, setLikeCount]     = useState(0);
  const [saved, setSaved]             = useState(false);
  const [comments, setComments]       = useState([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [selectedMovie, setSelectedMovie]   = useState(null);
  const [movieDetails, setMovieDetails]     = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    if (!token) { navigate('/login', { replace: true }); return; }
    if (!postId) { navigate(-1); return; }
    setLoading(true);
    fetchFeedPost(token, postId)
      .then((p) => {
        setPost(p);
        setLiked(p.liked_by_me);
        setLikeCount(p.like_count);
        setSaved(p.saved_by_me);
        setComments(p.comments || []);
        setCommentsLoaded(true);
      })
      .catch((err) => setError(err.message || 'Post não encontrado.'))
      .finally(() => setLoading(false));
  }, [postId, token, navigate]);

  const handleLike = useCallback(async () => {
    if (!token || !post) return;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));
    try { await togglePostLike(token, post.id); } catch { setLiked(wasLiked); setLikeCount((c) => c + (wasLiked ? 1 : -1)); }
  }, [liked, post, token]);

  const handleSave = useCallback(async () => {
    if (!token || !post) return;
    setSaved((s) => !s);
    try { await savePost(token, post.id); } catch { setSaved((s) => !s); }
  }, [post, token]);

  const loadComments = useCallback(async () => {
    if (!token || !post || commentsLoading) return;
    setCommentsLoading(true);
    try {
      const all = await fetchPostComments(token, post.id);
      setComments(all || []);
      setCommentsLoaded(true);
    } catch {}
    finally { setCommentsLoading(false); }
  }, [token, post, commentsLoading]);

  useEffect(() => {
    if (post && !commentsLoaded) loadComments();
  }, [post, commentsLoaded, loadComments]);

  const handleComment = async (e) => {
    e.preventDefault();
    if (!token || !post || !commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const newComment = await createPostComment(token, post.id, commentText.trim());
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
    } catch {}
    finally { setSubmitting(false); }
  };

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

  if (loading) {
    return (
      <div className="pd-page">
        <button className="pd-back-btn" onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Voltar
        </button>
        <div className="pd-skeleton">
          <div className="pd-skel pd-skel--avatar" />
          <div className="pd-skel pd-skel--title" />
          <div className="pd-skel pd-skel--body" />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="pd-page">
        <button className="pd-back-btn" onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Voltar
        </button>
        <div className="pd-error">
          <p>😕</p>
          <p>{error || 'Post não encontrado.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pd-page">
      {/* Back */}
      <button className="pd-back-btn" onClick={() => navigate(-1)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Voltar
      </button>

      <article className="pd-card">
        {/* Author */}
        <div className="pd-author">
          <button className="pd-author-avatar-btn" onClick={() => navigate(`/users/${post.author.username}`)}>
            <img
              src={post.author.profile_image_url || anonymousAvatar}
              alt={post.author.username}
              className="pd-author-avatar"
              onError={(e) => { e.currentTarget.src = anonymousAvatar; }}
            />
          </button>
          <div className="pd-author-info">
            <button className="pd-author-name" onClick={() => navigate(`/users/${post.author.username}`)}>
              @{post.author.username}
              {post.author.is_verified_critic && (
                <span className="critic-badge critic-badge-sm"> Crítico</span>
              )}
            </button>
            <span className="pd-author-time">{relativeTime(post.created_at)}</span>
          </div>
          {post.contains_spoiler && (
            <span className="pd-spoiler-badge">⚠️ Spoiler</span>
          )}
        </div>

        {/* Movie poster */}
        {post.movie_id && post.movie_poster_path && (
          <button
            className="pd-movie-banner"
            onClick={() => openMovie({ id: post.movie_id, movie_id: post.movie_id, title: post.movie_title, poster_path: post.movie_poster_path, release_date: post.movie_release_date })}
          >
            <img src={`https://image.tmdb.org/t/p/w500${post.movie_poster_path}`} alt={post.movie_title} />
            <div className="pd-movie-overlay">
              <div>
                <p className="pd-movie-title">{post.movie_title}</p>
                {post.movie_release_date && <p className="pd-movie-year">{post.movie_release_date.slice(0, 4)}</p>}
              </div>
              {post.rating != null && <StarRating rating={post.rating} />}
            </div>
          </button>
        )}

        {/* Review headline */}
        {post.review_headline && (
          <h2 className="pd-headline">{post.review_headline}</h2>
        )}

        {/* Text */}
        {post.text_content && (
          <div className="pd-text">
            <RichText text={post.text_content} />
          </div>
        )}

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className="pd-tags">
            {post.tags.map((tag) => (
              <button
                key={tag}
                className="pd-tag"
                onClick={() => navigate(`/hashtags/${tag}`)}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Sentiment + watch again */}
        {(post.sentiment || post.would_watch_again != null) && (
          <div className="pd-meta-row">
            {post.sentiment && (
              <span className={`pd-sentiment pd-sentiment--${post.sentiment}`}>
                {post.sentiment === 'positive' ? '😊 Positivo' : post.sentiment === 'negative' ? '😔 Negativo' : '😐 Neutro'}
              </span>
            )}
            {post.would_watch_again != null && (
              <span className="pd-watch-again">
                {post.would_watch_again ? '🔁 Assistiria novamente' : '➡️ Não assistiria de novo'}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="pd-actions">
          <button
            className={`pd-action-btn${liked ? ' pd-action-btn--liked' : ''}`}
            onClick={handleLike}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>

          <div className="pd-action-stat">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {comments.length > 0 && <span>{comments.length}</span>}
          </div>

          <button
            className={`pd-action-btn${saved ? ' pd-action-btn--saved' : ''}`}
            onClick={handleSave}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
        </div>

        {/* Comments */}
        <div className="pd-comments-section">
          <h3 className="pd-comments-title">
            Comentários {comments.length > 0 && <span>({comments.length})</span>}
          </h3>

          {commentsLoading && <p className="pd-comments-loading">Carregando...</p>}

          {comments.map((c) => (
            <div key={c.id} className="pd-comment">
              <img
                src={c.author.profile_image_url || anonymousAvatar}
                alt={c.author.username}
                className="pd-comment-avatar"
                onError={(e) => { e.currentTarget.src = anonymousAvatar; }}
              />
              <div className="pd-comment-body">
                <span className="pd-comment-user">@{c.author.username}</span>
                <span className="pd-comment-time"> · {relativeTime(c.created_at)}</span>
                <p className="pd-comment-text"><RichText text={c.content} /></p>
              </div>
            </div>
          ))}

          {!commentsLoading && comments.length === 0 && (
            <p className="pd-no-comments">Nenhum comentário ainda. Seja o primeiro!</p>
          )}

          <form className="pd-comment-form" onSubmit={handleComment}>
            <input
              className="pd-comment-input"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Escreva um comentário..."
              disabled={submitting}
            />
            <button
              type="submit"
              className="pd-comment-send"
              disabled={submitting || !commentText.trim()}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </form>
        </div>
      </article>

      <MovieDetailsModal
        details={movieDetails || selectedMovie}
        loading={detailsLoading}
        onClose={() => { setSelectedMovie(null); setMovieDetails(null); }}
        onOpenMovie={openMovie}
      />
    </div>
  );
}
