import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  addMoviesToList,
  deleteMyList,
  fetchMovieDetails,
  fetchMyListDetail,
  fetchUserListDetail,
  reorderMyListItems,
  removeMovieFromList,
  searchMovies,
  updateMyList,
} from '../api';
import { getStoredToken } from '../authStorage';

const LIST_DESCRIPTION_LIMIT = 180;

function reorderItems(items, draggedId, targetId) {
  if (!draggedId || !targetId || draggedId === targetId) {
    return items;
  }

  const sourceIndex = items.findIndex((item) => item.id === draggedId);
  const targetIndex = items.findIndex((item) => item.id === targetId);
  if (sourceIndex === -1 || targetIndex === -1) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(sourceIndex, 1);
  nextItems.splice(targetIndex, 0, movedItem);

  return nextItems.map((item, index) => ({
    ...item,
    position: index + 1,
  }));
}

function ConfirmModal({ title, description, confirmLabel, onCancel, onConfirm, loading }) {
  if (!title) {
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
            Cancelar
          </button>
          <button type="button" className="primary-button" onClick={onConfirm} disabled={loading}>
            {loading ? 'Processando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddMoviesModal({
  open,
  query,
  onQueryChange,
  results,
  selectedMovies,
  onToggleMovie,
  onClose,
  onConfirm,
  loading,
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="feed-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="feed-modal add-movies-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button type="button" className="feed-modal-close" onClick={onClose}>
          x
        </button>
        <p className="eyebrow">Adicionar filmes</p>
        <h2>Busque e selecione um ou mais filmes</h2>
        <input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Pesquisar por nome do filme"
        />

        {selectedMovies.length ? (
          <div className="list-selection-chips">
            {selectedMovies.map((movie) => (
              <button
                key={movie.movie_id}
                type="button"
                className="filter-chip active"
                onClick={() => onToggleMovie(movie)}
              >
                {movie.title}
              </button>
            ))}
          </div>
        ) : null}

        <div className="create-post-search-results">
          {results.map((movie) => {
            const active = selectedMovies.some((item) => item.movie_id === movie.id);
            return (
              <button
                key={movie.id}
                type="button"
                className={`create-post-search-item${active ? ' active' : ''}`}
                onClick={() =>
                  onToggleMovie({
                    movie_id: movie.id,
                    title: movie.title,
                    poster_path: movie.poster_path,
                    release_date: movie.release_date,
                  })
                }
              >
                {movie.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w185${movie.poster_path}`}
                    alt={movie.title}
                  />
                ) : (
                  <div className="create-post-search-fallback">Sem capa</div>
                )}
                <div>
                  <strong>{movie.title}</strong>
                  <span>{movie.release_date || 'Data indisponivel'}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="create-post-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Fechar
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={onConfirm}
            disabled={!selectedMovies.length || loading}
          >
            {loading ? 'Adicionando...' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ListFormModal({
  open,
  formState,
  loading,
  error,
  onChange,
  onClose,
  onSubmit,
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="feed-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="feed-modal add-movies-modal list-form-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button type="button" className="feed-modal-close" onClick={onClose}>
          x
        </button>
        <p className="eyebrow">Editar lista</p>
        <h2>Editar detalhes da lista</h2>

        <div className="list-form-grid">
          <div className="create-post-field">
            <label htmlFor="list-title">Nome da lista</label>
            <input
              id="list-title"
              name="title"
              value={formState.title}
              onChange={onChange}
              placeholder="Ex.: Suspenses para maratonar"
            />
          </div>

          <div className="create-post-field">
            <label htmlFor="list-description">Descricao</label>
            <textarea
              id="list-description"
              name="description"
              rows="4"
              value={formState.description}
              onChange={onChange}
              placeholder="Conte o foco da lista em poucas linhas."
            />
            <div className="create-post-text-meta">
              <span>Descricao opcional</span>
              <strong>{formState.description.length}/{LIST_DESCRIPTION_LIMIT}</strong>
            </div>
          </div>

          <div className="create-post-field">
            <label htmlFor="list-visibility">Visibilidade</label>
            <select
              id="list-visibility"
              name="visibility"
              value={formState.visibility}
              onChange={onChange}
            >
              <option value="PRIVATE">Privada</option>
              <option value="PUBLIC">Publica</option>
            </select>
          </div>

          <label className="list-sharing-toggle">
            <input
              type="checkbox"
              name="allow_social_sharing"
              checked={formState.allow_social_sharing}
              onChange={onChange}
            />
            <span>Permitir compartilhamento social</span>
          </label>

          <div className="list-form-preview">
            <div className="profile-list-cover fallback">
              <span className="generic-cover-badge" />
              <div className="generic-cover-lines">
                <span />
                <span />
                <span />
              </div>
            </div>
            <div className="profile-list-copy">
              <div className="profile-list-topline">
                <strong>{formState.title || 'Nome da lista'}</strong>
                <span className={`visibility-pill ${formState.visibility.toLowerCase()}`}>
                  {formState.visibility === 'PUBLIC' ? 'Publica' : 'Privada'}
                </span>
              </div>
              <p>{formState.description || 'A capa real entra quando o primeiro filme for adicionado.'}</p>
            </div>
          </div>
        </div>

        {error ? <p className="error">{error}</p> : null}

        <div className="create-post-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="primary-button" onClick={onSubmit} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ListDetail() {
  const navigate = useNavigate();
  const { listId, username } = useParams();
  const token = useMemo(() => getStoredToken(), []);
  const [movieList, setMovieList] = useState(null);
  const [pageError, setPageError] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [movieQuery, setMovieQuery] = useState('');
  const [movieResults, setMovieResults] = useState([]);
  const [selectedMovies, setSelectedMovies] = useState([]);
  const [savingMovies, setSavingMovies] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [deletingList, setDeletingList] = useState(false);
  const [showEditDetailsModal, setShowEditDetailsModal] = useState(false);
  const [detailsFormLoading, setDetailsFormLoading] = useState(false);
  const [detailsFormError, setDetailsFormError] = useState('');
  const [detailsFormState, setDetailsFormState] = useState({
    title: '',
    description: '',
    visibility: 'PRIVATE',
    allow_social_sharing: false,
  });
  const [filterQuery, setFilterQuery] = useState('');
  const [activeGenre, setActiveGenre] = useState('');
  const [genreMap, setGenreMap] = useState({});
  const [draggedItemId, setDraggedItemId] = useState(null);
  const [dragOverItemId, setDragOverItemId] = useState(null);
  const [reorderLoading, setReorderLoading] = useState(false);

  const reloadList = async () => {
    if (!token) {
      return;
    }
    const payload = username
      ? await fetchUserListDetail(token, username, listId)
      : await fetchMyListDetail(token, listId);
    setMovieList(payload);
  };

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    const request = username
      ? fetchUserListDetail(token, username, listId)
      : fetchMyListDetail(token, listId);

    request
      .then(setMovieList)
      .catch((err) => setPageError(err.message || 'Falha ao carregar lista.'));
  }, [listId, navigate, token, username]);

  useEffect(() => {
    if (!token || !showAddModal || !movieQuery.trim()) {
      setMovieResults([]);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      searchMovies(token, movieQuery.trim())
        .then((results) => setMovieResults(results || []))
        .catch((err) => setPageError(err.message || 'Falha ao buscar filmes.'));
    }, 250);

    return () => window.clearTimeout(timer);
  }, [movieQuery, showAddModal, token]);

  useEffect(() => {
    const shouldLockScroll = Boolean(
      showAddModal || removeTarget || deletingList || showEditDetailsModal
    );
    if (!shouldLockScroll) {
      return undefined;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showAddModal, removeTarget, deletingList, showEditDetailsModal]);

  useEffect(() => {
    if (!token || !movieList?.items?.length) {
      setGenreMap({});
      return;
    }

    let ignore = false;
    Promise.all(
      movieList.items.map((item) =>
        fetchMovieDetails(token, item.movie_id)
          .then((details) => [item.movie_id, details.genres || []])
          .catch(() => [item.movie_id, []])
      )
    ).then((entries) => {
      if (!ignore) {
        setGenreMap(Object.fromEntries(entries));
      }
    });

    return () => {
      ignore = true;
    };
  }, [movieList?.items, token]);

  const isReadOnly = movieList ? !movieList.can_edit : Boolean(username);
  const backTarget = username
    ? `/users/${username}`
    : '/profile#my-lists';
  const listGenres = Array.from(
    new Set((movieList?.items || []).flatMap((item) => genreMap[item.movie_id] || []))
  ).sort((a, b) => a.localeCompare(b));
  const filteredItems = (movieList?.items || []).filter((item) => {
    const matchesQuery = (item.title || '').toLowerCase().includes(filterQuery.trim().toLowerCase());
    const itemGenres = genreMap[item.movie_id] || [];
    const matchesGenre = !activeGenre || itemGenres.includes(activeGenre);
    return matchesQuery && matchesGenre;
  });
  const canDragItems = editMode && !isReadOnly && !filterQuery.trim() && !activeGenre && !reorderLoading;

  const handleToggleMovie = (movie) => {
    setSelectedMovies((current) =>
      current.some((item) => item.movie_id === movie.movie_id)
        ? current.filter((item) => item.movie_id !== movie.movie_id)
        : [...current, movie]
    );
  };

  const handleAddMovies = async () => {
    if (!token || !selectedMovies.length) {
      return;
    }
    setSavingMovies(true);
    try {
      const updated = await addMoviesToList(token, listId, selectedMovies);
      setMovieList(updated);
      setSelectedMovies([]);
      setMovieQuery('');
      setMovieResults([]);
      setShowAddModal(false);
      setFeedback('Filmes adicionados com sucesso.');
    } catch (err) {
      setPageError(err.message || 'Falha ao adicionar filmes.');
    } finally {
      setSavingMovies(false);
    }
  };

  const handleRemoveMovie = async () => {
    if (!token || !removeTarget) {
      return;
    }
    try {
      await removeMovieFromList(token, listId, removeTarget.id);
      await reloadList();
      setFeedback(`"${removeTarget.title}" foi removido da lista.`);
    } catch (err) {
      setPageError(err.message || 'Falha ao remover filme.');
    } finally {
      setRemoveTarget(null);
    }
  };

  const handleDragStart = (itemId) => {
    if (!canDragItems) {
      return;
    }
    setDraggedItemId(itemId);
    setDragOverItemId(itemId);
  };

  const handleDrop = async (targetItemId) => {
    if (!token || !movieList || !canDragItems || !draggedItemId || draggedItemId === targetItemId) {
      setDraggedItemId(null);
      setDragOverItemId(null);
      return;
    }

    const reorderedItems = reorderItems(movieList.items || [], draggedItemId, targetItemId);
    setMovieList((current) => (current ? { ...current, items: reorderedItems } : current));
    setReorderLoading(true);
    setDraggedItemId(null);
    setDragOverItemId(null);

    try {
      const updated = await reorderMyListItems(
        token,
        listId,
        reorderedItems.map((item) => item.id)
      );
      setMovieList(updated);
      setFeedback('Ordem da lista atualizada.');
    } catch (err) {
      await reloadList();
      setPageError(err.message || 'Falha ao reordenar os filmes.');
    } finally {
      setReorderLoading(false);
    }
  };

  const handleDeleteList = async () => {
    if (!token || !movieList) {
      return;
    }
    setDeletingList(true);
    try {
      await deleteMyList(token, movieList.id);
      navigate('/profile#my-lists');
    } catch (err) {
      setPageError(err.message || 'Falha ao excluir lista.');
      setDeletingList(false);
    }
  };

  const handleDetailsFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setDetailsFormState((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const openEditDetailsModal = () => {
    if (!movieList) {
      return;
    }
    setDetailsFormState({
      title: movieList.title || '',
      description: movieList.description || '',
      visibility: movieList.visibility || 'PRIVATE',
      allow_social_sharing: Boolean(movieList.allow_social_sharing),
    });
    setDetailsFormError('');
    setShowEditDetailsModal(true);
  };

  const handleUpdateListDetails = async () => {
    if (!token || !movieList) {
      return;
    }
    setDetailsFormLoading(true);
    setDetailsFormError('');
    try {
      const updatedSummary = await updateMyList(token, movieList.id, detailsFormState);
      const updatedDetail = await fetchMyListDetail(token, movieList.id);
      setMovieList({
        ...updatedDetail,
        cover_image_url: updatedSummary.cover_image_url || updatedDetail.cover_image_url,
      });
      setShowEditDetailsModal(false);
      setFeedback('Detalhes da lista atualizados com sucesso.');
    } catch (err) {
      setDetailsFormError(err.message || 'Falha ao atualizar detalhes da lista.');
    } finally {
      setDetailsFormLoading(false);
    }
  };

  return (
    <div className="home-page list-detail-page">
      <button
        type="button"
        className="floating-home-button"
        onClick={() =>
          navigate(backTarget, username ? undefined : { state: { scrollToLists: true } })
        }
      >
        Voltar
      </button>

      {pageError ? <p className="error">{pageError}</p> : null}
      {!pageError && !movieList ? <p className="loading-copy">Carregando lista...</p> : null}

      {movieList ? (
        <section className="list-detail-shell">
          <div className="list-detail-hero">
            <div>
              <p className="eyebrow">Minha Lista</p>
              <h1>{movieList.title}</h1>
              <p>{movieList.description || 'Sem descricao adicional nesta lista.'}</p>
              {feedback ? <p className="helper-copy">{feedback}</p> : null}
              <div className="profile-list-metrics">
                <span>{filteredItems.length} de {movieList.item_count} filme(s)</span>
              </div>
            </div>
            <div className="list-detail-meta">
              {!isReadOnly ? (
                <button
                  type="button"
                  className="ghost-button list-detail-menu-trigger"
                  onClick={() => setMenuOpen((current) => !current)}
                  aria-label="Abrir acoes da lista"
                >
                  ...
                </button>
              ) : null}
              {menuOpen && !isReadOnly ? (
                <div className="profile-list-menu list-detail-menu">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setShowAddModal(true);
                    }}
                  >
                    Adicionar filmes a lista
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setEditMode((current) => !current);
                    }}
                  >
                    {editMode ? 'Fechar edicao de filmes' : 'Editar filmes da lista'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      openEditDetailsModal();
                    }}
                  >
                    Editar detalhes da lista
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => {
                      setMenuOpen(false);
                      setDeletingList(true);
                    }}
                  >
                    Excluir a lista
                  </button>
                </div>
              ) : null}
              <span className={`visibility-pill ${movieList.visibility.toLowerCase()}`}>
                {movieList.visibility === 'PUBLIC' ? 'Publica' : 'Privada'}
              </span>
              <span>{movieList.item_count} filme(s)</span>
              <span>Atualizada em {new Date(movieList.updated_at).toLocaleDateString('pt-BR')}</span>
              {movieList.owner_username ? <span>@{movieList.owner_username}</span> : null}
            </div>
          </div>

          {!movieList.items.length ? (
            <div className="profile-list-empty">
              <strong>Essa lista ainda esta vazia.</strong>
              <p>Quando voce adicionar filmes, eles aparecerao aqui em ordem.</p>
            </div>
          ) : (
            <>
              <div className="profile-filter-bar">
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(event) => setFilterQuery(event.target.value)}
                  placeholder="Pesquisar filme por nome"
                />
                {listGenres.length ? (
                  <div className="profile-filter-chips">
                    <button
                      type="button"
                      className={`filter-chip${!activeGenre ? ' active' : ''}`}
                      onClick={() => setActiveGenre('')}
                    >
                      Todos
                    </button>
                    {listGenres.map((genre) => (
                      <button
                        key={`list-${genre}`}
                        type="button"
                        className={`filter-chip${activeGenre === genre ? ' active' : ''}`}
                        onClick={() => setActiveGenre(genre)}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {editMode && !isReadOnly ? (
                <p className="helper-copy list-reorder-helper">
                  {filterQuery.trim() || activeGenre
                    ? 'Limpe os filtros para arrastar e reorganizar os filmes.'
                    : reorderLoading
                      ? 'Salvando nova ordem da lista...'
                      : 'Segure e arraste um filme para trocar sua posicao. O botao de excluir continua separado.'}
                </p>
              ) : null}

              <div className="list-detail-grid">
              {filteredItems.map((item) => (
                <article
                  key={item.id}
                  className={`profile-movie-card list-detail-card${
                    canDragItems ? ' list-detail-card-draggable' : ''
                  }${dragOverItemId === item.id && draggedItemId !== item.id ? ' drag-target' : ''}${
                    draggedItemId === item.id ? ' dragging' : ''
                  }`}
                  draggable={canDragItems}
                  onDragStart={() => handleDragStart(item.id)}
                  onDragOver={(event) => {
                    if (!canDragItems) {
                      return;
                    }
                    event.preventDefault();
                    if (dragOverItemId !== item.id) {
                      setDragOverItemId(item.id);
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleDrop(item.id);
                  }}
                  onDragEnd={() => {
                    setDraggedItemId(null);
                    setDragOverItemId(null);
                  }}
                >
                  {editMode && !isReadOnly ? (
                    <button
                      type="button"
                      className="list-remove-button"
                      onClick={() => setRemoveTarget(item)}
                    >
                      -
                    </button>
                  ) : null}
                  {item.poster_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w300${item.poster_path}`}
                      alt={item.title}
                    />
                  ) : (
                    <div className="no-poster">No image</div>
                  )}
                  <div className="profile-movie-copy">
                    {editMode && !isReadOnly ? <span className="list-drag-hint">Arraste</span> : null}
                    <h3>{item.position}. {item.title}</h3>
                    <p>{item.release_date || 'Release date unavailable'}</p>
                    {(genreMap[item.movie_id] || []).length ? (
                      <div className="profile-inline-genres">
                        {(genreMap[item.movie_id] || []).slice(0, 3).map((genre) => (
                          <span key={`${item.id}-${genre}`}>{genre}</span>
                        ))}
                      </div>
                    ) : null}
                    <span>Adicionado em {new Date(item.added_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </article>
              ))}
              </div>
            </>
          )}
        </section>
      ) : null}

      <AddMoviesModal
        open={showAddModal && !isReadOnly}
        query={movieQuery}
        onQueryChange={setMovieQuery}
        results={movieResults}
        selectedMovies={selectedMovies}
        onToggleMovie={handleToggleMovie}
        onClose={() => {
          setShowAddModal(false);
          setMovieQuery('');
          setMovieResults([]);
          setSelectedMovies([]);
        }}
        onConfirm={handleAddMovies}
        loading={savingMovies}
      />

      <ConfirmModal
        title={
          removeTarget && !isReadOnly ? `Deseja remover esse filme da lista: ${movieList?.title}?` : ''
        }
        description={removeTarget ? removeTarget.title : ''}
        confirmLabel="Sim, remover"
        onCancel={() => setRemoveTarget(null)}
        onConfirm={handleRemoveMovie}
      />

      <ConfirmModal
        title={
          deletingList && movieList && !isReadOnly
            ? `Deseja excluir a lista: ${movieList.title}?`
            : ''
        }
        description="Essa acao remove a lista e os filmes associados dela."
        confirmLabel="Sim, excluir"
        onCancel={() => setDeletingList(false)}
        onConfirm={handleDeleteList}
        loading={false}
      />

      <ListFormModal
        open={showEditDetailsModal && !isReadOnly}
        formState={detailsFormState}
        loading={detailsFormLoading}
        error={detailsFormError}
        onChange={handleDetailsFormChange}
        onClose={() => {
          setShowEditDetailsModal(false);
          setDetailsFormError('');
        }}
        onSubmit={handleUpdateListDetails}
      />
    </div>
  );
}

export default ListDetail;
