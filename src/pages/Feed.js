import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePullToRefresh, PullRefreshIndicator } from '../hooks/usePullToRefresh';
import { useNavigate, useSearchParams } from 'react-router-dom';

import HomeButton from '../components/HomeButton';
import MovieDetailsModal from '../components/MovieDetailsModal';
import RichText from '../components/RichText';
import {
  createPostComment,
  fetchFeed,
  fetchFeedPost,
  fetchMovieDetails,
  fetchPostComments,
  fetchProfile,
  followUser,
  getCurrentUser,
  savePost,
  sharePost,
  suggestHashtags,
  suggestMentions,
  togglePostLike,
  unfollowUser,
} from '../api';
import { clearStoredToken, getStoredToken } from '../authStorage';

const FEED_MODES = [
  { id: 'following', label: 'Seguindo' },
  { id: 'suggested', label: 'Sugeridos' },
];

function formatRelativeDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMinutes < 60) {
    return `${diffMinutes} min`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} d`;
  }

  return date.toLocaleDateString('pt-BR');
}

function FeedSkeleton({ compact = false }) {
  return (
    <article className={`feed-card feed-skeleton-card${compact ? ' compact' : ''}`}>
      <div className="feed-skeleton-top">
        <div className="feed-skeleton-avatar" />
        <div className="feed-skeleton-lines">
          <span />
          <span />
        </div>
      </div>
      <div className="feed-skeleton-poster" />
      <div className="feed-skeleton-lines body">
        <span />
        <span />
        <span />
      </div>
    </article>
  );
}

function CommentsModal({ post, comments, loading, onClose, navigate }) {
  if (!post) {
    return null;
  }

  return (
    <div className="feed-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="feed-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button type="button" className="feed-modal-close" onClick={onClose}>
          x
        </button>
        <p className="eyebrow">Comentarios</p>
        <h2>{post.movie_title || post.list_title || 'Post da comunidade'}</h2>
        <div className="feed-modal-comments">
          {loading ? <p className="loading-copy">Carregando comentarios...</p> : null}
          {!loading && !comments.length ? (
            <p className="feed-comment-empty">Nenhum comentario encontrado.</p>
          ) : null}
          {!loading
            ? comments.map((comment) => (
                <button
                  key={comment.id}
                  type="button"
                  className="feed-comment feed-comment-modal"
                  onClick={() => navigate(`/users/${comment.author.username}`)}
                >
                  <strong>@{comment.author.username}</strong>
                  <p><RichText text={comment.content} /></p>
                </button>
              ))
            : null}
        </div>
      </div>
    </div>
  );
}

function ConfirmUnfollowModal({ user, onCancel, onConfirm, loading }) {
  if (!user) {
    return null;
  }

  return (
    <div className="feed-modal-overlay" onClick={onCancel} role="presentation">
      <div
        className="feed-modal feed-confirm-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button type="button" className="feed-modal-close" onClick={onCancel}>
          x
        </button>
        <p className="eyebrow">Seguindo</p>
        <h2>Deseja mesmo parar de seguir @{user.username}?</h2>
        <p className="feed-confirm-copy">
          Se confirmar, essa pessoa sai da sua aba de seguindo e tambem da sua lista de amigos.
        </p>
        <div className="feed-confirm-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="primary-button" onClick={onConfirm} disabled={loading}>
            {loading ? 'Removendo...' : 'Parar de seguir'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PostCard({
  post,
  currentUserId,
  onMovieClick,
  onToggleLike,
  onToggleSave,
  onCommentSubmit,
  onLoadComments,
  onSharePost,
  shareTargets,
  onFollow,
  navigate,
}) {
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [shareUsername, setShareUsername] = useState('');
  const [shareFeedback, setShareFeedback] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [shareSearch, setShareSearch] = useState('');
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [hashtagQuery, setHashtagQuery] = useState('');
  const [mentionQuery, setMentionQuery] = useState('');
  const [hashtagSuggestions, setHashtagSuggestions] = useState([]);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  const commentInputRef = useRef(null);

  useEffect(() => {
    const token = getStoredToken();
    if (!token || !hashtagQuery) {
      setHashtagSuggestions([]);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      suggestHashtags(token, hashtagQuery)
        .then((results) => setHashtagSuggestions(results || []))
        .catch(() => setHashtagSuggestions([]));
    }, 150);

    return () => window.clearTimeout(timer);
  }, [hashtagQuery]);

  useEffect(() => {
    const token = getStoredToken();
    if (!token || !mentionQuery) {
      setMentionSuggestions([]);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      suggestMentions(token, mentionQuery)
        .then((results) => setMentionSuggestions(results || []))
        .catch(() => setMentionSuggestions([]));
    }, 150);

    return () => window.clearTimeout(timer);
  }, [mentionQuery]);

  const replaceActiveToken = (pattern, replacement) => {
    const input = commentInputRef.current;
    if (!input) {
      return;
    }

    const cursorPosition = input.selectionStart || comment.length;
    const textBeforeCursor = comment.slice(0, cursorPosition);
    const textAfterCursor = comment.slice(cursorPosition);
    const updatedBeforeCursor = textBeforeCursor.replace(pattern, replacement);
    const nextValue = `${updatedBeforeCursor}${textAfterCursor}`;
    setComment(nextValue);

    window.requestAnimationFrame(() => {
      const nextCursor = updatedBeforeCursor.length;
      input.focus();
      input.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    const trimmed = comment.trim();
    if (!trimmed || submitting) {
      return;
    }

    setSubmitting(true);
    try {
      await onCommentSubmit(post.id, trimmed);
      setComment('');
      setHashtagQuery('');
      setMentionQuery('');
      setHashtagSuggestions([]);
      setMentionSuggestions([]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <article className="feed-card">
      <div className="feed-card-top">
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
            <div className="feed-author-name-row">
              <strong>@{post.author.username}</strong>
              {post.author.is_verified_critic ? (
                <span className="critic-badge critic-badge-feed">Critico verificado</span>
              ) : null}
            </div>
            <span>{formatRelativeDate(post.created_at)}</span>
          </div>
        </button>

        {post.author.id !== currentUserId ? (
          <button
            type="button"
            className="feed-follow-button"
            onClick={() => onFollow(post.author.id)}
          >
            {post.author.is_following ? 'Seguindo' : 'Seguir'}
          </button>
        ) : null}
      </div>

      {(post.movie_poster_path || post.movie_title) && (
        <div className="feed-movie-hero">
          <button
            type="button"
            className="feed-poster-button"
            onClick={() =>
              post.movie_id
                ? onMovieClick({
                    id: post.movie_id,
                    title: post.movie_title,
                    poster_path: post.movie_poster_path,
                    release_date: post.movie_release_date,
                  })
                : null
            }
          >
            {post.movie_poster_path ? (
              <img
                src={`https://image.tmdb.org/t/p/w500${post.movie_poster_path}`}
                alt={post.movie_title || 'Filme'}
                className="feed-poster"
              />
            ) : (
              <div className="feed-poster feed-poster-fallback">Lista</div>
            )}
          </button>
          <div className="feed-movie-copy">
            <div className="feed-movie-meta">
              <span className="feed-post-type">{post.post_type}</span>
              {post.sentiment ? <span className="feed-sentiment">{post.sentiment}</span> : null}
              {typeof post.rating === 'number' ? (
                <span className="feed-rating">★ {post.rating.toFixed(1)}</span>
              ) : null}
            </div>
            <h2>{post.movie_title || post.list_title || 'Compartilhamento de lista'}</h2>
            {post.review_headline ? <p className="feed-headline">{post.review_headline}</p> : null}
          </div>
        </div>
      )}

      {post.contains_spoiler && !spoilerRevealed ? (
        <div className="feed-spoiler-banner">
          <span>Este post contém spoilers</span>
          <button
            type="button"
            className="feed-spoiler-reveal-btn"
            onClick={() => setSpoilerRevealed(true)}
          >
            Revelar conteúdo
          </button>
        </div>
      ) : (
        <div className="feed-card-body">
          {post.contains_spoiler && spoilerRevealed ? (
            <p className="feed-spoiler-label">⚠ Spoiler revelado</p>
          ) : null}
          {post.text_content ? <p className="feed-text"><RichText text={post.text_content} /></p> : null}

          {post.tags?.length ? (
            <div className="feed-tags">
              {post.tags.map((tag) => (
                <span key={`${post.id}-${tag}`}>#{tag}</span>
              ))}
            </div>
          ) : null}

          {post.list_items?.length ? (
            <div className="feed-list-block">
              {post.list_items.map((item) => (
                <div key={`${post.id}-${item}`} className="feed-list-item">
                  {item}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      <div className="feed-actions">
        {/* Curtir */}
        <button
          type="button"
          className={`feed-act-btn${post.liked_by_me ? ' feed-act-btn--liked' : ''}`}
          onClick={() => onToggleLike(post.id)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24"
            fill={post.liked_by_me ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          {post.like_count > 0 && <span>{post.like_count}</span>}
        </button>
        {/* Comentar */}
        <button
          type="button"
          className={`feed-act-btn${commentsOpen ? ' feed-act-btn--active' : ''}`}
          onClick={() => setCommentsOpen((o) => !o)}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {post.comment_count > 0 && <span>{post.comment_count}</span>}
        </button>
        {/* Salvar */}
        <button
          type="button"
          className={`feed-act-btn${post.saved_by_me ? ' feed-act-btn--saved' : ''}`}
          onClick={() => onToggleSave(post.id)}
        >
          <svg width="19" height="19" viewBox="0 0 24 24"
            fill={post.saved_by_me ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
        {/* Compartilhar */}
        {shareTargets.length > 0 && (
          <button
            type="button"
            className="feed-act-btn"
            onClick={() => setShareOpen((o) => !o)}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            {post.share_count > 0 && <span>{post.share_count}</span>}
          </button>
        )}
      </div>

      {/* Painel de compartilhar — avatares dos amigos */}
      {shareOpen && shareTargets.length > 0 ? (
        <div className="feed-share-panel">
          <input
            type="text"
            className="feed-share-search"
            placeholder="Buscar amigo..."
            value={shareSearch}
            onChange={(e) => setShareSearch(e.target.value)}
          />
          <div className="feed-share-friends">
            {shareTargets
              .filter((f) => !shareSearch || f.username.toLowerCase().includes(shareSearch.toLowerCase()))
              .map((friend) => (
                <button
                  key={friend.username}
                  type="button"
                  className={`feed-share-friend${shareUsername === friend.username ? ' feed-share-friend--selected' : ''}`}
                  onClick={async () => {
                    if (shareUsername === friend.username) return;
                    setShareUsername(friend.username);
                    try {
                      const result = await onSharePost(post.id, friend.username);
                      setShareFeedback(result.message || 'Compartilhado!');
                      setShareUsername('');
                      setTimeout(() => { setShareFeedback(''); setShareOpen(false); setShareSearch(''); }, 1800);
                    } catch (err) {
                      setShareFeedback(err.message || 'Falha ao compartilhar.');
                      setShareUsername('');
                    }
                  }}
                >
                  {friend.profile_image_url ? (
                    <img src={friend.profile_image_url} alt={friend.username} />
                  ) : (
                    <div className="feed-share-friend-fallback">{friend.username.slice(0, 1).toUpperCase()}</div>
                  )}
                  <span>{friend.username}</span>
                </button>
              ))
            }
          </div>
          {shareFeedback ? <p className="feed-share-feedback">{shareFeedback}</p> : null}
        </div>
      ) : null}

      {/* Preview de comentários (fechado): mostra até 3 */}
      {!commentsOpen && post.comments?.length > 0 ? (
        <div className="feed-comments feed-comments--preview">
          {post.comments.slice(0, 3).map((commentItem) => (
            <button
              type="button"
              key={commentItem.id}
              className="feed-comment"
              onClick={() => navigate(`/users/${commentItem.author.username}`)}
            >
              <strong>@{commentItem.author.username}</strong>
              <p><RichText text={commentItem.content} /></p>
            </button>
          ))}
          {post.comment_count > 3 ? (
            <button
              type="button"
              className="feed-view-comments"
              onClick={() => setCommentsOpen(true)}
            >
              Ver todos os {post.comment_count} comentários
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Painel expandido de comentários + input */}
      {commentsOpen ? (
        <div className="feed-comments-panel">
          <div className="feed-comments">
            {post.comments?.length ? (
              <>
                {post.comments.map((commentItem) => (
                  <button
                    type="button"
                    key={commentItem.id}
                    className="feed-comment"
                    onClick={() => navigate(`/users/${commentItem.author.username}`)}
                  >
                    <strong>@{commentItem.author.username}</strong>
                    <p><RichText text={commentItem.content} /></p>
                  </button>
                ))}
                {post.comment_count > post.comments.length ? (
                  <button
                    type="button"
                    className="feed-view-comments"
                    disabled={loadingComments}
                    onClick={async () => {
                      setLoadingComments(true);
                      try { await onLoadComments(post); }
                      finally { setLoadingComments(false); }
                    }}
                  >
                    {loadingComments ? 'Carregando...' : 'Ver todos os comentários'}
                  </button>
                ) : null}
              </>
            ) : (
              <p className="feed-comment-empty">Nenhum comentário ainda. Seja o primeiro.</p>
            )}
          </div>

          <form className="feed-comment-form" onSubmit={handleCommentSubmit}>
            <input
              ref={commentInputRef}
              type="text"
              value={comment}
              onChange={(e) => {
                const nextValue = e.target.value;
                setComment(nextValue);
                const cursorPosition = e.target.selectionStart || nextValue.length;
                const textBeforeCursor = nextValue.slice(0, cursorPosition);
                const hashtagMatch = textBeforeCursor.match(/(?:^|\s)#([A-Za-z0-9_]*)$/);
                const mentionMatch = textBeforeCursor.match(/(?:^|\s)@([A-Za-z0-9_]*)$/);
                setHashtagQuery(hashtagMatch ? hashtagMatch[1] : '');
                setMentionQuery(mentionMatch ? mentionMatch[1] : '');
              }}
              placeholder="Escreva um comentário... @usuario"
            />
            <button type="submit" className="feed-comment-send" disabled={submitting || !comment.trim()}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </form>
          {hashtagSuggestions.length ? (
            <div className="feed-inline-suggestions">
              {hashtagSuggestions.map((item) => (
                <button
                  key={item.tag}
                  type="button"
                  className="filter-chip"
                  onClick={() => {
                    replaceActiveToken(/(^|\s)#([A-Za-z0-9_]*)$/, `$1#${item.tag} `);
                    setHashtagQuery('');
                    setHashtagSuggestions([]);
                  }}
                >
                  #{item.tag}
                </button>
              ))}
            </div>
          ) : null}
          {mentionSuggestions.length ? (
            <div className="feed-inline-suggestions">
              {mentionSuggestions.map((item) => (
                <button
                  key={item.username}
                  type="button"
                  className="mention-suggestion-item"
                  onClick={() => {
                    replaceActiveToken(/(^|\s)@([A-Za-z0-9_]*)$/, `$1@${item.username} `);
                    setMentionQuery('');
                    setMentionSuggestions([]);
                  }}
                >
                  {item.profile_image_url ? (
                    <img src={item.profile_image_url} alt={item.username} />
                  ) : (
                    <div className="mention-suggestion-avatar">@</div>
                  )}
                  <span>@{item.username}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

const FEED_ADS = [
  {
    id: 'ad-mubi',
    partner: 'Mubi',
    tagline: 'Cinema de Autor',
    headline: 'Um novo filme todo dia, curado por cinéfilos.',
    cta: 'Primeiro mês grátis',
    accent: '#00d4aa',
    emoji: '🎞',
  },
  {
    id: 'ad-max',
    partner: 'Max',
    tagline: 'Séries & Filmes',
    headline: 'Os maiores lançamentos do ano, todos em um lugar.',
    cta: 'Assinar agora',
    accent: '#0065fc',
    emoji: '🎬',
  },
  {
    id: 'ad-prime',
    partner: 'Prime Video',
    tagline: 'Incluído no Prime',
    headline: 'Filmes e séries sem custo extra para assinantes.',
    cta: 'Ver catálogo',
    accent: '#00a8e1',
    emoji: '▶',
  },
];

function FeedAdCard({ index }) {
  const ad = FEED_ADS[index % FEED_ADS.length];
  return (
    <article className="feed-ad-card" aria-label="Publicidade">
      <span className="feed-ad-label">Patrocinado</span>
      <div className="feed-ad-body">
        <div className="feed-ad-icon" style={{ background: `${ad.accent}22`, color: ad.accent }}>
          {ad.emoji}
        </div>
        <div className="feed-ad-copy">
          <p className="feed-ad-partner">{ad.partner} · {ad.tagline}</p>
          <p className="feed-ad-headline">{ad.headline}</p>
        </div>
      </div>
      <button type="button" className="feed-ad-cta" style={{ '--ad-accent': ad.accent }}>
        {ad.cta}
      </button>
    </article>
  );
}

const AD_INTERVAL = 7;

function Feed() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentUser, setCurrentUser] = useState(null);
  const [mode, setMode] = useState('following');
  const [feedItems, setFeedItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [friends, setFriends] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [selectedMovieDetails, setSelectedMovieDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [commentsModalPost, setCommentsModalPost] = useState(null);
  const [commentsModalItems, setCommentsModalItems] = useState([]);
  const [commentsModalLoading, setCommentsModalLoading] = useState(false);
  const [confirmUnfollowUser, setConfirmUnfollowUser] = useState(null);
  const [unfollowLoading, setUnfollowLoading] = useState(false);
  const sentinelRef = useRef(null);

  const token = useMemo(() => getStoredToken(), []);
  const highlightedPostId = searchParams.get('post');

  const feedWithAds = useMemo(() => {
    const result = [];
    feedItems.forEach((post, i) => {
      result.push({ __type: 'post', data: post });
      if ((i + 1) % AD_INTERVAL === 0) {
        result.push({ __type: 'ad', adIndex: Math.floor(i / AD_INTERVAL) });
      }
    });
    return result;
  }, [feedItems]);
  const conversationBackId = searchParams.get('conversation');

  const handleAuthError = useCallback(
    (message) => {
      if (/session|credential|authenticated|token/i.test(message || '')) {
        clearStoredToken();
        navigate('/login', { replace: true });
        return true;
      }
      return false;
    },
    [navigate]
  );

  const mergeFeedItems = useCallback((currentItems, incomingItems) => {
    const byId = new Map(currentItems.map((item) => [item.id, item]));
    incomingItems.forEach((item) => byId.set(item.id, item));
    return Array.from(byId.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || b.id - a.id
    );
  }, []);

  const loadFeed = useCallback(
    async ({ nextMode = mode, cursor = null, append = false } = {}) => {
      if (!token) {
        navigate('/login', { replace: true });
        return;
      }

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const payload = await fetchFeed(token, nextMode, cursor, 8);
        setNextCursor(payload.next_cursor || null);
        setFeedItems((current) =>
          append ? mergeFeedItems(current, payload.items || []) : payload.items || []
        );
      } catch (err) {
        if (!handleAuthError(err.message)) {
          setError(err.message || 'Falha ao carregar o feed.');
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [handleAuthError, mergeFeedItems, mode, navigate, token]
  );

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    getCurrentUser(token)
      .then((user) => {
        setCurrentUser(user);
        return fetchProfile(token);
      })
      .then((profile) => {
        setFriends(profile.following || []);
      })
      .catch((err) => {
        if (!handleAuthError(err.message)) {
          setError(err.message);
        }
      });
  }, [handleAuthError, navigate, token]);

  useEffect(() => {
    setFeedItems([]);
    setNextCursor(null);
    loadFeed({ nextMode: mode, append: false });
  }, [loadFeed, mode]);

  useEffect(() => {
    if (!token || !highlightedPostId) {
      return;
    }

    fetchFeedPost(token, highlightedPostId)
      .then((post) => {
        setFeedItems((current) => {
          const withoutPost = current.filter((item) => String(item.id) !== String(post.id));
          return [post, ...withoutPost];
        });
      })
      .catch((err) => {
        if (!handleAuthError(err.message)) {
          setError(err.message || 'Falha ao carregar o post destacado.');
        }
      });
  }, [handleAuthError, highlightedPostId, token]);

  useEffect(() => {
    if (!sentinelRef.current || !nextCursor || loading || loadingMore) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && nextCursor && !loadingMore) {
          loadFeed({ nextMode: mode, cursor: nextCursor, append: true });
        }
      },
      { rootMargin: '240px' }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadFeed, loading, loadingMore, mode, nextCursor]);

  useEffect(() => {
    const shouldLockScroll =
      Boolean(selectedMovie || selectedMovieDetails || commentsModalPost || confirmUnfollowUser);

    if (!shouldLockScroll) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedMovie, selectedMovieDetails, commentsModalPost, confirmUnfollowUser]);

  const updateSinglePost = useCallback((postId, updater) => {
    setFeedItems((current) =>
      current.map((item) => (item.id === postId ? updater(item) : item))
    );
  }, []);

  const handleToggleLike = async (postId) => {
    if (!token) {
      return;
    }

    try {
      const result = await togglePostLike(token, postId);
      updateSinglePost(postId, (item) => ({
        ...item,
        liked_by_me: result.liked,
        like_count: result.like_count,
      }));
    } catch (err) {
      if (!handleAuthError(err.message)) {
        setError(err.message || 'Falha ao curtir post.');
      }
    }
  };

  const handleToggleSave = async (postId) => {
    if (!token) {
      return;
    }

    try {
      const result = await savePost(token, postId);
      updateSinglePost(postId, (item) => ({
        ...item,
        saved_by_me: result.saved,
      }));
    } catch (err) {
      if (!handleAuthError(err.message)) {
        setError(err.message || 'Falha ao salvar post.');
      }
      throw err;
    }
  };

  const handleCommentSubmit = async (postId, content) => {
    if (!token) {
      return;
    }

    try {
      const comment = await createPostComment(token, postId, content);
      updateSinglePost(postId, (item) => ({
        ...item,
        comment_count: item.comment_count + 1,
        comments: [...(item.comments || []), comment].slice(-2),
      }));
    } catch (err) {
      if (!handleAuthError(err.message)) {
        setError(err.message || 'Falha ao comentar.');
      }
    }
  };

  const handleLoadComments = async (post) => {
    if (!token) {
      return;
    }

    try {
      setCommentsModalPost(post);
      setCommentsModalItems([]);
      setCommentsModalLoading(true);
      const comments = await fetchPostComments(token, post.id);
      updateSinglePost(post.id, (item) => ({
        ...item,
        comments,
      }));
      setCommentsModalItems(comments);
    } catch (err) {
      if (!handleAuthError(err.message)) {
        setError(err.message || 'Falha ao carregar comentarios.');
      }
    } finally {
      setCommentsModalLoading(false);
    }
  };

  const handleFollow = async (userId) => {
    if (!token) {
      return;
    }

    const targetPost = feedItems.find((item) => item.author.id === userId);
    if (targetPost?.author?.is_following) {
      setConfirmUnfollowUser(targetPost.author);
      return;
    }

    try {
      await followUser(token, userId);
      setFeedItems((current) =>
        current.map((item) =>
          item.author.id === userId
            ? { ...item, author: { ...item.author, is_following: true } }
            : item
        )
      );
      setFriends((current) => {
        if (current.some((friend) => friend.username === targetPost?.author?.username)) {
          return current;
        }
        if (!targetPost?.author) {
          return current;
        }
        return [
          ...current,
          {
            username: targetPost.author.username,
            profile_image_url: targetPost.author.profile_image_url,
          },
        ];
      });
    } catch (err) {
      if (!handleAuthError(err.message)) {
        setError(err.message || 'Falha ao seguir usuario.');
      }
    }
  };

  const handleSharePost = async (postId, friendUsername) => {
    if (!token) {
      throw new Error('Sessao invalida.');
    }

    try {
      const result = await sharePost(token, postId, friendUsername);
      updateSinglePost(postId, (item) => ({
        ...item,
        share_count: item.share_count + 1,
      }));
      return result;
    } catch (err) {
      if (!handleAuthError(err.message)) {
        setError(err.message || 'Falha ao compartilhar post.');
      }
      throw err;
    }
  };

  const handleMovieClick = async (movie) => {
    if (!token || !movie?.id) {
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

  const handleConfirmUnfollow = async () => {
    if (!token || !confirmUnfollowUser) {
      return;
    }

    setUnfollowLoading(true);
    try {
      await unfollowUser(token, confirmUnfollowUser.id);
      setFeedItems((current) =>
        current.map((item) =>
          item.author.id === confirmUnfollowUser.id
            ? { ...item, author: { ...item.author, is_following: false } }
            : item
        )
      );
      setFriends((current) =>
        current.filter((friend) => friend.username !== confirmUnfollowUser.username)
      );
      setConfirmUnfollowUser(null);
    } catch (err) {
      if (!handleAuthError(err.message)) {
        setError(err.message || 'Falha ao parar de seguir.');
      }
    } finally {
      setUnfollowLoading(false);
    }
  };

  const refreshing = usePullToRefresh(
    useCallback(() => loadFeed({ cursor: null, nextMode: mode }), [loadFeed, mode])
  );

  return (
    <div className="home-page social-feed-page">
      <PullRefreshIndicator refreshing={refreshing} />
      <HomeButton />

      {/* Header compacto */}
      <header className="feed-page-header">
        <h1 className="feed-page-title">Feed</h1>
        <button
          type="button"
          className="feed-compose-btn"
          onClick={() => navigate('/posts/new')}
          aria-label="Novo post"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      </header>

      {conversationBackId ? (
        <button
          type="button"
          className="feed-back-link"
          style={{ margin: '0 16px 8px' }}
          onClick={() => navigate(`/direct?conversation=${conversationBackId}`)}
        >
          ← Voltar para a conversa
        </button>
      ) : null}

      {/* Tabs */}
      <div className="feed-tabs">
        {FEED_MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`feed-tab${mode === item.id ? ' feed-tab--active' : ''}`}
            onClick={() => setMode(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? <p className="error" style={{ margin: '12px 16px 0' }}>{error}</p> : null}

      {loading ? (
        <div className="feed-list" style={{ padding: '16px 16px 0' }}>
          <FeedSkeleton />
          <FeedSkeleton />
          <FeedSkeleton />
        </div>
      ) : null}

      {!loading && !feedItems.length ? (
        <section className="feed-empty-state">
          {mode === 'following' ? (
            <>
              <p className="feed-empty-icon">👥</p>
              <h2>Seu feed está vazio</h2>
              <p>Siga pessoas para ver as reviews e posts delas aqui.</p>
              <button type="button" className="primary-button" onClick={() => navigate('/friends/add')}>
                Encontrar pessoas
              </button>
            </>
          ) : (
            <>
              <p className="feed-empty-icon">🎬</p>
              <h2>Nada sugerido ainda</h2>
              <p>Adicione gêneros favoritos no perfil para receber sugestões melhores.</p>
              <button type="button" className="primary-button" onClick={() => navigate('/profile')}>
                Editar gostos
              </button>
            </>
          )}
        </section>
      ) : null}

      {!loading && feedWithAds.length ? (
        <div className="feed-list" style={{ padding: '16px 16px 0' }}>
          {feedWithAds.map((item, idx) =>
            item.__type === 'ad' ? (
              <FeedAdCard key={`ad-${item.adIndex}`} index={item.adIndex} />
            ) : (
              <div
                key={item.data.id}
                className={String(item.data.id) === String(highlightedPostId) ? 'feed-highlighted-post' : ''}
              >
                <PostCard
                  post={item.data}
                  currentUserId={currentUser?.id}
                  onMovieClick={handleMovieClick}
                  onToggleLike={handleToggleLike}
                  onToggleSave={handleToggleSave}
                  onCommentSubmit={handleCommentSubmit}
                  onLoadComments={handleLoadComments}
                  onSharePost={handleSharePost}
                  shareTargets={friends}
                  onFollow={handleFollow}
                  navigate={navigate}
                />
              </div>
            )
          )}
        </div>
      ) : null}

      {!loading && nextCursor ? <div ref={sentinelRef} className="feed-sentinel" /> : null}

      {loadingMore ? (
        <div className="feed-list feed-list-more">
          <FeedSkeleton compact />
          <FeedSkeleton compact />
        </div>
      ) : null}

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
      <CommentsModal
        post={commentsModalPost}
        comments={commentsModalItems}
        loading={commentsModalLoading}
        onClose={() => {
          setCommentsModalPost(null);
          setCommentsModalItems([]);
          setCommentsModalLoading(false);
        }}
        navigate={navigate}
      />
      <ConfirmUnfollowModal
        user={confirmUnfollowUser}
        loading={unfollowLoading}
        onCancel={() => {
          if (!unfollowLoading) {
            setConfirmUnfollowUser(null);
          }
        }}
        onConfirm={handleConfirmUnfollow}
      />
    </div>
  );
}

export default Feed;
