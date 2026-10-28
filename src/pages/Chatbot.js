import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import MovieDetailsModal from '../components/MovieDetailsModal';
import {
  earnChatMessages, fetchChatStatus, fetchMovieDetails, getCurrentUser, sendChatMessage,
} from '../api';
import { clearStoredToken, getStoredToken } from '../authStorage';
import { isNativeMonetization, showRewardedAd as playNativeRewardedAd } from '../monetization';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const STORAGE_KEY = 'cinebot_conversations';
const MAX_STORED = 30;

const GREETING_MSG = {
  id: 'greeting',
  role: 'assistant',
  content:
    'Oi. Sou o CineBot — cinéfilo com opinião própria e zero paciência para lista de must-watch genérica.' +
    '\n\nPede por contexto: clima, humor, o que assistiu ontem. Quanto mais específico, melhor a indicação.' +
    '\n\nO que vai ser?',
  movies: [],
};

const SUGGESTIONS = [
  'Me recomenda algo para hoje à noite',
  'Algo no estilo Kubrick mas menos frio',
  'Thriller psicológico que não é óbvio',
  'Qual o melhor Kurosawa para começar?',
];

function makeConv() {
  return { id: Date.now().toString(), title: 'Nova conversa', messages: [GREETING_MSG], updatedAt: Date.now() };
}

function loadConvs() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function saveConvs(convs) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(convs.slice(0, MAX_STORED))); }
  catch {}
}

function convTitle(messages) {
  const first = messages.find((m) => m.role === 'user');
  if (!first) return 'Nova conversa';
  return first.content.length > 38 ? first.content.slice(0, 38) + '…' : first.content;
}

function convTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (now - d < 7 * 86400000)
    return d.toLocaleDateString('pt-BR', { weekday: 'short' });
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/* ── sub-components ──────────────────────────────────────────────────────── */

function ChatMovieCard({ movie, onOpen }) {
  return (
    <article className="chat-movie-card" onClick={() => onOpen(movie)}>
      <div className="chat-movie-poster-wrap">
        {movie.poster_path ? (
          <img src={`https://image.tmdb.org/t/p/w185${movie.poster_path}`}
            alt={movie.title} className="chat-movie-poster" loading="lazy" />
        ) : (
          <div className="chat-movie-no-poster">{movie.title}</div>
        )}
      </div>
      <div className="chat-movie-meta">
        <p className="chat-movie-title">{movie.title}</p>
        {movie.year && <p className="chat-movie-year">{movie.year}</p>}
        {movie.vote_average != null && (
          <p className="chat-movie-rating">★ {(Number(movie.vote_average) / 2).toFixed(1)}</p>
        )}
      </div>
    </article>
  );
}

const AD_DURATION = 30; // seconds

