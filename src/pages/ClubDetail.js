import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import HomeButton from '../components/HomeButton';
import RichText from '../components/RichText';
import {
  approveClubJoinRequest,
  cancelClubJoinRequest,
  createPostComment,
  fetchClubDetail,
  fetchClubPostReports,
  fetchClubPosts,
  fetchPostComments,
  fetchProfile,
  getCurrentUser,
  joinClub,
  leaveClub,
  rejectClubJoinRequest,
  removeClubMember,
  removeClubPost,
  reportClubPost,
  savePost,
  sharePost,
  togglePostLike,
  updateClubMemberRole,
} from '../api';
import { clearStoredToken, getStoredToken } from '../authStorage';

function ConfirmModal({ open, title, description, confirmLabel, onCancel, onConfirm, loading }) {
  if (!open) {
    return null;
  }

  return (
    <div className="feed-modal-overlay" onClick={onCancel} role="presentation">
      <div
        className="feed-modal feed-confirm-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button type="button" className="feed-modal-close" onClick={onCancel}>
          x
        </button>
        <p className="eyebrow">Confirmacao</p>
        <h2>{title}</h2>
        <p className="feed-confirm-copy">{description}</p>
        <div className="feed-confirm-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Voltar
          </button>
          <button type="button" className="primary-button" onClick={onConfirm} disabled={loading}>
            {loading ? 'Processando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

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

function ClubHeroCover({ imageUrl, name }) {
  const [hasError, setHasError] = useState(false);
  return (
    <div
      className="cd-cover"
      style={{ width:'100%', maxHeight:300, overflow:'hidden', flexShrink:0, background:'var(--bg-2)' }}
    >
      {imageUrl && !hasError ? (
        <img
          src={imageUrl}
          alt={name}
          onError={() => setHasError(true)}
          style={{ display:'block', width:'100%', height:'auto' }}
        />
      ) : (
        <div className="cd-cover-fallback">
          <span>{name?.slice(0, 1).toUpperCase()}</span>
        </div>
      )}
    </div>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ClubPostCard({
  post,
  canInteract,
  canModerate,
  canReport,
  shareTargets,
  navigate,
  onToggleLike,
  onToggleSave,
  onCommentSubmit,
  onLoadComments,
  onSharePost,
  onRemovePost,
  onReportPost,
}) {
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [shareUsername, setShareUsername] = useState('');
  const [shareFeedback, setShareFeedback] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [shareSearch, setShareSearch] = useState('');
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportFeedback, setReportFeedback] = useState('');
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);

  return (
    <article className="feed-card club-detail-post-card">
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
            <strong>@{post.author.username}</strong>
            <span>{formatRelativeDate(post.created_at)}</span>
          </div>
        </button>
        {canModerate ? (
          <div className="profile-list-actions club-post-actions">
            <button
              type="button"
              className="ghost-button list-detail-menu-trigger"
              onClick={() => setMenuOpen((current) => !current)}
              aria-label="Abrir acoes do post"
            >
              ...
            </button>
            {menuOpen ? (
              <div className="profile-list-menu club-post-menu">
                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    setMenuOpen(false);
                    onRemovePost(post);
                  }}
                >
                  Remover post
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {(post.movie_poster_path || post.movie_title) ? (
        <div className="feed-movie-hero">
          <div className="feed-poster-button">
            {post.movie_poster_path ? (
              <img
                src={`https://image.tmdb.org/t/p/w500${post.movie_poster_path}`}
                alt={post.movie_title || 'Filme'}
                className="feed-poster"
              />
            ) : (
              <div className="feed-poster feed-poster-fallback">Post</div>
            )}
          </div>
          <div className="feed-movie-copy">
            <div className="feed-movie-meta">
              <span className="feed-post-type">clube</span>
              {post.sentiment ? <span className="feed-sentiment">{post.sentiment}</span> : null}
            </div>
            <h2>{post.movie_title || 'Discussao do clube'}</h2>
          </div>
        </div>
      ) : null}

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
        </div>
      )}

      <div className="feed-actions">
        {/* Curtir */}
        <button
          type="button"
          className={`feed-act-btn${post.liked_by_me ? ' feed-act-btn--liked' : ''}`}
          onClick={() => onToggleLike(post.id)}
          disabled={!canInteract}
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
          disabled={!canInteract}
        >
          <svg width="19" height="19" viewBox="0 0 24 24"
            fill={post.saved_by_me ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
        {/* Compartilhar */}
        {canInteract && shareTargets.length > 0 && (
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
      {shareOpen && canInteract && shareTargets.length > 0 ? (
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

      {canReport ? (
        <div className="club-post-report-area">
          {!reportOpen && !reportFeedback ? (
            <button
              type="button"
              className="club-post-report-btn"
              onClick={() => setReportOpen(true)}
            >
              Reportar
            </button>
          ) : null}
          {reportOpen ? (
            <form
              className="club-post-report-form"
              onSubmit={async (event) => {
                event.preventDefault();
                const trimmed = reportReason.trim();
                if (!trimmed || reportSubmitting) return;
                setReportSubmitting(true);
                try {
                  const result = await onReportPost(post.id, trimmed);
                  setReportFeedback(result.message || 'Reportado com sucesso.');
                  setReportOpen(false);
                  setReportReason('');
                } catch (err) {
                  setReportFeedback(err.message || 'Falha ao reportar.');
                  setReportOpen(false);
                } finally {
                  setReportSubmitting(false);
                }
              }}
            >
              <textarea
                className="club-post-report-textarea"
                placeholder="Descreva o motivo do reporte..."
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                rows={3}
                maxLength={500}
              />
              <div className="club-post-report-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => { setReportOpen(false); setReportReason(''); }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={!reportReason.trim() || reportSubmitting}
                >
                  {reportSubmitting ? 'Enviando...' : 'Enviar reporte'}
                </button>
              </div>
            </form>
          ) : null}
          {reportFeedback ? (
            <p className="club-post-report-feedback">{reportFeedback}</p>
          ) : null}
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
                {post.comment_count > (post.comments?.length || 0) ? (
                  <button
                    type="button"
                    className="feed-view-comments"
                    onClick={() => onLoadComments(post.id)}
                  >
                    Ver todos os comentários
                  </button>
                ) : null}
              </>
            ) : (
              <p className="feed-comment-empty">Ainda não há comentários neste post.</p>
            )}
          </div>

          {canInteract ? (
            <form
              className="feed-comment-form"
              onSubmit={async (event) => {
                event.preventDefault();
                const trimmed = comment.trim();
                if (!trimmed || submitting) return;
                setSubmitting(true);
                try {
                  await onCommentSubmit(post.id, trimmed);
                  setComment('');
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              <input
                type="text"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
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
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function ClubDetail() {
  const navigate = useNavigate();
  const { clubId } = useParams();
  const token = useMemo(() => getStoredToken(), []);
  const [currentUser, setCurrentUser] = useState(null);
  const [shareTargets, setShareTargets] = useState([]);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState('');
  const [activeTab, setActiveTab] = useState('posts');
  const [confirmCancelPending, setConfirmCancelPending] = useState(false);
  const [postToRemove, setPostToRemove] = useState(null);
  const [reports, setReports] = useState(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [postsNextCursor, setPostsNextCursor] = useState(null);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);

  const loadClub = useCallback(async () => {
    const payload = await fetchClubDetail(token, clubId);
    setDetail(payload);
    setPostsNextCursor(payload.posts_next_cursor || null);
  }, [clubId, token]);

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    setLoading(true);
    Promise.all([getCurrentUser(token), fetchProfile(token), fetchClubDetail(token, clubId)])
      .then(([user, profile, clubDetail]) => {
        setCurrentUser(user);
        setShareTargets(profile.following || []);
        setDetail(clubDetail);
        setPostsNextCursor(clubDetail.posts_next_cursor || null);
      })
      .catch((err) => {
        if (/session|credential|authenticated|token/i.test(err.message || '')) {
          clearStoredToken();
          navigate('/login', { replace: true });
          return;
        }
        setError(err.message || 'Falha ao carregar o clube.');
      })
      .finally(() => setLoading(false));
  }, [clubId, navigate, token]);

  const updatePostInState = useCallback((postId, updater) => {
    setDetail((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        posts: current.posts.map((post) => (post.id === postId ? updater(post) : post)),
      };
    });
  }, []);

  const handleJoin = async () => {
    setBusyKey('join');
    setFeedback('');
    setError('');
    try {
      const response = await joinClub(token, clubId);
      setFeedback(response.message);
      await loadClub();
    } catch (err) {
      setError(err.message || 'Falha ao entrar no clube.');
    } finally {
      setBusyKey('');
    }
  };

  const handleCancelPendingRequest = async () => {
    setBusyKey('cancel-request');
    setFeedback('');
    setError('');
    try {
      const response = await cancelClubJoinRequest(token, clubId);
      setFeedback(response.message);
      setConfirmCancelPending(false);
      await loadClub();
    } catch (err) {
      setError(err.message || 'Falha ao cancelar solicitacao.');
    } finally {
      setBusyKey('');
    }
  };

  const handleLeave = async () => {
    setBusyKey('leave');
    setFeedback('');
    setError('');
    try {
      const response = await leaveClub(token, clubId);
      setFeedback(response.message);
      await loadClub();
    } catch (err) {
      setError(err.message || 'Falha ao sair do clube.');
    } finally {
      setBusyKey('');
    }
  };

  const handleRequestDecision = async (requestId, approve) => {
    setBusyKey(`request-${requestId}`);
    setFeedback('');
    setError('');
    try {
      const response = approve
        ? await approveClubJoinRequest(token, clubId, requestId)
        : await rejectClubJoinRequest(token, clubId, requestId);
      setFeedback(response.message);
      await loadClub();
    } catch (err) {
      setError(err.message || 'Falha ao atualizar solicitacao.');
    } finally {
      setBusyKey('');
    }
  };

  const handleRoleToggle = async (member) => {
    setBusyKey(`role-${member.id}`);
    setFeedback('');
    setError('');
    try {
      const nextRole = member.role === 'admin' ? 'member' : 'admin';
      const response = await updateClubMemberRole(token, clubId, member.id, nextRole);
      setFeedback(response.message);
      await loadClub();
    } catch (err) {
      setError(err.message || 'Falha ao atualizar cargo.');
    } finally {
      setBusyKey('');
    }
  };

  const handleRemoveMember = async (member) => {
    setBusyKey(`remove-${member.id}`);
    setFeedback('');
    setError('');
    try {
      const response = await removeClubMember(token, clubId, member.id);
      setFeedback(response.message);
      await loadClub();
    } catch (err) {
      setError(err.message || 'Falha ao remover membro.');
    } finally {
      setBusyKey('');
    }
  };

  const handleToggleLike = async (postId) => {
    try {
      const result = await togglePostLike(token, postId);
      updatePostInState(postId, (post) => ({
        ...post,
        liked_by_me: result.liked,
        like_count: result.like_count,
      }));
    } catch (err) {
      setError(err.message || 'Falha ao curtir post.');
    }
  };

  const handleToggleSave = async (postId) => {
    try {
      const result = await savePost(token, postId);
      updatePostInState(postId, (post) => ({
        ...post,
        saved_by_me: result.saved,
      }));
    } catch (err) {
      setError(err.message || 'Falha ao salvar post.');
    }
  };

  const handleCommentSubmit = async (postId, content) => {
    try {
      const comment = await createPostComment(token, postId, content);
      updatePostInState(postId, (post) => ({
        ...post,
        comment_count: post.comment_count + 1,
        comments: [...(post.comments || []), comment].slice(-4),
      }));
    } catch (err) {
      setError(err.message || 'Falha ao comentar.');
      throw err;
    }
  };

  const handleLoadComments = async (postId) => {
    try {
      const comments = await fetchPostComments(token, postId);
      updatePostInState(postId, (post) => ({
        ...post,
        comments,
      }));
    } catch (err) {
      setError(err.message || 'Falha ao carregar comentarios.');
    }
  };

  const handleSharePost = async (postId, username) => {
    const result = await sharePost(token, postId, username);
    updatePostInState(postId, (post) => ({
      ...post,
      share_count: post.share_count + 1,
    }));
    return result;
  };

  const handleRemoveClubPost = async () => {
    if (!postToRemove) {
      return;
    }
    setBusyKey(`remove-post-${postToRemove.id}`);
    setFeedback('');
    setError('');
    try {
      const response = await removeClubPost(token, clubId, postToRemove.id);
      setFeedback(response.message);
      setPostToRemove(null);
      await loadClub();
      if (reports !== null) {
        setReports((current) => current ? current.filter((r) => r.post_id !== postToRemove.id) : current);
      }
    } catch (err) {
      setError(err.message || 'Falha ao remover post do clube.');
    } finally {
      setBusyKey('');
    }
  };

  const handleReportPost = async (postId, reason) => {
    return reportClubPost(token, clubId, postId, reason);
  };

  const loadMorePosts = async () => {
    if (!postsNextCursor || loadingMorePosts) return;
    setLoadingMorePosts(true);
    try {
      const data = await fetchClubPosts(token, clubId, postsNextCursor);
      setDetail((current) => ({
        ...current,
        posts: [...(current.posts || []), ...(data.items || [])],
      }));
      setPostsNextCursor(data.next_cursor || null);
    } catch (err) {
      setError(err.message || 'Falha ao carregar mais posts.');
    } finally {
      setLoadingMorePosts(false);
    }
  };

  const handleLoadReports = async () => {
    setReportsLoading(true);
    try {
      const data = await fetchClubPostReports(token, clubId);
      setReports(data);
    } catch (err) {
      setError(err.message || 'Falha ao carregar denuncias.');
    } finally {
      setReportsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="cd-page">
        <header className="cd-header">
          <button className="dm-back" onClick={() => navigate('/clubs')} aria-label="Voltar"><BackIcon /></button>
          <span className="cd-header-title" style={{ color: 'var(--text-3)' }}>Carregando...</span>
        </header>
        <div className="cd-cover cd-cover--skeleton" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="cd-page">
        <header className="cd-header">
          <button className="dm-back" onClick={() => navigate('/clubs')} aria-label="Voltar"><BackIcon /></button>
        </header>
        <p className="error" style={{ padding: 16 }}>{error || 'Clube não encontrado.'}</p>
      </div>
    );
  }

  const {
    club,
    is_member: isMember,
    can_view_full_content: canViewFullContent,
    can_manage: canManage,
    pending_requests: pendingRequests,
    members,
    challenges,
    ranking,
    posts,
  } = detail;

  const tabs = [
    { id: 'posts', label: 'Posts' },
    { id: 'members', label: 'Membros' },
    { id: 'challenges', label: 'Desafios' },
    { id: 'ranking', label: 'Ranking' },
    ...(canManage ? [{ id: 'reports', label: 'Denúncias' }] : []),
  ];

  return (
    <div className="cd-page">
      {/* ── Sticky header ── */}
      <header className="cd-header" style={{ display:'flex', flexDirection:'row', alignItems:'center', gap:8 }}>
        <button className="dm-back" onClick={() => navigate('/clubs')} aria-label="Voltar" style={{ flexShrink:0 }}>
          <BackIcon />
        </button>
        <h1 className="cd-header-title" style={{ flex:1, margin:0, fontSize:'1rem', fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {club.name}
        </h1>
        {isMember && (
          <button
            className="clubs2-create-btn"
            onClick={() => navigate(`/clubs/${club.id}/posts/new`)}
            aria-label="Criar post"
            style={{ flexShrink:0 }}
          >
            <PlusIcon />
          </button>
        )}
      </header>

      {/* ── Cover ── */}
      <ClubHeroCover imageUrl={club.cover_image_url} name={club.name} />

      {/* ── Club info ── */}
      <div className="cd-info">
        <div className="cd-info-meta">
          <span className={`clubs2-pill${club.is_private ? ' clubs2-pill--private' : ''}`}>
            {club.is_private ? 'Privado' : 'Aberto'}
          </span>
          <span className="cd-meta-stat">{club.member_count} membros</span>
          <span className="cd-meta-stat">@{club.creator.username}</span>
        </div>

        {(club.description || club.short_description) && (
          <p className="cd-desc">{club.description || club.short_description}</p>
        )}

        {club.genres?.length > 0 && (
          <div className="cd-genres">
            {club.genres.map((g) => <span key={g}>{g}</span>)}
          </div>
        )}

        {/* Join / leave actions */}
        {!isMember && (
          <button
            className="cd-join-btn"
            disabled={busyKey === 'join' || busyKey === 'cancel-request'}
            onClick={club.pending_request_by_me ? () => setConfirmCancelPending(true) : handleJoin}
          >
            {club.pending_request_by_me
              ? 'Solicitação pendente'
              : club.is_private ? 'Solicitar entrada'
              : busyKey === 'join' ? 'Entrando...' : 'Entrar no clube'}
          </button>
        )}
        {isMember && detail.current_user_role !== 'owner' && (
          <button className="cd-leave-btn" onClick={handleLeave} disabled={busyKey === 'leave'}>
            {busyKey === 'leave' ? 'Saindo...' : 'Sair do clube'}
          </button>
        )}
      </div>

      {feedback && <p className="clubs2-feedback">{feedback}</p>}
      {error && <p className="error" style={{ padding: '8px 16px', margin: 0 }}>{error}</p>}

      {/* ── Tabs ── */}
      <div className="cd-tabs-wrap">
        <div className="cd-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`cd-tab${activeTab === tab.id ? ' cd-tab--active' : ''}`}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'reports' && reports === null) handleLoadReports();
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <section className="cd-content">

        {activeTab === 'posts' ? (
          <div className="club-detail-posts">
            {!canViewFullContent ? (
              <div className="clubs-empty-state">
                <p>Os posts ficam visiveis depois que sua entrada no clube for aprovada.</p>
              </div>
            ) : !posts.length ? (
              <div className="clubs-empty-state">
                <p>Esse clube ainda nao tem posts.</p>
              </div>
            ) : (
              posts.map((post) => (
                <ClubPostCard
                  key={post.id}
                  post={post}
                  canInteract={isMember}
                  canModerate={Boolean(canManage || currentUser?.id === post.author.id)}
                  canReport={Boolean(isMember && currentUser?.id !== post.author.id)}
                  shareTargets={shareTargets}
                  navigate={navigate}
                  onToggleLike={handleToggleLike}
                  onToggleSave={handleToggleSave}
                  onCommentSubmit={handleCommentSubmit}
                  onLoadComments={handleLoadComments}
                  onSharePost={handleSharePost}
                  onRemovePost={setPostToRemove}
                  onReportPost={handleReportPost}
                />
              ))
            )}
            {postsNextCursor ? (
              <div className="club-load-more">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={loadMorePosts}
                  disabled={loadingMorePosts}
                >
                  {loadingMorePosts ? 'Carregando...' : 'Carregar mais posts'}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'members' ? (
          <div className="club-detail-grid">
            <div className="club-members-grid">
              {members.map((member) => (
                <article key={member.id} className="club-member-card">
                  <div className="club-member-head">
                    <button
                      type="button"
                      className="feed-author"
                      onClick={() => navigate(`/users/${member.username}`)}
                    >
                      {member.profile_image_url ? (
                        <img src={member.profile_image_url} alt={member.username} />
                      ) : (
                        <div className="feed-avatar-fallback">{member.username.slice(0, 1)}</div>
                      )}
                      <div>
                        <strong>@{member.username}</strong>
                        <span>{member.role}</span>
                      </div>
                    </button>
                  </div>
                  <p>Entrou em {new Date(member.joined_at).toLocaleDateString('pt-BR')}</p>
                  {canManage && member.role !== 'owner' && member.id !== currentUser?.id ? (
                    <div className="club-member-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => handleRoleToggle(member)}
                        disabled={busyKey === `role-${member.id}`}
                      >
                        {member.role === 'admin' ? 'Remover admin' : 'Tornar admin'}
                      </button>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => handleRemoveMember(member)}
                        disabled={busyKey === `remove-${member.id}`}
                      >
                        Expulsar membro
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>

            {canManage ? (
              <div className="club-manage-panel">
                <div className="clubs-section-header compact">
                  <div>
                    <p className="eyebrow">Solicitacoes</p>
                    <h3>Pendentes para o lider</h3>
                  </div>
                </div>
                {!pendingRequests.length ? (
                  <p className="helper-copy">Nao ha solicitacoes pendentes no momento.</p>
                ) : (
                  pendingRequests.map((request) => (
                    <div key={request.id} className="club-request-card">
                      <div>
                        <strong>@{request.requester.username}</strong>
                        <p>Pedido em {new Date(request.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="club-member-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => handleRequestDecision(request.id, false)}
                          disabled={busyKey === `request-${request.id}`}
                        >
                          Recusar
                        </button>
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => handleRequestDecision(request.id, true)}
                          disabled={busyKey === `request-${request.id}`}
                        >
                          Aprovar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'challenges' ? (
          <div className="club-challenges-grid">
            {!canViewFullContent ? (
              <div className="clubs-empty-state">
                <p>Os desafios aparecem depois que voce entrar no clube.</p>
              </div>
            ) : challenges.map((challenge) => {
              const percent = challenge.target_value
                ? Math.min(100, Math.round((challenge.progress_value / challenge.target_value) * 100))
                : 0;
              return (
                <article key={challenge.id} className="club-challenge-card">
                  <div className="club-card-topline">
                    <span className={`visibility-pill ${challenge.completed ? 'public' : 'private'}`}>
                      {challenge.completed ? 'Concluido' : 'Em progresso'}
                    </span>
                    <span>{challenge.participant_count} participante(s)</span>
                  </div>
                  <h3>{challenge.title}</h3>
                  <p>{challenge.description}</p>
                  <strong>Insignia: {challenge.badge_name}</strong>
                  <div className="club-progress-bar">
                    <span style={{ width: `${percent}%` }} />
                  </div>
                  <p>
                    {challenge.progress_value}/{challenge.target_value}
                  </p>
                </article>
              );
            })}
          </div>
        ) : null}

        {activeTab === 'ranking' ? (
          <div className="club-ranking-list">
            {!canViewFullContent ? (
              <div className="clubs-empty-state">
                <p>O ranking do clube fica disponivel depois da aprovacao da sua entrada.</p>
              </div>
            ) : ranking.map((entry) => (
              <article key={entry.user.id} className="club-ranking-card">
                <div className="club-ranking-rank">#{entry.rank}</div>
                <div className="club-ranking-main">
                  <strong>@{entry.user.username}</strong>
                  <span>{entry.role}</span>
                </div>
                <div className="club-ranking-metrics">
                  <span>{entry.badge_count} insignia(s)</span>
                  <span>{entry.score} pontos</span>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {activeTab === 'reports' && canManage ? (
          <div className="club-reports-panel">
            <div className="clubs-section-header compact">
              <div>
                <p className="eyebrow">Moderacao</p>
                <h3>Denuncias de posts</h3>
              </div>
              <button type="button" className="secondary-button" onClick={handleLoadReports} disabled={reportsLoading}>
                {reportsLoading ? 'Atualizando...' : 'Atualizar'}
              </button>
            </div>
            {reportsLoading && reports === null ? (
              <p className="loading-copy">Carregando denuncias...</p>
            ) : reports && reports.length === 0 ? (
              <p className="helper-copy">Nenhuma denuncia registrada neste clube.</p>
            ) : reports ? (
              <div className="club-reports-list">
                {reports.map((report) => (
                  <article key={report.id} className="club-report-card">
                    <div className="club-report-meta">
                      <span className="club-report-reporter">
                        Denunciado por <strong>@{report.reporter.username}</strong>
                      </span>
                      <span className="club-report-date">
                        {new Date(report.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <p className="club-report-reason">&ldquo;{report.reason}&rdquo;</p>
                    {report.post ? (
                      <div className="club-report-post-preview">
                        <span className="club-report-post-author">
                          Post de <strong>@{report.post.author?.username || 'usuario desconhecido'}</strong>
                          {report.post.movie_title ? ` sobre ${report.post.movie_title}` : ''}
                        </span>
                        {report.post.text_content ? (
                          <p className="club-report-post-text">{report.post.text_content.slice(0, 140)}{report.post.text_content.length > 140 ? '...' : ''}</p>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="club-report-actions">
                      <button
                        type="button"
                        className="primary-button danger"
                        onClick={() => setPostToRemove({ id: report.post_id, author: report.post?.author || { username: 'usuario' } })}
                        disabled={Boolean(busyKey)}
                      >
                        Remover post
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>{/* cd-content */}

      <ConfirmModal
        open={confirmCancelPending}
        title="Cancelar solicitacao pendente?"
        description="Se voce cancelar agora, o pedido de entrada sera removido e o lider do clube nao podera mais aprova-lo."
        confirmLabel="Cancelar solicitacao"
        onCancel={() => setConfirmCancelPending(false)}
        onConfirm={handleCancelPendingRequest}
        loading={busyKey === 'cancel-request'}
      />

      <ConfirmModal
        open={Boolean(postToRemove)}
        title="Remover post do clube?"
        description={
          postToRemove
            ? `O post de @${postToRemove.author.username} sera removido deste clube.`
            : ''
        }
        confirmLabel="Remover post"
        onCancel={() => setPostToRemove(null)}
        onConfirm={handleRemoveClubPost}
        loading={postToRemove ? busyKey === `remove-post-${postToRemove.id}` : false}
      />
    </div>
  );
}

export default ClubDetail;
