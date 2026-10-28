import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  createFeedPost,
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

function Toggle({ checked, onChange, id }) {
  return (
    <label className="cfp-toggle" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={onChange} />
      <span className="cfp-toggle-track">
        <span className="cfp-toggle-knob" />
      </span>
    </label>
  );
}

function CreatePost() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = useMemo(() => getStoredToken(), []);
  const textareaRef = useRef(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [movieQuery, setMovieQuery] = useState('');
  const [movieResults, setMovieResults] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [textContent, setTextContent] = useState('');
  const [sentiment, setSentiment] = useState('');
  const [containsSpoiler, setContainsSpoiler] = useState(false);
  const [wouldWatchAgain, setWouldWatchAgain] = useState(null);
  const [publishToFeed, setPublishToFeed] = useState(true);
  const [hashtagQuery, setHashtagQuery] = useState('');
  const [hashtagSuggestions, setHashtagSuggestions] = useState([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [searchingMovies, setSearchingMovies] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    if (!token) { navigate('/login', { replace: true }); return; }
    getCurrentUser(token)
      .then(setCurrentUser)
      .catch((err) => {
        clearStoredToken();
        navigate('/login', { replace: true, state: { error: err.message } });
      });
  }, [navigate, token]);

  useEffect(() => {
    const prefilledMovie = location.state?.prefilledMovie;
    if (prefilledMovie?.id) {
      setSelectedMovie(prefilledMovie);
      setMovieQuery('');
      setMovieResults([]);
    }
  }, [location.state]);

  useEffect(() => {
    if (!token || !movieQuery.trim()) { setMovieResults([]); return undefined; }
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
        .then((r) => setHashtagSuggestions(r || []))
        .catch(() => setHashtagSuggestions([]));
    }, 150);
    return () => window.clearTimeout(timer);
  }, [hashtagQuery, token]);

  useEffect(() => {
    if (!token || !mentionQuery) { setMentionSuggestions([]); return undefined; }
    const timer = window.setTimeout(() => {
      suggestMentions(token, mentionQuery)
        .then((r) => setMentionSuggestions(r || []))
        .catch(() => setMentionSuggestions([]));
    }, 150);
    return () => window.clearTimeout(timer);
  }, [mentionQuery, token]);

  const handleTextChange = (e) => {
    const val = e.target.value.slice(0, POST_TEXT_LIMIT);
    setTextContent(val);
    setPageError('');
    const cur = e.target.selectionStart || val.length;
    const before = val.slice(0, cur);
    setHashtagQuery((before.match(/(?:^|\s)#([A-Za-z0-9_]*)$/) || [])[1] || '');
    setMentionQuery((before.match(/(?:^|\s)@([A-Za-z0-9_]*)$/) || [])[1] || '');
  };

  const replaceToken = (pattern, replacement) => {
    const el = textareaRef.current;
    if (!el) return;
    const cur = el.selectionStart || textContent.length;
    const before = textContent.slice(0, cur).replace(pattern, replacement);
    setTextContent(`${before}${textContent.slice(cur)}`);
    window.requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(before.length, before.length);
    });
  };

  const handleSubmit = async () => {
    if (!token || !selectedMovie || !textContent.trim() || saving) return;
    setSaving(true);
    setPageError('');
    try {
      const post = await createFeedPost(token, {
        movie_id: selectedMovie.id,
        movie_title: selectedMovie.title,
        movie_poster_path: selectedMovie.poster_path,
        movie_release_date: selectedMovie.release_date,
        text_content: textContent.trim(),
        sentiment,
        publish_to_feed: publishToFeed,
        contains_spoiler: containsSpoiler,
        would_watch_again: wouldWatchAgain,
      });
      navigate(-1);
    } catch (err) {
      setPageError(err.message || 'Falha ao publicar.');
    } finally {
      setSaving(false);
    }
  };

  const canPublish = Boolean(selectedMovie && textContent.trim() && !saving);
  const charsLeft = POST_TEXT_LIMIT - textContent.length;
  const charPct = Math.min(100, (textContent.length / POST_TEXT_LIMIT) * 100);
  const charColor = charPct > 90 ? 'var(--danger,#ef4444)' : charPct > 70 ? '#f59e0b' : 'var(--brand)';
  const initials = currentUser?.username?.slice(0, 2).toUpperCase() || '??';

  return (
    <div className="ccp-page">
      {/* ── Header ── */}
      <header className="ccp-header">
        <button className="dm-back" onClick={() => navigate(-1)} aria-label="Voltar">
          <BackIcon />
        </button>
        <div className="ccp-header-center">
          <p className="ccp-header-club" style={{ fontSize: '1rem' }}>Nova publicação</p>
        </div>
        <button className="ccp-publish-btn" disabled={!canPublish} onClick={handleSubmit}>
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
            <button className="ccp-movie-clear" onClick={() => setSelectedMovie(null)} aria-label="Remover">×</button>
          </div>
        )}

        {/* Movie results */}
        {movieResults.length > 0 && movieQuery.trim() && (
          <div className="ccp-movie-results">
            {movieResults.map((movie) => (
              <button key={movie.id} type="button" className="ccp-movie-result-item"
                onClick={() => { setSelectedMovie(movie); setMovieQuery(''); setMovieResults([]); }}>
                {movie.poster_path
                  ? <img src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`} alt={movie.title} />
                  : <div className="ccp-movie-result-placeholder"><FilmIcon /></div>}
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
            placeholder="Ex: devastado, obcecado, nostálgico..."
            value={sentiment}
            onChange={(e) => setSentiment(e.target.value)}
            maxLength={60}
          />
        </div>

        <div className="ccp-divider" />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          className="ccp-textarea"
          rows={7}
          placeholder="Escreva sobre o filme… use #hashtags e @menções"
          value={textContent}
          onChange={handleTextChange}
        />

        {/* Char bar */}
        <div className="ccp-char-row">
          <div className="ccp-char-bar">
            <div className="ccp-char-fill" style={{ width: `${charPct}%`, background: charColor }} />
          </div>
          <span className="ccp-char-count" style={{ color: charColor }}>{charsLeft}</span>
        </div>

        {/* Suggestions */}
        {hashtagSuggestions.length > 0 && (
          <div className="ccp-suggestions">
            {hashtagSuggestions.map((item) => (
              <button key={item.tag} type="button" className="ccp-suggestion-chip"
                onClick={() => { replaceToken(/(^|\s)#([A-Za-z0-9_]*)$/, `$1#${item.tag} `); setHashtagQuery(''); setHashtagSuggestions([]); }}>
                #{item.tag}
              </button>
            ))}
          </div>
        )}
        {mentionSuggestions.length > 0 && (
          <div className="ccp-suggestions">
            {mentionSuggestions.map((item) => (
              <button key={item.username} type="button" className="ccp-suggestion-chip"
                onClick={() => { replaceToken(/(^|\s)@([A-Za-z0-9_]*)$/, `$1@${item.username} `); setMentionQuery(''); setMentionSuggestions([]); }}>
                @{item.username}
              </button>
            ))}
          </div>
        )}

        <div className="ccp-divider" />

        {/* Options */}
        <div className="cfp-options">
          {/* Spoiler */}
          <div className="cfp-option-row">
            <span className="cfp-option-icon">⚠️</span>
            <span className="cfp-option-label">Contém spoiler</span>
            <Toggle
              id="post-spoiler"
              checked={containsSpoiler}
              onChange={(e) => setContainsSpoiler(e.target.checked)}
            />
          </div>

          {/* Rewatch */}
          <div className="cfp-option-row">
            <span className="cfp-option-icon">🔁</span>
            <span className="cfp-option-label">Assistiria de novo?</span>
            <div className="cfp-rewatch-chips">
              <button
                type="button"
                className={`cfp-rewatch-chip${wouldWatchAgain === true ? ' active' : ''}`}
                onClick={() => setWouldWatchAgain(wouldWatchAgain === true ? null : true)}
              >
                Sim
              </button>
              <button
                type="button"
                className={`cfp-rewatch-chip${wouldWatchAgain === false ? ' active' : ''}`}
                onClick={() => setWouldWatchAgain(wouldWatchAgain === false ? null : false)}
              >
                Não
              </button>
            </div>
          </div>

          {/* Publish to feed */}
          <div className="cfp-option-row">
            <span className="cfp-option-icon">📢</span>
            <span className="cfp-option-label">Publicar no feed</span>
            <Toggle
              id="post-publish-feed"
              checked={publishToFeed}
              onChange={(e) => setPublishToFeed(e.target.checked)}
            />
          </div>
        </div>

        {pageError && <p className="ccp-error">{pageError}</p>}
      </div>
    </div>
  );
}

export default CreatePost;
