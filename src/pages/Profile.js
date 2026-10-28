import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiCache } from '../apiCache';

import HomeButton from '../components/HomeButton';
import MovieDetailsModal from '../components/MovieDetailsModal';
import ProfileOverview from '../components/ProfileOverview';
import { COUNTRIES } from '../countries';
import { FEATURES } from '../features';
import {
  approveFollowRequest,
  createMyList,
  deleteMyAccount,
  deleteMyList,
  fetchMovieDetails,
  fetchMyCriticApplication,
  fetchMyListDetail,
  fetchMyLists,
  fetchMyRatings,
  fetchProfile,
  markNotificationRead,
  rejectFollowRequest,
  searchMovies,
  submitCriticApplication,
  updateMyList,
  updateProfile,
} from '../api';
import { clearStoredToken, getStoredToken } from '../authStorage';

const LIST_DESCRIPTION_LIMIT = 180;
const PROFILE_BIO_LIMIT = 280;
const PROFILE_GENRES = [
  'Acao',
  'Aventura',
  'Animacao',
  'Comedia',
  'Crime',
  'Documentario',
  'Drama',
  'Fantasia',
  'Ficcao cientifica',
  'Historia',
  'Misterio',
  'Romance',
  'Suspense',
  'Terror',
];
const PROFILE_NOTIFICATION_OPTIONS = [
  { key: 'post_likes', title: 'Curtidas no seu post', description: 'Quando alguem curtir seus posts e reviews.' },
  { key: 'direct_messages', title: 'Mensagens no direct', description: 'Quando alguem te mandar mensagem privada.' },
  { key: 'following_posts', title: 'Post de quem voce segue', description: 'Quando alguem que voce segue publicar post ou review.' },
  { key: 'new_followers', title: 'Novos seguidores', description: 'Quando alguem comecar a seguir voce.' },
  { key: 'follow_request_approved', title: 'Pedido aceito', description: 'Quando aprovarem seu pedido para seguir conta privada.' },
  { key: 'post_comments', title: 'Comentarios no seu post', description: 'Quando comentarem em posts ou reviews seus.' },
  { key: 'comment_replies', title: 'Respostas no comentario', description: 'Quando responderem um comentario seu.' },
  { key: 'mentions', title: 'Mencoes', description: 'Quando voce for marcado em post ou comentario.' },
  { key: 'club_updates', title: 'Atualizacoes de clubes', description: 'Pedidos, aprovacoes e eventos importantes dos clubes.' },
];

