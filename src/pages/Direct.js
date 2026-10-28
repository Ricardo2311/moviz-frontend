import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  createDirectConversation,
  fetchConversationMessages,
  fetchDirectConversation,
  fetchDirectConversations,
  fetchProfile,
  sendDirectMessage,
} from '../api';
import { getStoredToken } from '../authStorage';

function buildInitials(conv) {
  if (!conv) return 'DM';
  if (conv.is_group) {
    return conv.title.split(' ').filter(Boolean).slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || '').join('') || 'GR';
  }
  return conv.participants?.[0]?.username?.slice(0, 2).toUpperCase() || 'DM';
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export default function Direct() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => getStoredToken(), []);

  const [view, setView] = useState('list'); // 'list' | 'chat' | 'new'
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [following, setFollowing] = useState([]);
  const [currentUsername, setCurrentUsername] = useState('');
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [startingWith, setStartingWith] = useState('');
  const threadRef = useRef(null);
  const inputRef = useRef(null);

  const convFromQuery = searchParams.get('conversation');

  useEffect(() => {
    if (!token) { navigate('/login', { replace: true }); return; }
    Promise.all([fetchDirectConversations(token), fetchProfile(token)])
      .then(([convs, profile]) => {
        setConversations(convs);
        setFollowing(profile.following || []);
        setCurrentUsername(profile.user.username);
        if (convFromQuery) openConversation(Number(convFromQuery));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [selectedConv?.messages?.length]);

  const openConversation = useCallback(async (id) => {
    setSelectedId(id);
    setSelectedConv(null);
    setView('chat');
    try {
      const conv = await fetchDirectConversation(token, id);
      setSelectedConv(conv);
      setConversations((prev) =>
        prev.map((c) => c.id === id ? { ...c, unread_count: 0 } : c)
      );
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  const handleSend = useCallback(async (e) => {
    e.preventDefault();
    if (!message.trim() || !selectedId || sending) return;
    setSending(true);
    const text = message.trim();
    setMessage('');
    try {
      const msg = await sendDirectMessage(token, selectedId, text);
      setSelectedConv((c) => c ? { ...c, messages: [...c.messages, msg] } : c);
      const convs = await fetchDirectConversations(token);
      setConversations(convs);
    } catch (err) {
      setError(err.message);
      setMessage(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [message, selectedId, sending, token]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }, [handleSend]);

  const handleStartDirect = useCallback(async (username) => {
    setStartingWith(username);
    try {
      const conv = await createDirectConversation(token, username);
      const convs = await fetchDirectConversations(token);
      setConversations(convs);
      openConversation(conv.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setStartingWith('');
    }
  }, [token, openConversation]);

  const handleLoadOlder = useCallback(async () => {
    if (!selectedConv || loadingOlder) return;
    const oldestId = selectedConv.messages[0]?.id;
    if (!oldestId) return;
    setLoadingOlder(true);
    try {
      const data = await fetchConversationMessages(token, selectedConv.id, oldestId);
      setSelectedConv((c) => ({
        ...c,
        messages: [...data.messages, ...c.messages],
        has_more: data.has_more,
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingOlder(false);
    }
  }, [selectedConv, loadingOlder, token]);

  const filteredFollowing = useMemo(() =>
    following.filter((f) =>
      !searchQuery || f.username.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [following, searchQuery]
  );

  /* ── LISTA ──────────────────────────────────────────────────── */
  if (view === 'list') {
    return (
      <div className="dm-page">
        <header className="dm-header">
          <button className="dm-back" onClick={() => navigate('/home')} aria-label="Voltar">
            <BackIcon />
          </button>
          <h1 className="dm-header-title">Mensagens</h1>
          <button
            className="dm-new-btn"
            onClick={() => { setSearchQuery(''); setView('new'); }}
            aria-label="Nova conversa"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
          </button>
        </header>

        {error && <p className="error" style={{ padding: '10px 16px', margin: 0 }}>{error}</p>}

        {loading ? (
          <div className="dm-list">
            {[1, 2, 3, 4].map((i) => <div key={i} className="dm-conv-skeleton" />)}
          </div>
        ) : conversations.length === 0 ? (
          <div className="dm-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" width="48" height="48"
              style={{ color: 'var(--text-4)', marginBottom: 12 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p>Nenhuma conversa ainda</p>
            <button
              className="dm-empty-cta"
              onClick={() => { setSearchQuery(''); setView('new'); }}
            >
              Iniciar conversa
            </button>
          </div>
        ) : (
          <div className="dm-list">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                className="dm-conv-item"
                onClick={() => openConversation(conv.id)}
              >
                <div className="dm-avatar">{buildInitials(conv)}</div>
                <div className="dm-conv-body">
                  <div className="dm-conv-top">
                    <span className="dm-conv-name">{conv.title}</span>
                    <span className="dm-conv-time">{timeAgo(conv.updated_at)}</span>
                  </div>
                  <div className="dm-conv-bottom">
                    <span className="dm-conv-preview">{conv.last_message_preview || '—'}</span>
                    {conv.unread_count > 0 && (
                      <span className="dm-unread-badge">{conv.unread_count}</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── NOVA CONVERSA ──────────────────────────────────────────── */
  if (view === 'new') {
    return (
      <div className="dm-page">
        <header className="dm-header">
          <button className="dm-back" onClick={() => setView('list')} aria-label="Voltar">
            <BackIcon />
          </button>
          <h1 className="dm-header-title">Nova conversa</h1>
        </header>

        <div className="dm-search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" width="16" height="16"
            className="dm-search-icon">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="dm-search-input"
            type="text"
            placeholder="Buscar quem você segue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        {error && <p className="error" style={{ padding: '10px 16px', margin: 0 }}>{error}</p>}

        <div className="dm-list">
          {filteredFollowing.length === 0 ? (
            <p className="dm-empty-small">
              {following.length === 0
                ? 'Você ainda não segue ninguém.'
                : 'Nenhum resultado para a busca.'}
            </p>
          ) : (
            filteredFollowing.map((f) => (
              <button
                key={f.username}
                className="dm-conv-item"
                onClick={() => handleStartDirect(f.username)}
                disabled={!!startingWith}
              >
                <div className="dm-avatar">{f.username.slice(0, 2).toUpperCase()}</div>
                <div className="dm-conv-body">
                  <span className="dm-conv-name">@{f.username}</span>
                </div>
                {startingWith === f.username && (
                  <span style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>...</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  /* ── CHAT ───────────────────────────────────────────────────── */
  return (
    <div className="dm-page dm-page--chat">
      <header className="dm-header">
        <button className="dm-back" onClick={() => setView('list')} aria-label="Voltar">
          <BackIcon />
        </button>
        {selectedConv ? (
          <>
            <div className="dm-avatar dm-avatar--sm">{buildInitials(selectedConv)}</div>
            <div className="dm-chat-info">
              <p className="dm-chat-name">{selectedConv.title}</p>
              <p className="dm-chat-members">
                {selectedConv.participants.map((p) => `@${p.username}`).join(', ')}
              </p>
            </div>
          </>
        ) : (
          <p className="dm-header-title">Carregando...</p>
        )}
      </header>

      {error && <p className="error" style={{ padding: '8px 16px', margin: 0, flexShrink: 0 }}>{error}</p>}

      <div className="dm-thread" ref={threadRef}>
        {selectedConv?.has_more && (
          <button className="dm-load-older" onClick={handleLoadOlder} disabled={loadingOlder}>
            {loadingOlder ? 'Carregando...' : 'Ver mensagens anteriores'}
          </button>
        )}

        {!selectedConv && (
          <div className="dm-thread-loading">
            <div className="dm-bubble-skeleton" style={{ width: '60%' }} />
            <div className="dm-bubble-skeleton dm-bubble-skeleton--me" style={{ width: '45%' }} />
            <div className="dm-bubble-skeleton" style={{ width: '70%' }} />
          </div>
        )}

        {selectedConv?.messages.map((msg) => {
          const isMe = msg.sender.username === currentUsername;
          const post = msg.shared_post;
          return (
            <div key={msg.id} className={`dm-msg${isMe ? ' dm-msg--me' : ''}`}>
              {!isMe && (
                <span className="dm-msg-sender">@{msg.sender.username}</span>
              )}
              <div className={`dm-bubble${isMe ? ' dm-bubble--me' : ''}${post ? ' dm-bubble--post' : ''}`}>
                {post && (
                  <div
                    className="dm-shared-post"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/feed?post=${post.id}`)}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/feed?post=${post.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    {post.movie_poster_path && (
                      <img
                        className="dm-shared-post-img"
                        src={`https://image.tmdb.org/t/p/w92${post.movie_poster_path}`}
                        alt={post.movie_title || ''}
                      />
                    )}
                    <div className="dm-shared-post-info">
                      {post.movie_title && (
                        <p className="dm-shared-post-movie">{post.movie_title}</p>
                      )}
                      {post.rating != null && (
                        <p className="dm-shared-post-rating">★ {post.rating}</p>
                      )}
                      {post.text_content && (
                        <p className="dm-shared-post-text">{post.text_content}</p>
                      )}
                      <p className="dm-shared-post-author">@{post.author?.username}</p>
                    </div>
                  </div>
                )}
                {msg.content && <p className={post ? 'dm-bubble-caption' : ''}>{msg.content}</p>}
                {!msg.content && !post && <p style={{ opacity: 0.5, fontStyle: 'italic', fontSize: '0.8rem' }}>Mensagem</p>}
              </div>
              <span className="dm-msg-time">{timeAgo(msg.created_at)}</span>
            </div>
          );
        })}
      </div>

      <form className="dm-composer" onSubmit={handleSend}>
        <input
          ref={inputRef}
          className="dm-composer-input"
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Mensagem..."
          disabled={sending || !selectedConv}
          autoComplete="off"
        />
        <button
          type="submit"
          className="dm-send-btn"
          disabled={sending || !message.trim() || !selectedConv}
          aria-label="Enviar"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
}