// Anúncio SIMULADO — usado só no navegador (dev). No app nativo o AdMob mostra o anúncio real.
function RewardedAdModal({ onComplete, onClose }) {
  const [timeLeft, setTimeLeft] = React.useState(AD_DURATION);
  const [canSkip, setCanSkip] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setCanSkip(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleClaim = async () => {
    setLoading(true);
    try {
      const { getStoredToken } = await import('../authStorage');
      const newStatus = await earnChatMessages(getStoredToken());
      onComplete(newStatus);
    } catch (_) {
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const progress = ((AD_DURATION - timeLeft) / AD_DURATION) * 100;

  return (
    <div className="rewarded-ad-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="rewarded-ad-modal">
        <div className="rewarded-ad-brand">
          <span className="rewarded-ad-logo">🎬</span>
          <div>
            <strong>Anúncio de demonstração</strong>
            <p>Assista e ganhe +5 mensagens</p>
          </div>
        </div>

        <div className="rewarded-ad-creative">
          <div className="rewarded-ad-visual">
            <span>✦</span>
            <p>Seu anúncio aqui</p>
            <small>No app, este espaço mostra um anúncio real</small>
          </div>
        </div>

        <div className="rewarded-ad-progress">
          <div className="rewarded-ad-bar">
            <div className="rewarded-ad-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="rewarded-ad-timer">{timeLeft > 0 ? `${timeLeft}s` : 'Pronto!'}</span>
        </div>

        {canSkip ? (
          <button
            type="button"
            className="rewarded-ad-claim"
            onClick={handleClaim}
            disabled={loading}
          >
            {loading ? 'Aguarde...' : '+ Resgatar 5 mensagens'}
          </button>
        ) : (
          <button type="button" className="rewarded-ad-cancel" onClick={onClose}>
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}

function UpgradeBanner({ remaining, dailyLimit, premiumLimit, adsRemaining, adLoading, onWatchAd, onUpgrade }) {
  const isBlocked = remaining <= 0;
  return (
    <div className={`chat-upgrade-banner${isBlocked ? ' chat-upgrade-banner--blocked' : ''}`}>
      <div className="chat-upgrade-banner-left">
        {isBlocked ? (
          <>
            <span className="chat-upgrade-icon">🎬</span>
            <div>
              <strong>Limite diário atingido</strong>
              <p>Você usou suas {dailyLimit} mensagens de hoje.</p>
            </div>
          </>
        ) : (
          <>
            <span className="chat-upgrade-icon">⚡</span>
            <div>
              <strong>{remaining} mensagem{remaining !== 1 ? 'ns' : ''} restante{remaining !== 1 ? 's' : ''} hoje</strong>
              <p>Premium: {premiumLimit} mensagens por dia e sem anúncios.</p>
            </div>
          </>
        )}
      </div>
      <div className="chat-upgrade-actions">
        {adsRemaining > 0 && (
          <button type="button" className="chat-watch-ad-btn" onClick={onWatchAd} disabled={adLoading}>
            {adLoading ? 'Carregando…' : '▶ +5 msgs'}
          </button>
        )}
        <button type="button" className="chat-upgrade-btn" onClick={onUpgrade}>
          Premium
        </button>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="chat-bubble-wrap assistant">
      <div className="chat-bubble assistant">
        <div className="chat-typing">
          <span className="chat-typing-dot" />
          <span className="chat-typing-dot" />
          <span className="chat-typing-dot" />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, onOpenMovie }) {
  const isUser = message.role === 'user';
  const lines = message.content.split('\n');
  return (
    <div className={`chat-bubble-wrap ${isUser ? 'user' : 'assistant'}`}>
      <article className={`chat-bubble ${isUser ? 'user' : 'assistant'}`}>
        <div className="chat-bubble-text">
          {lines.map((line, i) =>
            line.trim() === '' ? <br key={i} /> : <p key={i}>{line}</p>
          )}
        </div>
      </article>
      {!isUser && message.movies && message.movies.length > 0 && (
        <div className="chat-movie-row">
          {message.movies.map((m) => (
            <ChatMovieCard key={m.movie_id} movie={m} onOpen={onOpenMovie} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── page ────────────────────────────────────────────────────────────────── */

export default function Chatbot() {
  const navigate = useNavigate();
  const location = useLocation();
  const threadRef = useRef(null);
  const textareaRef = useRef(null);
  const sentInitialRef = useRef(false);

  // Compute initial state ONCE — both states must reference the same fresh conversation
  const initRef = useRef(null);
  const [conversations, setConversations] = useState(() => {
    const stored = loadConvs();
    if (stored.length) {
      initRef.current = stored[0].id;
      return stored;
    }
    const fresh = makeConv();
    initRef.current = fresh.id;
    return [fresh];
  });
  const [activeId, setActiveId] = useState(() => initRef.current);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [movieDetails, setMovieDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [chatStatus, setChatStatus] = useState(null);
  const [showRewardedAd, setShowRewardedAd] = useState(false);
  const [adLoading, setAdLoading] = useState(false);

  const isBlocked = Boolean(chatStatus && chatStatus.remaining <= 0);

  const activeConv = conversations.find((c) => c.id === activeId) || conversations[0];
  const messages = activeConv?.messages || [GREETING_MSG];

  // Keep a ref to current messages so handleSend never has a stale closure
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => { saveConvs(conversations); }, [conversations]);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) { navigate('/login', { replace: true }); return; }
    fetchChatStatus(token)
      .then(setChatStatus)
      .catch(() => {});
  }, [navigate]);

  useEffect(() => {
    if (threadRef.current)
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, loading]);

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const updateActive = useCallback((updater) => {
    setConversations((prev) => {
      const next = prev.map((c) =>
        c.id === activeId ? { ...c, ...updater(c), updatedAt: Date.now() } : c
      );
      return [...next].sort((a, b) => b.updatedAt - a.updatedAt);
    });
  }, [activeId]);

  const handleSend = useCallback(async (text) => {
    const token = getStoredToken();
    if (!token) { navigate('/login', { replace: true }); return; }
    const trimmed = String(text || '').trim();
    if (!trimmed || loading) return;

    // Block locally before hitting the server
    if (chatStatus && chatStatus.remaining <= 0) return;

    const curMessages = messagesRef.current;
    const history = curMessages
      .filter((m) => m.id !== 'greeting')
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    const userMsg = { id: Date.now().toString(), role: 'user', content: trimmed, movies: [] };
    const newMsgs = [...curMessages, userMsg];

    updateActive(() => ({ messages: newMsgs, title: convTitle(newMsgs) }));
    setInput('');
    setLoading(true);
    setError(null);

    // Optimistic decrement
    if (chatStatus) {
      setChatStatus((s) => s ? { ...s, used_today: s.used_today + 1, remaining: Math.max(0, s.remaining - 1) } : s);
    }

    try {
      const res = await sendChatMessage(token, trimmed, history);
      const botMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.message,
        movies: res.movies || [],
      };
      updateActive((c) => ({ messages: [...c.messages, botMsg] }));
    } catch (err) {
      if (/session|credential|authenticated/i.test(err.message)) {
        clearStoredToken();
        navigate('/login', { replace: true });
        return;
      }
      // Limite diário: o servidor é a fonte da verdade — recarrega o status
      if (err.code === 'chat_limit_reached') {
        fetchChatStatus(token).then(setChatStatus).catch(() => {});
        setError(null);
        return;
      }
      setError(err.message || 'Erro ao conectar com o CineBot.');
      // Rollback optimistic decrement on error
      if (chatStatus) {
        setChatStatus((s) => s ? { ...s, used_today: Math.max(0, s.used_today - 1), remaining: s.remaining + 1 } : s);
      }
    } finally {
      setLoading(false);
    }
  }, [loading, navigate, updateActive, chatStatus]);

  const handleWatchAd = useCallback(async () => {
    if (!isNativeMonetization()) {
      setShowRewardedAd(true); // navegador: anúncio simulado
      return;
    }
    const token = getStoredToken();
    if (!token || adLoading) return;
    setAdLoading(true);
    setError(null);
    try {
      const me = await getCurrentUser(token);
      const before = chatStatus?.ads_watched_today ?? 0;
      const watched = await playNativeRewardedAd(me.id);
      if (!watched) return;
      // O crédito chega pelo callback do Google ao servidor; normalmente em poucos segundos.
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const status = await fetchChatStatus(token);
        setChatStatus(status);
        if (status.ads_watched_today > before) return;
        await sleep(1500);
      }
      setError('Recompensa em confirmação. Suas mensagens aparecem em instantes.');
    } catch (_) {
      setError('Nenhum anúncio disponível agora. Tente novamente mais tarde.');
    } finally {
      setAdLoading(false);
    }
  }, [adLoading, chatStatus]);

  // Initial prompt from navigation state
  useEffect(() => {
    const prompt = location.state?.prompt;
    if (prompt && !sentInitialRef.current) {
      sentInitialRef.current = true;
      handleSend(prompt);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNewChat = useCallback(() => {
    const conv = makeConv();
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    setSidebarOpen(false);
    setInput('');
    setError(null);
    setTimeout(() => textareaRef.current?.focus(), 80);
  }, []);

  const handleSelectConv = useCallback((id) => {
    setActiveId(id);
    setSidebarOpen(false);
    setError(null);
  }, []);

  const handleDeleteConv = useCallback((e, id) => {
    e.stopPropagation();
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (id === activeId) {
        if (next.length) {
          setActiveId(next[0].id);
          return next;
        }
        const fresh = makeConv();
        setActiveId(fresh.id);
        return [fresh];
      }
      return next;
    });
  }, [activeId]);

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
      setDetailsError(err.message || 'Falha ao carregar detalhes.');
    } finally {
      setDetailsLoading(false);
    }
  }, [navigate]);

  const showSuggestions = messages.length === 1 && !loading;

  return (
    <div className="chat-page">
      {/* Dark overlay on mobile when sidebar is open */}
      {sidebarOpen && (
        <div className="chat-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Left sidebar ── */}
      <aside className={`chat-sidebar${sidebarOpen ? ' chat-sidebar--open' : ''}`}>
        <div className="chat-sidebar-header">
          <span className="chat-sidebar-title">Conversas</span>
          <button type="button" className="chat-sidebar-close"
            onClick={() => setSidebarOpen(false)} aria-label="Fechar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <button type="button" className="chat-new-conv-btn" onClick={handleNewChat}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nova conversa
        </button>

        <div className="chat-conv-list">
          {conversations.map((conv) => (
            <div key={conv.id}
              className={`chat-conv-item${conv.id === activeId ? ' active' : ''}`}
              onClick={() => handleSelectConv(conv.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleSelectConv(conv.id)}
            >
              <div className="chat-conv-body">
                <span className="chat-conv-name">{conv.title}</span>
                <span className="chat-conv-time">{convTime(conv.updatedAt)}</span>
              </div>
              <button type="button" className="chat-conv-del"
                onClick={(e) => handleDeleteConv(e, conv.id)} aria-label="Apagar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main chat ── */}
      <main className="chat-main">
        <header className="chat-header">
          <button type="button" className="chat-menu-btn"
            onClick={() => setSidebarOpen(true)} aria-label="Histórico">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className="chat-header-bot">
            <div className="chat-header-avatar">🎬</div>
            <div>
              <h1 className="chat-header-name">CineBot</h1>
              <p className="chat-header-status">
                {chatStatus
                  ? `${chatStatus.remaining} mensage${chatStatus.remaining === 1 ? 'm' : 'ns'} hoje${chatStatus.is_premium ? ' · Premium' : ''}`
                  : 'Especialista em cinema'}
              </p>
            </div>
          </div>

          <button type="button" className="chat-new-icon-btn"
            onClick={handleNewChat} aria-label="Nova conversa">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </button>
        </header>

        <section className="chat-thread" ref={threadRef}>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} onOpenMovie={handleOpenMovie} />
          ))}
          {loading && <TypingIndicator />}
          {error && <div className="chat-error">⚠ {error}</div>}
        </section>

        {showSuggestions && (
          <div className="chat-suggestions-row">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" className="chat-suggestion-pill"
                onClick={() => handleSend(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Upgrade banner — show when ≤3 remaining or blocked */}
        {chatStatus && !chatStatus.is_premium && chatStatus.remaining <= 3 && (
          <UpgradeBanner
            remaining={chatStatus.remaining}
            dailyLimit={chatStatus.daily_limit}
            premiumLimit={chatStatus.premium_daily_limit}
            adsRemaining={chatStatus.ads_remaining ?? 0}
            adLoading={adLoading}
            onWatchAd={handleWatchAd}
            onUpgrade={() => navigate('/premium')}
          />
        )}
        {chatStatus?.is_premium && isBlocked && (
          <div className="chat-error">Você usou as {chatStatus.daily_limit} mensagens Premium de hoje. Volte amanhã!</div>
        )}

        <form className="chat-composer"
          onSubmit={(e) => { e.preventDefault(); handleSend(input); }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(input);
              }
            }}
            placeholder={
              isBlocked
                ? 'Limite diário atingido'
                : 'Peça filmes por gênero, clima, elenco…'
            }
            rows={1}
            disabled={loading || isBlocked}
          />
          <button type="submit" className="chat-send-btn"
            disabled={loading || !input.trim() || isBlocked}
            aria-label="Enviar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </main>

      {showRewardedAd && (
        <RewardedAdModal
          onComplete={(newStatus) => {
            setChatStatus(newStatus);
            setShowRewardedAd(false);
          }}
          onClose={() => setShowRewardedAd(false)}
        />
      )}

      <MovieDetailsModal
        details={movieDetails || selectedMovie}
        loading={detailsLoading}
        error={detailsError}
        onOpenMovie={handleOpenMovie}
        onClose={() => { setSelectedMovie(null); setMovieDetails(null); setDetailsError(null); }}
      />
    </div>
  );
}
