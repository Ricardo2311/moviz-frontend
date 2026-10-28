import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  createClubPost,
  fetchClubDetail,
  getCurrentUser,
  searchMovies,
  suggestHashtags,
  suggestMentions,
} from '../api';
import { clearStoredToken, getStoredToken } from '../authStorage';

const POST_TEXT_LIMIT = 420;

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function FilmIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <rect x="2" y="2" width="20" height="20" rx="2" ry="2" />
      <line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" />
      <line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="17" x2="22" y2="17" />
      <line x1="17" y1="7" x2="22" y2="7" />
    </svg>
  );
}

function CreateClubPost() {
  const navigate = useNavigate();
  const { clubId } = useParams();
  const token = useMemo(() => getStoredToken(), []);
  const textareaRef = useRef(null);

  const [club, setClub] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [movieQuery, setMovieQuery] = useState('');
  const [movieResults, setMovieResults] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [textContent, setTextContent] = useState('');
  const [sentiment, setSentiment] = useState('');
  const [hashtagQuery, setHashtagQuery] = useState('');
  const [hashtagSuggestions, setHashtagSuggestions] = useState([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [searchingMovies, setSearchingMovies] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    Promise.all([getCurrentUser(token), fetchClubDetail(token, clubId)])
      .then(([user, detail]) => {
        setCurrentUser(user);
        setClub(detail.club);
      })
      .catch((err) => {
        clearStoredToken();
        navigate('/login', { replace: true, state: { error: err.message } });
      });
  }, [clubId, navigate, token]);

  useEffect(() => {
    if (!token || !movieQuery.trim()) {
      setMovieResults([]);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setSearchingMovies(true);
      searchMovies(token, movieQuery.trim())
        .then((results) => setMovieResults(results || []))
        .catch((err) => setPageError(err.message || 'Falha ao buscar filmes.'))
        .finally(() => setSearchingMovies(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [movieQuery, token]);

  useEffect(() => {
    if (!token || !hashtagQuery) { setHashtagSuggestions([]); return undefined; }
    const timer = window.setTimeout(() => {
      suggestHashtags(token, hashtagQuery)
        .then((results) => setHashtagSuggestions(results || []))
        .catch(() => setHashtagSuggestions([]));
    }, 150);
    return () => window.clearTimeout(timer);
  }, [hashtagQuery, token]);

  useEffect(() => {
    if (!token || !mentionQuery) { setMentionSuggestions([]); return undefined; }
    const timer = window.setTimeout(() => {
      suggestMentions(token, mentionQuery)
        .then((results) => setMentionSuggestions(results || []))
        .catch(() => setMentionSuggestions([]));
    }, 150);
    return () => window.clearTimeout(timer);
  }, [mentionQuery, token]);

  const handleTextChange = (event) => {
    const nextValue = event.target.value.slice(0, POST_TEXT_LIMIT);
    setTextContent(nextValue);
    setPageError('');
    const cursorPosition = event.target.selectionStart || nextValue.length;
    const textBeforeCursor = nextValue.slice(0, cursorPosition);
    setHashtagQuery((textBeforeCursor.match(/(?:^|\s)#([A-Za-z0-9_]*)$/) || [])[1] || '');
    setMentionQuery((textBeforeCursor.match(/(?:^|\s)@([A-Za-z0-9_]*)$/) || [])[1] || '');
  };

  const replaceActiveToken = (pattern, replacement) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursorPosition = textarea.selectionStart || textContent.length;
    const before = textContent.slice(0, cursorPosition).replace(pattern, replacement);
    const nextValue = `${before}${textContent.slice(cursorPosition)}`;
    setTextContent(nextValue);
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(before.length, before.length);
    });
  };

  const handleSubmit = async (event) => {
    if (event && event.preventDefault) event.preventDefault();
    if (!token || !selectedMovie || !textContent.trim() || saving) return;
    setSaving(true);
    setPageError('');
    try {
      await createClubPost(token, clubId, {
        movie_id: selectedMovie.id,
        movie_title: selectedMovie.title,
        movie_poster_path: selectedMovie.poster_path,
        movie_release_date: selectedMovie.release_date,
        text_content: textContent.trim(),
        sentiment,
      });
      navigate(`/clubs/${clubId}`);
    } catch (err) {
      setPageError(err.message || 'Falha ao publicar no clube.');
    } finally {
      setSaving(false);
    }
  };

  const canPublish = Boolean(selectedMovie && textContent.trim() && !saving);
  const charsLeft = POST_TEXT_LIMIT - textContent.length;
  const charPct = Math.min(100, (textContent.length / POST_TEXT_LIMIT) * 100);
  const charColor = charPct > 90 ? 'var(--danger, #ef4444)' : charPct > 70 ? '#f59e0b' : 'var(--brand)';
  const initials = currentUser?.username?.slice(0, 2).toUpperCase() || '??';

  return (
    <div className="ccp-page">
      {/* ── Header ── */}
      <header className="ccp-header">
        <button className="dm-back" onClick={() => navigate(`/clubs/${clubId}`)} aria-label="Voltar">
          <BackIcon />
        </button>
        <div className="ccp-header-center">
          <p className="ccp-header-sub">Novo post em</p>
          <p className="ccp-header-club">{club?.name || '...'}</p>
        </div>
        <button
          className="ccp-publish-btn"
          disabled={!canPublish}
          onClick={handleSubmit}
        >
          {saving ? '···' : 'Publicar'}
        </button>
      </header>

      <div className="ccp-body">
        {/* User row */}
        <div className="ccp-user-row">
          <div className="ccp-avatar">{initials}</div>
          <span className="ccp-username">@{currentUser?.username || '...'}</span>
        </div>

        {/* Movie picker */}
        {!selectedMovie ? (
          <div className="ccp-movie-search">
            <span className="ccp-movie-search-icon"><FilmIcon /></span>
            <input
              type="text"
              className="ccp-movie-input"
              placeholder="Buscar filme..."
              value={movieQuery}
              onChange={(e) => setMovieQuery(e.target.value)}
              autoComplete="off"
            />
            {searchingMovies && <span className="ccp-searching">···</span>}
          </div>
        ) : (
          <div className="ccp-movie-selected">
            {selectedMovie.poster_path && (
              <img
                className="ccp-movie-poster"
                src={`https://image.tmdb.org/t/p/w92${selectedMovie.poster_path}`}
                alt={selectedMovie.title}
              />
            )}
            <div className="ccp-movie-info">
              <p className="ccp-movie-title">{selectedMovie.title}</p>
              {selectedMovie.release_date && (
                <p className="ccp-movie-year">{selectedMovie.release_date.slice(0, 4)}</p>
              )}
            </div>
            <button className="ccp-movie-clear" onClick={() => setSelectedMovie(null)} aria-label="Remover filme">
              ×
            </button>
          </div>
        )}

        {/* Movie results */}
        {movieResults.length > 0 && movieQuery.trim() && (
          <div className="ccp-movie-results">
            {movieResults.map((movie) => (
              <button
                key={movie.id}
                type="button"
                className="ccp-movie-result-item"
                onClick={() => { setSelectedMovie(movie); setMovieQuery(''); setMovieResults([]); }}
              >
                {movie.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                    alt={movie.title}
                  />
                ) : (
                  <div className="ccp-movie-result-placeholder"><FilmIcon /></div>
                )}
                <div>
                  <p className="ccp-movie-title">{movie.title}</p>
                  <p className="ccp-movie-year">{movie.release_date?.slice(0, 4)}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Sentiment */}
        <div className="ccp-sentiment-wrap">
          <span className="ccp-sentiment-icon">✨</span>
          <input
            type="text"
            className="ccp-sentiment-input"
            placeholder="Ex: nostálgico, hypado, tenso..."
            value={sentiment}
            onChange={(e) => setSentiment(e.target.value)}
            maxLength={60}
          />
        </div>

        <div className="ccp-divider" />

        {/* Text area */}
        <textarea
          ref={textareaRef}
          className="ccp-textarea"
          rows={7}
          placeholder="Escreva sobre o filme, a discussão do clube… use #hashtags e @menções"
          value={textContent}
          onChange={handleTextChange}
        />

        {/* Character counter bar */}
        <div className="ccp-char-row">
          <div className="ccp-char-bar">
            <div
              className="ccp-char-fill"
              style={{ width: `${charPct}%`, background: charColor }}
            />
          </div>
          <span className="ccp-char-count" style={{ color: charColor }}>
            {charsLeft}
          </span>
        </div>

        {/* Hashtag suggestions */}
        {hashtagSuggestions.length > 0 && (
          <div className="ccp-suggestions">
            {hashtagSuggestions.map((item) => (
              <button
                key={item.tag}
                type="button"
                className="ccp-suggestion-chip"
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
        )}

        {/* Mention suggestions */}
        {mentionSuggestions.length > 0 && (
          <div className="ccp-suggestions">
            {mentionSuggestions.map((item) => (
              <button
                key={item.username}
                type="button"
                className="ccp-suggestion-chip"
                onClick={() => {
                  replaceActiveToken(/(^|\s)@([A-Za-z0-9_]*)$/, `$1@${item.username} `);
                  setMentionQuery('');
                  setMentionSuggestions([]);
                }}
              >
                @{item.username}
              </button>
            ))}
          </div>
        )}

        {pageError && <p className="ccp-error">{pageError}</p>}
      </div>
    </div>
  );
}

export default CreateClubPost;
