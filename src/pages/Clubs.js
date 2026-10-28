import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  cancelClubJoinRequest,
  createClub,
  fetchClubs,
  fetchMovies,
  getCurrentUser,
  joinClub,
  leaveClub,
  searchMovies,
} from '../api';
import { clearStoredToken, getStoredToken } from '../authStorage';

const GENRES = [
  'Ação','Aventura','Animação','Comédia','Crime','Documentário',
  'Drama','Família','Fantasia','História','Terror','Música',
  'Mistério','Romance','Ficção científica','Suspense','Guerra',
];

const TMDB_GENRES = [
  { id: 28, label: 'Ação' },{ id: 12, label: 'Aventura' },{ id: 16, label: 'Animação' },
  { id: 35, label: 'Comédia' },{ id: 80, label: 'Crime' },{ id: 99, label: 'Documentário' },
  { id: 18, label: 'Drama' },{ id: 10751, label: 'Família' },{ id: 14, label: 'Fantasia' },
  { id: 36, label: 'História' },{ id: 27, label: 'Terror' },{ id: 10402, label: 'Música' },
  { id: 9648, label: 'Mistério' },{ id: 10749, label: 'Romance' },
  { id: 878, label: 'Ficção científica' },{ id: 53, label: 'Suspense' },{ id: 10752, label: 'Guerra' },
];

function getMoviePosterUrl(movie) {
  return movie?.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '';
}

/* ── Icons ──────────────────────────────────────────────────────── */
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}
function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/>
      <line x1="11" y1="18" x2="13" y2="18"/>
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}
function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  );
}

/* ── Club cover ─────────────────────────────────────────────────── */
function ClubCover({ imageUrl, name }) {
  const [err, setErr] = useState(false);
  return (
    <div className="clubs2-card-cover">
      {imageUrl && !err
        ? <img src={imageUrl} alt={name} onError={() => setErr(true)}/>
        : (
          <div className="clubs2-cover-fallback">
            <span>{name?.slice(0,1).toUpperCase()}</span>
          </div>
        )
      }
    </div>
  );
}

/* ── Club card ──────────────────────────────────────────────────── */
function ClubCard({ club, onOpen, actionLabel, actionDisabled, onAction, isOwner }) {
  return (
    <article className="clubs2-card" onClick={onOpen} role="button" tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen()}>
      <ClubCover imageUrl={club.cover_image_url} name={club.name}/>
      <div className="clubs2-card-body">
        <div className="clubs2-card-top">
          <span className={`clubs2-pill${club.is_private ? ' clubs2-pill--private' : ''}`}>
            {club.is_private ? 'Privado' : 'Aberto'}
          </span>
          <span className="clubs2-card-members">{club.member_count} membro{club.member_count !== 1 ? 's' : ''}</span>
        </div>
        <h3 className="clubs2-card-name">{club.name}</h3>
        {club.short_description && (
          <p className="clubs2-card-desc">{club.short_description}</p>
        )}
        {club.genres?.length > 0 && (
          <div className="clubs2-card-genres">
            {club.genres.slice(0, 3).map((g) => <span key={g}>{g}</span>)}
          </div>
        )}
        {actionLabel && !isOwner && (
          <button
            type="button"
            className={`clubs2-card-action${club.pending_request_by_me ? ' clubs2-card-action--secondary' : ''}`}
            disabled={actionDisabled}
            onClick={(e) => { e.stopPropagation(); onAction(); }}
          >
            {actionLabel}
          </button>
        )}
        {isOwner && (
          <span className="clubs2-owner-badge">Seu clube</span>
        )}
      </div>
    </article>
  );
}