function ProfileSettingsModal({
  open,
  formState,
  loading,
  error,
  feedback,
  onChange,
  onToggleGenre,
  onToggleNotificationPreference,
  onFavoriteMovieSelect,
  onClose,
  onSubmit,
  onDeleteAccount,
}) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [movieQuery, setMovieQuery] = useState('');
  const [movieResults, setMovieResults] = useState([]);

  useEffect(() => {
    if (!open) {
      setMovieResults([]);
      return undefined;
    }
    const token = getStoredToken();
    if (!token || movieQuery.trim().length < 2) {
      setMovieResults([]);
      return undefined;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const payload = await searchMovies(token, movieQuery.trim());
        setMovieResults(payload || []);
      } catch (_error) {
        setMovieResults([]);
      }
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [movieQuery, open]);

  if (!open) {
    return null;
  }

  const currentPasswordEyeIcon = showCurrentPassword ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 19 19 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );

  const newPasswordEyeIcon = showNewPassword ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 19 19 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );

  return (
    <div className="feed-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="feed-modal add-movies-modal list-form-modal profile-settings-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button type="button" className="feed-modal-close" onClick={onClose}>
          x
        </button>
        <p className="eyebrow">Perfil</p>
        <h2>Mudar informacoes do perfil</h2>

        <div className="list-form-grid">
          <div className="create-post-field">
            <label htmlFor="profile-username-modal">Nome de usuario</label>
            <input
              id="profile-username-modal"
              name="username"
              value={formState.username}
              onChange={onChange}
            />
          </div>

          <div className="create-post-field">
            <label htmlFor="profile-bio-modal">Biografia</label>
            <textarea
              id="profile-bio-modal"
              name="bio"
              rows="4"
              value={formState.bio}
              onChange={onChange}
              placeholder="Conte um pouco sobre voce, seu gosto por cinema e o que curte assistir."
            />
            <div className="create-post-text-meta">
              <span>Aparece abaixo do seu nome</span>
              <strong>{formState.bio.length}/{PROFILE_BIO_LIMIT}</strong>
            </div>
          </div>

          <div className="create-post-field" id="profile-country-field">
            <label htmlFor="profile-country-modal">País 🌍</label>
            <select
              id="profile-country-modal"
              name="country"
              value={formState.country}
              onChange={onChange}
            >
              <option value="">Selecione seu país</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="create-post-field">
            <label htmlFor="profile-current-password-modal">Senha atual</label>
            <div className="password-field">
              <input
                id="profile-current-password-modal"
                name="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                value={formState.currentPassword}
                onChange={onChange}
                placeholder="Digite sua senha atual para liberar a troca"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowCurrentPassword((current) => !current)}
                aria-label={showCurrentPassword ? 'Ocultar senha atual' : 'Mostrar senha atual'}
              >
                {currentPasswordEyeIcon}
              </button>
            </div>
          </div>

          <div className="create-post-field">
            <label htmlFor="profile-password-modal">Nova senha</label>
            <div className="password-field">
              <input
                id="profile-password-modal"
                name="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={formState.newPassword}
                onChange={onChange}
                placeholder={
                  formState.currentPassword
                    ? 'Digite a nova senha'
                    : 'Preencha a senha atual primeiro'
                }
                disabled={!formState.currentPassword}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowNewPassword((current) => !current)}
                aria-label={showNewPassword ? 'Ocultar nova senha' : 'Mostrar nova senha'}
                disabled={!formState.currentPassword}
              >
                {newPasswordEyeIcon}
              </button>
            </div>
          </div>

          <div className="create-post-field">
            <label>Generos preferidos</label>
            <div className="onboarding-chip-grid compact">
              {PROFILE_GENRES.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  className={`onboarding-chip${formState.favoriteGenres.includes(genre) ? ' active' : ''}`}
                  onClick={() => onToggleGenre(genre)}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          <div className="create-post-field">
            <label htmlFor="profile-favorite-movie-search">Filme favorito</label>
            {formState.favoriteMovie ? (
              <div className="profile-favorite-movie-card">
                {formState.favoriteMovie.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w185${formState.favoriteMovie.poster_path}`}
                    alt={formState.favoriteMovie.title}
                  />
                ) : (
                  <div className="create-post-search-fallback">Sem capa</div>
                )}
                <div>
                  <strong>{formState.favoriteMovie.title}</strong>
                  <span>{formState.favoriteMovie.release_date || 'Data indisponivel'}</span>
                </div>
              </div>
            ) : null}
            <input
              id="profile-favorite-movie-search"
              value={movieQuery}
              onChange={(event) => setMovieQuery(event.target.value)}
              placeholder="Pesquisar filme favorito"
            />
            {movieResults.length ? (
              <div className="profile-favorite-movie-results">
                {movieResults.slice(0, 6).map((movie) => (
                  <button
                    key={movie.id}
                    type="button"
                    className="onboarding-search-card"
                    onClick={() => {
                      onFavoriteMovieSelect({
                        movie_id: movie.id,
                        title: movie.title,
                        poster_path: movie.poster_path,
                        release_date: movie.release_date,
                      });
                      setMovieQuery('');
                      setMovieResults([]);
                    }}
                  >
                    {movie.poster_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w185${movie.poster_path}`}
                        alt={movie.title}
                      />
                    ) : (
                      <div className="onboarding-search-fallback">{movie.title.slice(0, 1)}</div>
                    )}
                    <div>
                      <strong>{movie.title}</strong>
                      <span>{movie.release_date || 'Data indisponivel'}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="create-post-field">
            <label>Privacidade da conta</label>
            <label className="create-post-toggle-card">
              <div className="create-post-toggle-copy">
                <strong>{formState.isPrivateAccount ? 'Conta privada' : 'Conta publica'}</strong>
                <span>
                  {formState.isPrivateAccount
                    ? 'Seu perfil fica marcado como privado nas configuracoes da conta.'
                    : 'Seu perfil continua visivel como conta publica.'}
                </span>
              </div>
              <span className={`create-post-toggle-switch${formState.isPrivateAccount ? ' active' : ''}`}>
                <input
                  type="checkbox"
                  name="isPrivateAccount"
                  checked={formState.isPrivateAccount}
                  onChange={onChange}
                />
                <span className="create-post-toggle-knob" />
              </span>
            </label>
          </div>

          <div className="create-post-field">
            <label>Preferencias de notificacao</label>
            <div className="profile-notification-preferences">
              {PROFILE_NOTIFICATION_OPTIONS.map((item) => (
                <label key={item.key} className="create-post-toggle-card">
                  <div className="create-post-toggle-copy">
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </div>
                  <span
                    className={`create-post-toggle-switch${
                      formState.notificationPreferences[item.key] ? ' active' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(formState.notificationPreferences[item.key])}
                      onChange={() => onToggleNotificationPreference(item.key)}
                    />
                    <span className="create-post-toggle-knob" />
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {feedback ? <p className="helper-copy success-copy">{feedback}</p> : null}
        {error ? <p className="error">{error}</p> : null}

        <div className="create-post-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="primary-button" onClick={onSubmit} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar alteracoes'}
          </button>
        </div>

        <div className="profile-danger-zone">
          <hr className="profile-danger-divider" />
          {!deleteConfirming ? (
            <button
              type="button"
              className="profile-delete-account-btn"
              onClick={() => setDeleteConfirming(true)}
              disabled={loading}
            >
              Excluir conta
            </button>
          ) : (
            <div className="profile-delete-confirm">
              <p className="profile-delete-warning">
                <strong>Tem certeza?</strong> Esta acao e irreversivel. Todos os seus dados —
                posts, avaliacoes, listas e seguindo — serao permanentemente excluidos.
              </p>
              <div className="create-post-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setDeleteConfirming(false)}
                  disabled={deleteLoading}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="profile-delete-confirm-btn"
                  disabled={deleteLoading}
                  onClick={async () => {
                    setDeleteLoading(true);
                    await onDeleteAccount();
                    setDeleteLoading(false);
                  }}
                >
                  {deleteLoading ? 'Excluindo...' : 'Sim, excluir minha conta'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ListFormModal({
  open,
  mode,
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
        <p className="eyebrow">{mode === 'create' ? 'Criar lista' : 'Editar lista'}</p>
        <h2>{mode === 'create' ? 'Nova lista' : 'Editar informacoes da lista'}</h2>

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

const APPLICATION_MOTIVATION_LIMIT = 800;

function PremiumEntryCard({ isPremium }) {
  const navigate = useNavigate();
  return (
    <div className="premium-entry-card">
      <div>
        <h3>{isPremium ? 'Você é Premium ✦' : 'Moviz Premium'}</h3>
        <p>{isPremium ? 'Obrigado por apoiar o Moviz.' : 'Mais mensagens no CineBot e nenhum anúncio.'}</p>
      </div>
      <button type="button" className="secondary-button" onClick={() => navigate('/premium')}>
        {isPremium ? 'Ver plano' : 'Conhecer'}
      </button>
    </div>
  );
}

function CriticApplicationSection({ isVerifiedCritic }) {
  const [application, setApplication] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [motivation, setMotivation] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isVerifiedCritic) return;
    const token = getStoredToken();
    if (!token) return;
    fetchMyCriticApplication(token)
      .then((data) => setApplication(data))
      .catch(() => setApplication(null));
  }, [isVerifiedCritic]);

  if (isVerifiedCritic) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = getStoredToken();
    if (!token || !motivation.trim()) return;
    setSubmitting(true);
    setError('');
    setFeedback('');
    try {
      const result = await submitCriticApplication(token, {
        motivation: motivation.trim(),
        portfolio_url: portfolioUrl.trim() || null,
      });
      setApplication(result);
      setFormOpen(false);
      setMotivation('');
      setPortfolioUrl('');
      setFeedback('Solicitacao enviada. O time Moviz ira analisar em breve.');
    } catch (err) {
      setError(err.message || 'Falha ao enviar solicitacao.');
    } finally {
      setSubmitting(false);
    }
  };

  const isPending = application?.status === 'pending';
  const isRejected = application?.status === 'rejected';

  return (
    <div className="critic-application-section">
      <div className="critic-application-header">
        <div>
          <h3>Critico verificado</h3>
          <p>
            {isPending
              ? 'Sua solicitacao esta em analise pelo time Moviz.'
              : isRejected
                ? 'Sua solicitacao anterior nao foi aprovada. Voce pode tentar novamente.'
                : 'Contribua com reviews com mais visibilidade e um badge exclusivo no seu perfil.'}
          </p>
        </div>
        {isPending ? (
          <span className="critic-application-status pending">Em analise</span>
        ) : isRejected ? (
          <span className="critic-application-status rejected">Nao aprovada</span>
        ) : null}
      </div>

      {feedback ? <p className="success-copy">{feedback}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!isPending && !formOpen ? (
        <button
          type="button"
          className="secondary-button critic-application-cta"
          onClick={() => {
            setFormOpen(true);
            setError('');
            setFeedback('');
            if (isRejected && application?.motivation) {
              setMotivation(application.motivation);
              setPortfolioUrl(application.portfolio_url || '');
            }
          }}
        >
          {isRejected ? 'Tentar novamente' : 'Solicitar verificacao'}
        </button>
      ) : null}

      {formOpen ? (
        <form className="critic-application-form" onSubmit={handleSubmit}>
          <div className="list-form-field">
            <label htmlFor="critic-motivation">
              Por que voce quer ser critico verificado?
              <span className="char-count">{motivation.length}/{APPLICATION_MOTIVATION_LIMIT}</span>
            </label>
            <textarea
              id="critic-motivation"
              value={motivation}
              onChange={(e) => setMotivation(e.target.value.slice(0, APPLICATION_MOTIVATION_LIMIT))}
              placeholder="Fale sobre sua experiencia com cinema, onde escreve sobre filmes, o que motiva suas analises..."
              rows={5}
              required
            />
          </div>
          <div className="list-form-field">
            <label htmlFor="critic-portfolio">
              Link de portfolio, blog ou rede social (opcional)
            </label>
            <input
              id="critic-portfolio"
              type="url"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="create-post-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => { setFormOpen(false); setError(''); }}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button type="submit" className="primary-button" disabled={submitting || !motivation.trim()}>
              {submitting ? 'Enviando...' : 'Enviar solicitacao'}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function Profile() {
  // Read from cache synchronously — gives instant paint on revisit
  const _cachedProfile  = apiCache.get('my-profile');
  const _cachedLists    = apiCache.get('my-lists');
  const _cachedRatings  = apiCache.get('my-ratings');
  const _hasCachedData  = Boolean(_cachedProfile);

  const [profile, setProfile]       = useState(_cachedProfile  ?? null);
  const [allRatings, setAllRatings] = useState(_cachedRatings  ?? []);
  const [lists, setLists]           = useState(_cachedLists    ?? []);
  const [listsLoading, setListsLoading] = useState(!_hasCachedData);
  const [listsError, setListsError] = useState(null);
  const [listFeedback, setListFeedback] = useState('');
  const [formState, setFormState] = useState({
    username: '',
    bio: '',
    country: '',
    favoriteGenres: [],
    favoriteMovie: null,
    isPrivateAccount: false,
    notificationPreferences: {},
    currentPassword: '',
    newPassword: '',
  });
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState('');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [selectedMovieDetails, setSelectedMovieDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [pageError, setPageError] = useState(null);
  const [listModalOpen, setListModalOpen] = useState(false);
  const [listModalMode, setListModalMode] = useState('create');
  const [listModalError, setListModalError] = useState('');
  const [listModalLoading, setListModalLoading] = useState(false);
  const [editingListId, setEditingListId] = useState(null);
  const [listFormState, setListFormState] = useState({
    title: '',
    description: '',
    visibility: 'PRIVATE',
    allow_social_sharing: false,
  });
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.editCountry) {
      setProfileModalOpen(true);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    // Skip fetch if all data is fresh in cache
    if (
      !apiCache.isStale('my-profile') &&
      !apiCache.isStale('my-lists') &&
      !apiCache.isStale('my-ratings')
    ) {
      setListsLoading(false);
      return;
    }

    Promise.all([fetchProfile(token), fetchMyLists(token), fetchMyRatings(token)])
      .then(([profilePayload, listsPayload, ratingsPayload]) => {
        apiCache.set('my-profile', profilePayload);
        apiCache.set('my-lists',   listsPayload || []);
        apiCache.set('my-ratings', ratingsPayload || []);
        setProfile(profilePayload);
        setLists(listsPayload || []);
        setAllRatings(ratingsPayload || []);
        setFormState({
          username: profilePayload.user.username,
          bio: profilePayload.bio || profilePayload.user.bio || '',
          country: profilePayload.user.country || '',
          favoriteGenres: profilePayload.preferred_genres || [],
          favoriteMovie: profilePayload.favorite_movie || null,
          isPrivateAccount: Boolean(profilePayload.is_private_account),
          notificationPreferences: profilePayload.notification_preferences || {},
          currentPassword: '',
          newPassword: '',
        });
        setProfileFeedback('');
        setListsError(null);
      })
      .catch((err) => {
        setPageError(err.message);
        setListsError(err.message);
      })
      .finally(() => setListsLoading(false));
  }, [navigate]);

  useEffect(() => {
    return () => {
      if (profileImagePreview?.startsWith('blob:')) {
        URL.revokeObjectURL(profileImagePreview);
      }
    };
  }, [profileImagePreview]);

  useEffect(() => {
    if (location.hash === '#my-lists' || location.state?.scrollToLists) {
      const timer = window.setTimeout(() => {
        document.getElementById('my-lists')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [location.hash, location.state]);

  useEffect(() => {
    const shouldLockScroll = listModalOpen || profileModalOpen;
    if (!shouldLockScroll) {
      return undefined;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [listModalOpen, profileModalOpen]);

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormState((current) => ({
      ...current,
      [name]:
        type === 'checkbox'
          ? checked
          : name === 'bio'
            ? value.slice(0, PROFILE_BIO_LIMIT)
            : value,
      ...(name === 'currentPassword' && !value ? { newPassword: '' } : {}),
    }));
  };

  const handleToggleGenre = (genre) => {
    setFormState((current) => ({
      ...current,
      favoriteGenres: current.favoriteGenres.includes(genre)
        ? current.favoriteGenres.filter((item) => item !== genre)
        : [...current.favoriteGenres, genre],
    }));
  };

  const handleToggleNotificationPreference = (key) => {
    setFormState((current) => ({
      ...current,
      notificationPreferences: {
        ...current.notificationPreferences,
        [key]: !current.notificationPreferences[key],
      },
    }));
  };

  const handleFavoriteMovieSelect = (movie) => {
    setFormState((current) => ({
      ...current,
      favoriteMovie: movie,
    }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0] || null;
    const token = getStoredToken();
    if (!file || !token) {
      return;
    }

    setProfileImageFile(file);
    setPageError(null);
    setProfileFeedback('');

    setProfileImagePreview((current) => {
      if (current?.startsWith('blob:')) {
        URL.revokeObjectURL(current);
      }
      return file ? URL.createObjectURL(file) : '';
    });

    try {
      const updatedProfile = await updateProfile(token, {
        username: formState.username,
        bio: formState.bio,
        country: formState.country,
        favoriteGenres: formState.favoriteGenres,
        favoriteMovie: formState.favoriteMovie,
        isPrivateAccount: formState.isPrivateAccount,
        notificationPreferences: formState.notificationPreferences,
        currentPassword: formState.currentPassword,
        newPassword: formState.newPassword,
        profileImageFile: file,
      });
      apiCache.set('my-profile', updatedProfile);
      setProfile(updatedProfile);
      setFormState((current) => ({
        ...current,
        username: updatedProfile.user.username,
        bio: updatedProfile.bio || '',
        country: updatedProfile.user.country || '',
        favoriteGenres: updatedProfile.preferred_genres || [],
        favoriteMovie: updatedProfile.favorite_movie || null,
        isPrivateAccount: Boolean(updatedProfile.is_private_account),
        notificationPreferences: updatedProfile.notification_preferences || current.notificationPreferences,
      }));
      setProfileImageFile(null);
      setProfileImagePreview((current) => {
        if (current?.startsWith('blob:')) {
          URL.revokeObjectURL(current);
        }
        return '';
      });
    } catch (err) {
      setPageError(err.message);
    } finally {
      e.target.value = '';
    }
  };

  const handleSave = async (e) => {
    if (e?.preventDefault) {
      e.preventDefault();
    }
    const token = getStoredToken();
    setProfileSaving(true);
    setPageError(null);
    setProfileFeedback('');
    try {
      const changingPassword = Boolean(formState.currentPassword && formState.newPassword);
      const updatedProfile = await updateProfile(token, {
        username: formState.username,
        bio: formState.bio,
        country: formState.country,
        favoriteGenres: formState.favoriteGenres,
        favoriteMovie: formState.favoriteMovie,
        isPrivateAccount: formState.isPrivateAccount,
        notificationPreferences: formState.notificationPreferences,
        currentPassword: formState.currentPassword,
        newPassword: formState.newPassword,
        profileImageFile,
      });
      apiCache.set('my-profile', updatedProfile);
      setProfile(updatedProfile);
      setFormState((current) => ({
        ...current,
        username: updatedProfile.user.username,
        bio: updatedProfile.bio || '',
        country: updatedProfile.user.country || '',
        favoriteGenres: updatedProfile.preferred_genres || [],
        favoriteMovie: updatedProfile.favorite_movie || null,
        isPrivateAccount: Boolean(updatedProfile.is_private_account),
        notificationPreferences: updatedProfile.notification_preferences || current.notificationPreferences,
        currentPassword: '',
        newPassword: '',
      }));
      setProfileModalOpen(false);
      setProfileFeedback(
        changingPassword
          ? 'Senha alterada com sucesso.'
          : 'Informacoes do perfil salvas com sucesso.'
      );
      setProfileImageFile(null);
      setProfileImagePreview((current) => {
        if (current?.startsWith('blob:')) {
          URL.revokeObjectURL(current);
        }
        return '';
      });
    } catch (err) {
      setPageError(
        /current password is incorrect/i.test(err.message || '')
          ? 'Senha atual incorreta.'
          : err.message
      );
    } finally {
      setProfileSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const token = getStoredToken();
    if (!token) return;
    try {
      await deleteMyAccount(token);
      clearStoredToken();
      navigate('/login', { replace: true });
    } catch (err) {
      setPageError(err.message || 'Falha ao excluir conta.');
    }
  };

  const handleMovieClick = async (movie) => {
    const token = getStoredToken();
    setSelectedMovie(movie);
    setDetailsLoading(true);
    setDetailsError(null);
    setSelectedMovieDetails(null);
    try {
      const details = await fetchMovieDetails(token, movie.movie_id || movie.id);
      setSelectedMovieDetails(details);
    } catch (err) {
      setDetailsError(err.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedMovie(null);
    setSelectedMovieDetails(null);
    setDetailsLoading(false);
    setDetailsError(null);
  };

  const handleRatingSaved = (ratedMovie) => {
    setAllRatings((current) => {
      const withoutMovie = current.filter((item) => item.movie_id !== ratedMovie.movie_id);
      return [ratedMovie, ...withoutMovie].sort(
        (a, b) =>
          new Date(b.rated_at).getTime() - new Date(a.rated_at).getTime() || b.id - a.id
      );
    });

    setProfile((current) => {
      if (!current) {
        return current;
      }
      const recentWithoutMovie = current.recent_ratings.filter(
        (item) => item.movie_id !== ratedMovie.movie_id
      );
      const topWithoutMovie = current.top_ratings.filter(
        (item) => item.movie_id !== ratedMovie.movie_id
      );
      const nextRecent = [ratedMovie, ...recentWithoutMovie]
        .sort(
          (a, b) =>
            new Date(b.rated_at).getTime() - new Date(a.rated_at).getTime() || b.id - a.id
        )
        .slice(0, 6);
      const nextTop = [ratedMovie, ...topWithoutMovie]
        .sort((a, b) => b.rating - a.rating || new Date(b.rated_at).getTime() - new Date(a.rated_at).getTime())
        .slice(0, 6);

      return {
        ...current,
        recent_ratings: nextRecent,
        top_ratings: nextTop,
      };
    });

    setSelectedMovieDetails((current) =>
      current ? { ...current, user_rating: ratedMovie.rating } : current
    );
  };

  const resetListModalState = () => {
    setListModalOpen(false);
    setListModalMode('create');
    setListModalError('');
    setListModalLoading(false);
    setEditingListId(null);
    setListFormState({
      title: '',
      description: '',
      visibility: 'PRIVATE',
      allow_social_sharing: false,
    });
  };

  const openCreateListModal = () => {
    setListModalMode('create');
    setListModalError('');
    setEditingListId(null);
    setListFormState({
      title: '',
      description: '',
      visibility: 'PRIVATE',
      allow_social_sharing: false,
    });
    setListModalOpen(true);
  };

  const openEditListModal = async (movieList) => {
    const token = getStoredToken();
    if (!token) {
      return;
    }
    setListModalMode('edit');
    setListModalError('');
    setEditingListId(movieList.id);
    setListModalOpen(true);
    try {
      const detail = await fetchMyListDetail(token, movieList.id);
      setListFormState({
        title: detail.title || '',
        description: detail.description || '',
        visibility: detail.visibility || 'PRIVATE',
        allow_social_sharing: Boolean(detail.allow_social_sharing),
      });
    } catch (err) {
      setListModalError(err.message || 'Falha ao carregar lista para edicao.');
    }
  };

  const handleListFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setListFormState((current) => ({
      ...current,
      [name]:
        type === 'checkbox'
          ? checked
          : name === 'description'
            ? value.slice(0, LIST_DESCRIPTION_LIMIT)
            : value,
    }));
  };

  const handleSubmitListForm = async () => {
    const token = getStoredToken();
    if (!token) {
      return;
    }
    setListModalError('');
    setListModalLoading(true);
    try {
      const payload = {
        title: listFormState.title,
        description: listFormState.description,
        visibility: listFormState.visibility,
        allow_social_sharing: listFormState.allow_social_sharing,
      };
      const saved =
        listModalMode === 'create'
          ? await createMyList(token, payload)
          : await updateMyList(token, editingListId, payload);

      setLists((current) => {
        const withoutCurrent = current.filter((item) => item.id !== saved.id);
        return [saved, ...withoutCurrent].sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime() || b.id - a.id
        );
      });
      setListFeedback(
        listModalMode === 'create'
          ? `Lista "${saved.title}" criada com sucesso.`
          : `Lista "${saved.title}" atualizada com sucesso.`
      );
      resetListModalState();
      window.requestAnimationFrame(() => {
        document.getElementById('my-lists')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (err) {
      setListModalError(err.message || 'Falha ao salvar lista.');
    } finally {
      setListModalLoading(false);
    }
  };

  if (pageError && !profile) {
    return <p className="error">{pageError}</p>;
  }

  if (!profile) {
    return <p className="loading-copy">Carregando perfil...</p>;
  }

  const handleNotificationMarkedRead = async (notification) => {
    const token = getStoredToken();
    if (!token || !notification?.id || notification.is_read) {
      return;
    }
    try {
      const updated = await markNotificationRead(token, notification.id, true);
      setProfile((current) => (
        current
          ? {
              ...current,
              notifications: (current.notifications || []).map((item) =>
                item.id === updated.id ? updated : item
              ),
            }
          : current
      ));
    } catch (err) {
      setPageError(err.message || 'Falha ao atualizar notificacao.');
    }
  };

  const handleNotificationClick = async (notification) => {
    const token = getStoredToken();
    if (notification?.id && !notification.is_read) {
      await handleNotificationMarkedRead(notification);
    }

    if (notification?.deep_link) {
      navigate(notification.deep_link);
      return;
    }

    if (notification?.movie_id && token) {
      try {
        const details = await fetchMovieDetails(token, notification.movie_id);
        setSelectedMovie({
          id: notification.movie_id,
          movie_id: notification.movie_id,
          title: details.title,
          poster_path: details.poster_path,
          release_date: details.release_date,
        });
        setSelectedMovieDetails(details);
      } catch (err) {
        setPageError(err.message || 'Falha ao abrir filme da notificacao.');
      }
      return;
    }

    if (notification?.actor?.username) {
      navigate(`/users/${notification.actor.username}`);
    }
  };

  return (
    <>
      <HomeButton />
      {profileFeedback ? <p className="success-copy">{profileFeedback}</p> : null}
      <ProfileOverview
        profile={profile}
        allRatings={allRatings}
        pageTitle={`@${profile.user.username}`}
        subtitle="Edite seu nome de usuario, foto de perfil e acompanhe sua atividade recente."
        isEditable
        onFileChange={handleFileChange}
        onOpenSettings={() => setProfileModalOpen(true)}
        onOpenConnections={(kind) => navigate(`/users/${profile.user.username}/connections/${kind}`)}
        onMovieClick={handleMovieClick}
        onViewAllRatings={() => navigate('/profile/ratings')}
        onConnectionClick={(username) => navigate(`/users/${username}`)}
        avatarPreviewUrl={profileImagePreview}
        onNotificationClick={handleNotificationClick}
        onNotificationMarkRead={handleNotificationMarkedRead}
        onApproveFollowRequest={async (notification) => {
          const token = getStoredToken();
          if (!token || !notification?.actor?.id) {
            return;
          }
          try {
            await approveFollowRequest(token, notification.actor.id);
            if (notification?.id) {
              await markNotificationRead(token, notification.id, true);
            }
            const refreshedProfile = await fetchProfile(token);
            apiCache.set('my-profile', refreshedProfile);
            setProfile(refreshedProfile);
            setProfileFeedback(`Pedido de @${notification.actor.username} aceito.`);
          } catch (err) {
            setPageError(err.message || 'Falha ao aprovar pedido.');
          }
        }}
        onRejectFollowRequest={async (notification) => {
          const token = getStoredToken();
          if (!token || !notification?.actor?.id) {
            return;
          }
          try {
            await rejectFollowRequest(token, notification.actor.id);
            if (notification?.id) {
              await markNotificationRead(token, notification.id, true);
            }
            const refreshedProfile = await fetchProfile(token);
            apiCache.set('my-profile', refreshedProfile);
            setProfile(refreshedProfile);
            setProfileFeedback(`Pedido de @${notification.actor.username} recusado.`);
          } catch (err) {
            setPageError(err.message || 'Falha ao recusar pedido.');
          }
        }}
        lists={lists}
        listsLoading={listsLoading}
        listsError={listsError}
        listFeedback={listFeedback}
        onCreateList={openCreateListModal}
        onOpenList={(movieList) => navigate(`/lists/${movieList.id}`)}
        onEditList={openEditListModal}
        onShareList={async (movieList) => {
          const shareUrl = `${window.location.origin}/lists/${movieList.slug || movieList.id}`;
          try {
            await navigator.clipboard.writeText(shareUrl);
            setListFeedback(`Link de "${movieList.title}" copiado.`);
          } catch (_error) {
            setListFeedback(shareUrl);
          }
        }}
        onDeleteList={async (movieList) => {
          const token = getStoredToken();
          if (!token) {
            return;
          }
          try {
            const response = await deleteMyList(token, movieList.id);
            setLists((current) => current.filter((item) => item.id !== movieList.id));
            setListFeedback(response.message);
          } catch (err) {
            setListsError(err.message);
          }
        }}
      />

      <PremiumEntryCard isPremium={Boolean(profile.user.is_premium)} />

      {FEATURES.verifiedCritics && (
        <CriticApplicationSection isVerifiedCritic={Boolean(profile.user.is_verified_critic)} />
      )}

      <ProfileSettingsModal
        open={profileModalOpen}
        formState={formState}
        loading={profileSaving}
        error={pageError}
        feedback={profileFeedback}
        onChange={handleFormChange}
        onToggleGenre={handleToggleGenre}
        onToggleNotificationPreference={handleToggleNotificationPreference}
        onFavoriteMovieSelect={handleFavoriteMovieSelect}
        onClose={() => {
          if (!profileSaving) {
            setFormState((current) => ({ ...current, currentPassword: '', newPassword: '' }));
            setProfileModalOpen(false);
            setPageError(null);
          }
        }}
        onSubmit={handleSave}
        onDeleteAccount={handleDeleteAccount}
      />

      <ListFormModal
        open={listModalOpen}
        mode={listModalMode}
        formState={listFormState}
        loading={listModalLoading}
        error={listModalError}
        onChange={handleListFormChange}
        onClose={resetListModalState}
        onSubmit={handleSubmitListForm}
      />

      <MovieDetailsModal
        details={selectedMovieDetails || selectedMovie}
        loading={detailsLoading}
        error={detailsError}
        onClose={closeModal}
        onRatingSaved={handleRatingSaved}
        onOpenMovie={handleMovieClick}
      />
    </>
  );
}

export default Profile;