/* ── Movie picker (inside create modal) ─────────────────────────── */
function MovieCoverPicker({ token, selectedMovie, onSelectMovie, onClearMovie }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    let ignore = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        let movies = [];
        if (query.trim()) {
          movies = await searchMovies(token, query.trim());
        } else {
          const [p1, p2] = await Promise.all([fetchMovies(token, 1), fetchMovies(token, 2)]);
          movies = [...(p1.results || []), ...(p2.results || [])];
        }
        if (!ignore) setResults(movies.slice(0, 18));
      } finally {
        if (!ignore) setLoading(false);
      }
    }, 220);
    return () => { ignore = true; clearTimeout(timer); };
  }, [token, query]);

  return (
    <div className="clubs2-movie-picker">
      {selectedMovie ? (
        <div className="clubs2-selected-movie">
          {getMoviePosterUrl(selectedMovie) && (
            <img src={getMoviePosterUrl(selectedMovie)} alt={selectedMovie.title}/>
          )}
          <div>
            <p className="clubs2-selected-title">{selectedMovie.title}</p>
            <button type="button" className="clubs2-clear-btn" onClick={onClearMovie}>Remover</button>
          </div>
        </div>
      ) : (
        <p className="clubs2-picker-hint">Nenhum filme escolhido como capa.</p>
      )}
      <div className="dm-search-wrap" style={{ margin: '8px 0' }}>
        <SearchIcon/>
        <input
          className="dm-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar filme para capa..."
        />
      </div>
      {loading && <p style={{ color: 'var(--text-3)', fontSize: '0.82rem' }}>Buscando...</p>}
      <div className="clubs2-movie-grid">
        {results.map((m) => (
          <button key={m.id} type="button"
            className={`clubs2-movie-option${selectedMovie?.id === m.id ? ' active' : ''}`}
            onClick={() => onSelectMovie(m)}>
            {getMoviePosterUrl(m)
              ? <img src={getMoviePosterUrl(m)} alt={m.title}/>
              : <div className="clubs2-movie-fallback">{m.title.slice(0,1)}</div>
            }
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Create club modal ──────────────────────────────────────────── */
function CreateClubModal({ open, onClose, onSubmit, token, submitting }) {
  const [form, setForm] = useState({
    name: '', short_description: '', description: '',
    genres: [], cover_image_url: '', is_private: false,
  });
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [step, setStep] = useState(1); // 1=info, 2=cover

  useEffect(() => {
    if (!open) {
      setForm({ name:'', short_description:'', description:'', genres:[], cover_image_url:'', is_private:false });
      setSelectedMovie(null);
      setStep(1);
    }
  }, [open]);

  if (!open) return null;

  const toggleGenre = (g) =>
    setForm((f) => ({
      ...f,
      genres: f.genres.includes(g) ? f.genres.filter((x) => x !== g) : [...f.genres, g],
    }));

  const canSubmit = form.name.trim() && form.genres.length && selectedMovie && form.cover_image_url;

  return (
    <div className="feed-modal-overlay" onClick={onClose} role="presentation">
      <div className="feed-modal clubs2-create-modal"
        onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="clubs2-modal-header">
          <h2 className="clubs2-modal-title">Criar clube</h2>
          <button type="button" className="dm-back" onClick={onClose} aria-label="Fechar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Step tabs */}
        <div className="clubs2-steps">
          <button className={`clubs2-step${step === 1 ? ' active' : ''}`} type="button" onClick={() => setStep(1)}>
            1 — Informações
          </button>
          <button className={`clubs2-step${step === 2 ? ' active' : ''}`} type="button" onClick={() => setStep(2)}>
            2 — Capa
          </button>
        </div>

        <form className="clubs2-form" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
          {step === 1 && (
            <>
              <div className="clubs2-field">
                <label>Nome do clube</label>
                <input value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex.: Sci-fi Essencial"/>
              </div>
              <div className="clubs2-field">
                <label>Descrição curta</label>
                <textarea value={form.short_description} rows={2}
                  onChange={(e) => setForm((f) => ({ ...f, short_description: e.target.value }))}
                  placeholder="Uma frase curta para o card do clube."/>
              </div>
              <div className="clubs2-field">
                <label>Descrição completa</label>
                <textarea value={form.description} rows={3}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Explique melhor o foco da comunidade."/>
              </div>
              <div className="clubs2-field">
                <label>Gêneros</label>
                <div className="browse-filter-row" style={{ padding: '4px 0' }}>
                  {GENRES.map((g) => (
                    <button key={g} type="button"
                      className={`browse-chip${form.genres.includes(g) ? ' browse-chip--active' : ''}`}
                      onClick={() => toggleGenre(g)}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <label className="clubs2-private-toggle">
                <input type="checkbox" checked={form.is_private}
                  onChange={(e) => setForm((f) => ({ ...f, is_private: e.target.checked }))}/>
                <span>Clube privado</span>
              </label>
              <button type="button" className="clubs2-next-btn" onClick={() => setStep(2)}>
                Próximo — Escolher capa
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <MovieCoverPicker
                token={token}
                selectedMovie={selectedMovie}
                onSelectMovie={(m) => {
                  setSelectedMovie(m);
                  setForm((f) => ({ ...f, cover_image_url: getMoviePosterUrl(m) }));
                }}
                onClearMovie={() => {
                  setSelectedMovie(null);
                  setForm((f) => ({ ...f, cover_image_url: '' }));
                }}
              />
              <button type="submit" className="clubs2-submit-btn" disabled={submitting || !canSubmit}>
                {submitting ? 'Criando...' : canSubmit ? 'Criar clube' : !form.genres.length ? 'Escolha gêneros primeiro' : 'Escolha uma capa'}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

/* ── Confirm modal ──────────────────────────────────────────────── */
function ConfirmModal({ open, title, description, confirmLabel, onCancel, onConfirm, loading }) {
  if (!open) return null;
  return (
    <div className="feed-modal-overlay" onClick={onCancel} role="presentation">
      <div className="feed-modal feed-confirm-modal"
        onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2>{title}</h2>
        <p className="feed-confirm-copy">{description}</p>
        <div className="feed-confirm-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>Voltar</button>
          <button type="button" className="primary-button" onClick={onConfirm} disabled={loading}>
            {loading ? 'Processando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Section skeleton ───────────────────────────────────────────── */
function ClubsSkeleton() {
  return (
    <div className="clubs2-grid">
      {[1,2,3].map((i) => <div key={i} className="clubs2-card-skeleton"/>)}
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────── */
export default function Clubs() {
  const navigate = useNavigate();
  const token = useMemo(() => getStoredToken(), []);

  const [currentUser, setCurrentUser] = useState(null);
  const [myClubs, setMyClubs] = useState([]);
  const [discoverClubs, setDiscoverClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [actionBusyId, setActionBusyId] = useState(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [genreFilters, setGenreFilters] = useState([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [pendingCancelClub, setPendingCancelClub] = useState(null);

  useEffect(() => {
    if (!token) { navigate('/login', { replace: true }); return; }
    getCurrentUser(token)
      .then(setCurrentUser)
      .catch(() => { clearStoredToken(); navigate('/login', { replace: true }); });
  }, [navigate, token]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim()), 200);
    return () => clearTimeout(t);
  }, [search]);

  const refreshClubs = useCallback(async () => {
    const payload = await fetchClubs(token, searchDebounced, genreFilters);
    setMyClubs(payload.my_clubs || []);
    setDiscoverClubs(payload.discover_clubs || []);
  }, [token, searchDebounced, genreFilters]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    refreshClubs()
      .catch((err) => {
        if (/session|credential|authenticated/i.test(err.message)) {
          clearStoredToken(); navigate('/login', { replace: true }); return;
        }
        setError(err.message || 'Falha ao carregar clubes.');
      })
      .finally(() => setLoading(false));
  }, [navigate, refreshClubs, token]);

  const handleJoin = async (club) => {
    setActionBusyId(club.id);
    try {
      const res = await joinClub(token, club.id);
      setFeedback(res.message);
      await refreshClubs();
    } catch (err) { setError(err.message); }
    finally { setActionBusyId(null); }
  };

  const handleLeave = async (club) => {
    setActionBusyId(club.id);
    try {
      const res = await leaveClub(token, club.id);
      setFeedback(res.message);
      await refreshClubs();
    } catch (err) { setError(err.message); }
    finally { setActionBusyId(null); }
  };

  const handleCancelRequest = async () => {
    if (!pendingCancelClub) return;
    setActionBusyId(pendingCancelClub.id);
    try {
      const res = await cancelClubJoinRequest(token, pendingCancelClub.id);
      setFeedback(res.message);
      setPendingCancelClub(null);
      await refreshClubs();
    } catch (err) { setError(err.message); }
    finally { setActionBusyId(null); }
  };

  const handleCreateSubmit = async (form) => {
    setSubmitting(true);
    try {
      await createClub(token, form);
      setCreateOpen(false);
      setFeedback('Clube criado com sucesso!');
      await refreshClubs();
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  const toggleGenre = (g) =>
    setGenreFilters((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );

  const activeFiltersCount = genreFilters.length + (searchDebounced ? 1 : 0);
  const isSearching = activeFiltersCount > 0;

  // Merged list for search mode: my clubs first, then discover
  const mergedResults = useMemo(() => {
    if (!isSearching) return [];
    const mine = myClubs.map((c) => ({ ...c, _isMine: true }));
    const others = discoverClubs.map((c) => ({ ...c, _isMine: false }));
    return [...mine, ...others];
  }, [isSearching, myClubs, discoverClubs]);

  return (
    <div className="clubs2-page">
      {/* ── Header ── */}
      <header className="clubs2-header">
        <button className="dm-back" onClick={() => navigate('/home')} aria-label="Voltar">
          <BackIcon/>
        </button>
        <h1 className="clubs2-header-title">Clubes</h1>
        <div className="clubs2-header-actions">
          <button
            className={`clubs2-icon-btn${searchOpen ? ' active' : ''}`}
            onClick={() => { setSearchOpen((v) => !v); if (filterOpen) setFilterOpen(false); }}
            aria-label="Buscar"
          >
            <SearchIcon/>
          </button>
          <button
            className={`clubs2-icon-btn${filterOpen ? ' active' : ''}${genreFilters.length ? ' has-badge' : ''}`}
            onClick={() => { setFilterOpen((v) => !v); if (searchOpen) setSearchOpen(false); }}
            aria-label="Filtros"
          >
            <FilterIcon/>
            {genreFilters.length > 0 && <span className="clubs2-filter-badge">{genreFilters.length}</span>}
          </button>
          <button className="clubs2-create-btn" onClick={() => setCreateOpen(true)} aria-label="Criar clube">
            <PlusIcon/>
          </button>
        </div>
      </header>

      {/* ── Search bar (slide-down) ── */}
      {searchOpen && (
        <div className="clubs2-search-bar">
          <div className="dm-search-wrap">
            <SearchIcon/>
            <input
              className="dm-search-input"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar clubes..."
            />
            {search && (
              <button type="button" className="dm-back" style={{ color: 'var(--text-3)' }}
                onClick={() => setSearch('')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Genre filter chips ── */}
      {filterOpen && (
        <div className="clubs2-filter-panel">
          <div className="browse-filter-row">
            <button
              className={`browse-chip${genreFilters.length === 0 ? ' browse-chip--active' : ''}`}
              onClick={() => setGenreFilters([])}
            >Todos</button>
            {GENRES.map((g) => (
              <button key={g} type="button"
                className={`browse-chip${genreFilters.includes(g) ? ' browse-chip--active' : ''}`}
                onClick={() => toggleGenre(g)}>
                {g}
              </button>
            ))}
          </div>
        </div>
      )}

      {feedback && <p className="clubs2-feedback">{feedback}</p>}
      {error && <p className="error" style={{ padding: '8px 16px', margin: 0 }}>{error}</p>}

      <div className="clubs2-content">

        {/* ── MODO PESQUISA: lista unificada ── */}
        {isSearching ? (
          <section className="clubs2-section">
            <div className="clubs2-section-header">
              <h2 className="clubs2-section-title">Resultados</h2>
              <button className="clubs2-clear-filters" onClick={() => { setSearch(''); setGenreFilters([]); setSearchOpen(false); }}>
                Limpar
              </button>
            </div>
            {loading ? <ClubsSkeleton/> : mergedResults.length === 0 ? (
              <div className="clubs2-empty">
                <p>Nenhum clube encontrado.</p>
              </div>
            ) : (
              <div className="clubs2-grid">
                {mergedResults.map((club) => (
                  <ClubCard
                    key={club.id}
                    club={club}
                    onOpen={() => navigate(`/clubs/${club.id}`)}
                    isOwner={club._isMine && club.creator?.id === currentUser?.id}
                    actionLabel={
                      club._isMine
                        ? (club.creator?.id === currentUser?.id ? null : 'Sair')
                        : club.pending_request_by_me ? 'Solicitação pendente'
                        : club.is_private ? 'Solicitar entrada'
                        : 'Entrar'
                    }
                    actionDisabled={actionBusyId === club.id}
                    onAction={() =>
                      club._isMine
                        ? handleLeave(club)
                        : club.pending_request_by_me
                        ? setPendingCancelClub(club)
                        : handleJoin(club)
                    }
                  />
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
        {/* ── Meus clubes ── */}
        <section className="clubs2-section">
          <div className="clubs2-section-header">
            <h2 className="clubs2-section-title">Meus clubes</h2>
            {myClubs.length > 0 && (
              <span className="clubs2-section-count">{myClubs.length}</span>
            )}
          </div>

          {loading ? <ClubsSkeleton/> : myClubs.length === 0 ? (
            <div className="clubs2-empty">
              <p>Você ainda não entrou em nenhum clube.</p>
              <button className="clubs2-empty-cta" onClick={() => setCreateOpen(true)}>
                Criar um clube
              </button>
            </div>
          ) : (
            <div className="clubs2-grid">
              {myClubs.map((club) => (
                <ClubCard
                  key={club.id}
                  club={club}
                  onOpen={() => navigate(`/clubs/${club.id}`)}
                  isOwner={club.creator?.id === currentUser?.id}
                  actionLabel={club.creator?.id === currentUser?.id ? null : 'Sair'}
                  actionDisabled={actionBusyId === club.id}
                  onAction={() => handleLeave(club)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Explorar ── */}
        <section className="clubs2-section">
          <div className="clubs2-section-header">
            <h2 className="clubs2-section-title">Explorar</h2>
          </div>

          {loading ? <ClubsSkeleton/> : discoverClubs.length === 0 ? (
            <div className="clubs2-empty">
              <p>Nenhum clube disponível.</p>
            </div>
          ) : (
            <div className="clubs2-grid">
              {discoverClubs.map((club) => (
                <ClubCard
                  key={club.id}
                  club={club}
                  onOpen={() => navigate(`/clubs/${club.id}`)}
                  isOwner={false}
                  actionLabel={
                    club.pending_request_by_me ? 'Solicitação pendente'
                    : club.is_private ? 'Solicitar entrada'
                    : 'Entrar'
                  }
                  actionDisabled={actionBusyId === club.id}
                  onAction={() => club.pending_request_by_me ? setPendingCancelClub(club) : handleJoin(club)}
                />
              ))}
            </div>
          )}
        </section>
          </>
        )}
      </div>

      <CreateClubModal
        open={createOpen}
        onClose={() => !submitting && setCreateOpen(false)}
        onSubmit={handleCreateSubmit}
        token={token}
        submitting={submitting}
      />

      <ConfirmModal
        open={Boolean(pendingCancelClub)}
        title="Cancelar solicitação?"
        description={pendingCancelClub ? `Remover pedido para entrar em "${pendingCancelClub.name}".` : ''}
        confirmLabel="Cancelar solicitação"
        onCancel={() => setPendingCancelClub(null)}
        onConfirm={handleCancelRequest}
        loading={pendingCancelClub ? actionBusyId === pendingCancelClub.id : false}
      />
    </div>
  );
}
