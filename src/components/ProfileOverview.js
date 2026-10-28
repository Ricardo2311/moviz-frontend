import React from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMovieDetails } from '../api';
import { getStoredToken } from '../authStorage';

const anonymousAvatar = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" rx="36" fill="#eadfce"/><circle cx="80" cy="62" r="28" fill="#c3b39c"/><path d="M38 132c8-24 26-36 42-36s34 12 42 36" fill="#c3b39c"/></svg>`
)}`;


/* ── mood helper ─────────────────────────────────────────────────────────── */

function buildProfileMood({ averageRating, topGenres, posts, ratingsCount }) {
  if (!ratingsCount) return { title: 'Em leitura', description: 'Avalie mais filmes para o Moviz entender melhor o seu momento cinefilo.' };
  const text = posts.map((p) => `${p.text_content || ''} ${p.review_headline || ''}`.toLowerCase()).join(' ');
  const genres = topGenres.map((g) => g.name.toLowerCase());
  if (text.includes('#comfortmovie') || text.includes('reveria') || averageRating >= 4.2) return { title: 'Cinefilia em alta', description: 'Voce esta em uma fase de entusiasmo, avaliando filmes de forma bem positiva.' };
  if (genres.some((g) => ['terror', 'suspense', 'misterio', 'crime'].includes(g)) || text.includes('#tenso') || text.includes('#sombrio')) return { title: 'Clima de tensao', description: 'Seu historico recente aponta interesse por atmosferas mais densas e intrigantes.' };
  if (genres.some((g) => ['romance', 'comedia', 'animacao'].includes(g)) || text.includes('#fofo') || text.includes('#leve')) return { title: 'Sessao aconchegante', description: 'Seu padrao recente puxa para filmes leves, afetivos ou confortaveis.' };
  return { title: 'Curadoria em andamento', description: 'Seus padroes ja aparecem, e a IA depois vai deixar esse retrato bem mais preciso.' };
}

/* ── list thumbnail (compact row version) ────────────────────────────────── */

function ListThumb({ movieList }) {
  if (movieList.cover_image_url) {
    const src = movieList.cover_image_url.startsWith('http') ? movieList.cover_image_url : `https://image.tmdb.org/t/p/w185${movieList.cover_image_url}`;
    return <div className="pov-list-thumb"><img src={src} alt={movieList.title} /></div>;
  }
  return (
    <div className="pov-list-thumb pov-list-thumb--fallback">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    </div>
  );
}

function buildListUpdatedAtLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Atualizacao recente';
  return `Atualizada em ${date.toLocaleDateString('pt-BR')}`;
}

/* ── tab content components ──────────────────────────────────────────────── */

function PostsTab({ posts, onNavigateToPost, onViewAll, isSaved, isEditable }) {
  const navigate = useNavigate();
  const empty = isSaved ? 'Nenhum post salvo ainda.' : 'Nenhum post ainda.';
  const previewPosts = posts.slice(0, 6);

  return (
    <div className="pov-tab-content">
      {posts.length === 0 ? (
        <div className="pov-empty">
          <span>{isSaved ? '🔖' : '📝'}</span>
          <p>{empty}</p>
          {!isSaved && isEditable && (
            <button className="pov-empty-cta" onClick={() => navigate('/posts/new')}>Criar post</button>
          )}
        </div>
      ) : (
        <>
          <div className="pov-posts-grid">
            {previewPosts.map((post) => (
              <article
                key={post.id}
                className="pov-post-card"
                onClick={() => navigate(`/posts/${post.id}`)}
              >
                {post.movie_poster_path ? (
                  <div className="pov-post-thumb">
                    <img src={`https://image.tmdb.org/t/p/w300${post.movie_poster_path}`} alt={post.movie_title} loading="lazy" />
                    <div className="pov-post-thumb-overlay">
                      <div className="pov-post-stats-over">
                        <span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                          {post.like_count}
                        </span>
                        <span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                          {post.comment_count}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="pov-post-text-card">
                    <p>{(post.text_content || post.review_headline || '').slice(0, 80)}{(post.text_content || '').length > 80 ? '…' : ''}</p>
                    <div className="pov-post-stats-plain">
                      <span>♥ {post.like_count}</span>
                      <span>💬 {post.comment_count}</span>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
          <button
            className="pov-see-all-btn"
            onClick={() => navigate(isSaved ? '/profile/saved' : '/profile/posts')}
          >
            {isSaved ? 'Ver todos os posts salvos' : 'Ver todos os posts'}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </>
      )}
    </div>
  );
}

function FilmesTab({ allRatings, profile, onMovieClick, onViewAllRatings }) {
  const recentMovies = profile.recent_ratings || [];
  const topMovies    = profile.top_ratings    || [];

  const MoviePoster = ({ movie, label }) => (
    <article className="pov-movie-card" onClick={() => onMovieClick(movie)}>
      {movie.poster_path ? (
        <img src={`https://image.tmdb.org/t/p/w300${movie.poster_path}`} alt={movie.title} loading="lazy" />
      ) : (
        <div className="pov-movie-noposter">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 8h10M7 12h6"/></svg>
        </div>
      )}
      <div className="pov-movie-overlay">
        <p className="pov-movie-title">{movie.title}</p>
        {movie.rating && <p className="pov-movie-rating">★ {Number(movie.rating).toFixed(1)}</p>}
      </div>
    </article>
  );

  if (!allRatings.length) return (
    <div className="pov-empty">
      <span>🎬</span>
      <p>Nenhum filme avaliado ainda.</p>
    </div>
  );

  return (
    <div className="pov-tab-content">
      {recentMovies.length > 0 && (
        <div className="pov-movie-section">
          <p className="pov-movie-section-label">Vistos recentemente</p>
          <div className="pov-movie-row">
            {recentMovies.map((m) => <MoviePoster key={m.id} movie={m} />)}
          </div>
        </div>
      )}
      {topMovies.length > 0 && (
        <div className="pov-movie-section">
          <p className="pov-movie-section-label">Mais bem avaliados</p>
          <div className="pov-movie-row">
            {topMovies.map((m) => <MoviePoster key={m.id} movie={m} />)}
          </div>
        </div>
      )}
      <button className="pov-see-all-btn" onClick={onViewAllRatings}>
        Ver todos os filmes avaliados ({allRatings.length})
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  );
}

function ListasTab({ lists, listsLoading, listsError, listFeedback, isEditable, onCreateList, onOpenList, onEditList, onDeleteList, onShareList }) {
  const [menuOpenId, setMenuOpenId] = React.useState(null);
  const [showAll, setShowAll] = React.useState(false);
  const visibleLists = showAll ? lists : lists.slice(0, 4);

  return (
    <div className="pov-tab-content">
      {isEditable && (
        <button className="pov-create-list-btn" onClick={onCreateList}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nova lista
        </button>
      )}
      {listFeedback && <p className="pov-list-feedback">{listFeedback}</p>}
      {listsError && <p className="pov-list-error">{listsError}</p>}
      {listsLoading && (
        <div className="pov-list-skeleton">
          {[1, 2].map((i) => <div key={i} className="pov-list-skel" />)}
        </div>
      )}
      {!listsLoading && lists.length === 0 && (
        <div className="pov-empty">
          <span>📋</span>
          <p>{isEditable ? 'Nenhuma lista criada ainda.' : 'Nenhuma lista publica.'}</p>
        </div>
      )}
      {!listsLoading && visibleLists.map((lst) => (
        <article key={lst.id} className="pov-list-card">
          <button className="pov-list-main" onClick={() => onOpenList(lst)}>
            <ListThumb movieList={lst} />
            <div className="pov-list-info">
              <div className="pov-list-toprow">
                <strong className="pov-list-name">{lst.title}</strong>
                <span className={`visibility-pill ${lst.visibility.toLowerCase()}`}>
                  {lst.visibility === 'PUBLIC' ? 'Publica' : 'Privada'}
                </span>
              </div>
              <p className="pov-list-desc">{lst.description || 'Sem descricao.'}</p>
              <span className="pov-list-meta">{lst.item_count} filme{lst.item_count !== 1 ? 's' : ''} · {buildListUpdatedAtLabel(lst.updated_at)}</span>
            </div>
          </button>
          {isEditable && (
            <div className="pov-list-actions">
              <button
                className="pov-list-more-btn"
                onClick={() => setMenuOpenId((cur) => cur === lst.id ? null : lst.id)}
                aria-label="Mais opções"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
              </button>
              {menuOpenId === lst.id && (
                <div className="pov-list-menu">
                  <button onClick={() => { onEditList(lst); setMenuOpenId(null); }}>Editar</button>
                  <button onClick={() => { onShareList(lst); setMenuOpenId(null); }}>Compartilhar link</button>
                  <button className="danger" onClick={() => { onDeleteList(lst); setMenuOpenId(null); }}>Excluir</button>
                </div>
              )}
            </div>
          )}
        </article>
      ))}
      {!listsLoading && lists.length > 4 && (
        <button className="pov-see-all-btn" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Ver menos' : `Ver todas as ${lists.length} listas`}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points={showAll ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}/></svg>
        </button>
      )}
    </div>
  );
}

function InsigniasTab({ profile, allRatings, averageRating, topGenres }) {
  const mood = buildProfileMood({ averageRating, topGenres, posts: profile.posts || [], ratingsCount: allRatings.length });
  return (
    <div className="pov-tab-content">
      {/* Panorama */}
      <div className="pov-stats-section">
        <div className="pov-stat-card">
          <p className="pov-stat-label">Nota média</p>
          <h3 className="pov-stat-value">{averageRating.toFixed(2)}</h3>
          <p className="pov-stat-sub">{allRatings.length} filmes avaliados</p>
        </div>
        <div className="pov-stat-card">
          <p className="pov-stat-label">Momento cinéfilo</p>
          <h3 className="pov-stat-value pov-stat-value--mood">{mood.title}</h3>
          <p className="pov-stat-sub">{mood.description}</p>
        </div>
      </div>

      {topGenres.length > 0 && (
        <div className="pov-genres-section">
          <p className="pov-genres-title">Top gêneros assistidos</p>
          {topGenres.map((g) => (
            <div key={g.name} className="pov-genre-row">
              <div className="pov-genre-head">
                <span>{g.name}</span>
                <span>{g.percentage}%</span>
              </div>
              <div className="pov-genre-bar"><span style={{ width: `${g.percentage}%` }} /></div>
            </div>
          ))}
        </div>
      )}

      {/* Insignias */}
      <p className="pov-badges-title">Insígnias</p>
      <div className="pov-badge-grid">
        {(profile.badges || []).map((badge) => (
          <article key={badge.title} className={`pov-badge-card${badge.locked ? ' locked' : ''}`}>
            <span className="pov-badge-icon">{badge.locked ? '🔒' : '🏅'}</span>
            <strong>{badge.title}</strong>
            <p>{badge.description}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ── main component ──────────────────────────────────────────────────────── */

const TABS_EDITABLE = [
  { id: 'posts',    label: 'Posts',   icon: '▦' },
  { id: 'salvos',   label: 'Salvos',  icon: '🔖' },
  { id: 'filmes',   label: 'Filmes',  icon: '🎬' },
  { id: 'listas',   label: 'Listas',  icon: '📋' },
  { id: 'insignias', label: 'Stats', icon: '📊' },
];

const TABS_VIEW = [
  { id: 'posts',   label: 'Posts',  icon: '▦'  },
  { id: 'filmes',  label: 'Filmes', icon: '🎬' },
  { id: 'listas',  label: 'Listas', icon: '📋' },
];

function ProfileOverview({
  profile,
  allRatings = [],
  pageTitle,
  subtitle,
  isEditable,
  profileAction = null,
  onFileChange,
  onOpenSettings,
  onMovieClick,
  onViewAllRatings,
  onConnectionClick,
  onOpenConnections,
  avatarPreviewUrl,
  onNotificationClick,
  onNotificationMarkRead,
  onApproveFollowRequest,
  onRejectFollowRequest,
  lists,
  listsLoading,
  listsError,
  listFeedback,
  onCreateList,
  onOpenList,
  onEditList,
  onDeleteList,
  onShareList,
}) {
  const navigate = useNavigate();
  const avatarSrc = avatarPreviewUrl || profile.user.profile_image_url || anonymousAvatar;
  const TABS = isEditable ? TABS_EDITABLE : TABS_VIEW;
  const [activeTab, setActiveTab] = React.useState('posts');
  const [ratingGenreMap, setRatingGenreMap] = React.useState({});

  React.useEffect(() => {
    const token = getStoredToken();
    if (!token || !allRatings.length) { setRatingGenreMap({}); return; }
    let ignore = false;
    Promise.all(
      allRatings.map((m) =>
        fetchMovieDetails(token, m.movie_id || m.id)
          .then((d) => [m.movie_id || m.id, d.genres || []])
          .catch(() => [m.movie_id || m.id, []])
      )
    ).then((entries) => { if (!ignore) setRatingGenreMap(Object.fromEntries(entries)); });
    return () => { ignore = true; };
  }, [allRatings]);

  const averageRating = React.useMemo(() => {
    const valid = allRatings.map((m) => Number(m.rating)).filter(Number.isFinite);
    return valid.length ? valid.reduce((s, r) => s + r, 0) / valid.length : 0;
  }, [allRatings]);

  const topGenres = React.useMemo(() => {
    if (!allRatings.length) return [];
    const counts = new Map();
    allRatings.forEach((m) => {
      (ratingGenreMap[m.movie_id || m.id] || []).forEach((g) => counts.set(g, (counts.get(g) || 0) + 1));
    });
    const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const total = top.reduce((s, [, c]) => s + c, 0);
    if (!total) return [];
    const pcts = top.map(([, c]) => Math.round((c / total) * 100));
    const gap = 100 - pcts.reduce((s, p) => s + p, 0);
    if (gap !== 0) { const mi = pcts.reduce((bi, v, i, a) => v > a[bi] ? i : bi, 0); pcts[mi] += gap; }
    return top.map(([name, count]) => ({ name, count, percentage: pcts.shift() || 0 }));
  }, [allRatings, ratingGenreMap]);

  const unreadCount = (profile.notifications || []).filter((n) => !n.is_read).length;

  return (
    <div className="pov-page">

      {/* ── Cover strip ───────────────────────────────────────────────── */}
      <div className="pov-cover" />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="pov-hero">
        {/* Top row: avatar + gear */}
        <div className="pov-hero-toprow">
          {isEditable ? (
            <label className="pov-avatar-label" htmlFor="profile-photo">
              <img className="pov-avatar" src={avatarSrc} alt={profile.user.username}
                onError={(e) => { e.currentTarget.src = anonymousAvatar; }} />
              <span className="pov-avatar-badge" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </span>
              <input id="profile-photo" className="profile-file-input" type="file" accept="image/*" onChange={onFileChange} />
            </label>
          ) : (
            <img className="pov-avatar" src={avatarSrc} alt={profile.user.username}
              onError={(e) => { e.currentTarget.src = anonymousAvatar; }} />
          )}

          <div className="pov-hero-top-actions">
            {isEditable && (
              <>
                {/* Bell — links to /notifications */}
                <button
                  className="pov-gear-btn pov-notif-btn"
                  onClick={() => navigate('/notifications')}
                  aria-label="Notificações"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  {unreadCount > 0 && (
                    <span className="pov-notif-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  )}
                </button>
                {/* Gear */}
                <button className="pov-gear-btn" onClick={onOpenSettings} aria-label="Configurações do perfil">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </button>
              </>
            )}
            {profileAction}
          </div>
        </div>

        {/* Identity */}
        <div className="pov-identity">
          <h1 className="pov-username">
            {pageTitle}
            {profile.user.is_verified_critic && (
              <span className="critic-badge critic-badge-profile" aria-label="Critico verificado"> Crítico</span>
            )}
          </h1>
          {(profile.bio || subtitle) && (
            <p className="pov-bio">{profile.bio || subtitle}</p>
          )}

          {/* Stats row */}
          <div className="pov-stats-row">
            <button className="pov-stat" onClick={() => onOpenConnections?.('followers')}>
              <strong>{profile.follower_count || 0}</strong>
              <span>seguidores</span>
            </button>
            <button className="pov-stat" onClick={() => onOpenConnections?.('following')}>
              <strong>{profile.following_count || 0}</strong>
              <span>seguindo</span>
            </button>
            <div className="pov-stat">
              <strong>{allRatings.length}</strong>
              <span>filmes</span>
            </div>
          </div>

          {/* Meta row */}
          <div className="pov-meta-row">
            <span className={`visibility-pill ${profile.is_private_account ? 'private' : 'public'}`}>
              {profile.is_private_account ? '🔒 Privado' : '🌐 Público'}
            </span>
            {profile.user.country && <span className="pov-country">📍 {profile.user.country}</span>}
          </div>

          {/* Genres */}
          {profile.preferred_genres?.length > 0 && (
            <div className="pov-genres">
              {profile.preferred_genres.map((g) => (
                <span key={g} className="pov-genre-chip">{g}</span>
              ))}
            </div>
          )}

          {/* Favorite movie */}
          {profile.favorite_movie && (
            <button
              className="pov-fav-movie"
              onClick={() => onMovieClick?.({ id: profile.favorite_movie.movie_id, movie_id: profile.favorite_movie.movie_id, title: profile.favorite_movie.title, poster_path: profile.favorite_movie.poster_path, release_date: profile.favorite_movie.release_date })}
            >
              {profile.favorite_movie.poster_path ? (
                <img src={`https://image.tmdb.org/t/p/w185${profile.favorite_movie.poster_path}`} alt={profile.favorite_movie.title} />
              ) : <div className="pov-fav-noposter">🎬</div>}
              <div>
                <p className="pov-fav-label">Filme favorito</p>
                <p className="pov-fav-title">{profile.favorite_movie.title}</p>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* ── Private profile guard ─────────────────────────────────────── */}
      {!profile.can_view_private_profile && (
        <div className="pov-private">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <p className="pov-private-title">Conta privada</p>
          <p className="pov-private-sub">{profile.private_profile_message || 'Siga para ver os posts desta conta.'}</p>
        </div>
      )}

      {/* ── Tab bar ───────────────────────────────────────────────────── */}
      {profile.can_view_private_profile && (
        <>
          <div className="pov-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`pov-tab${activeTab === tab.id ? ' pov-tab--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Posts tab ───────────────────────────────── */}
          {activeTab === 'posts' && (
            <PostsTab
              posts={profile.posts || []}
              isSaved={false}
              isEditable={isEditable}
            />
          )}

          {/* ── Salvos tab ───────────────────────────────── */}
          {activeTab === 'salvos' && isEditable && (
            <PostsTab
              posts={profile.saved_posts || []}
              isSaved={true}
              isEditable={isEditable}
            />
          )}

          {/* ── Filmes tab ────────────────────────────────── */}
          {activeTab === 'filmes' && (
            <FilmesTab
              allRatings={allRatings}
              profile={profile}
              onMovieClick={onMovieClick}
              onViewAllRatings={onViewAllRatings}
            />
          )}

          {/* ── Listas tab ────────────────────────────────── */}
          {activeTab === 'listas' && (
            <ListasTab
              lists={lists || profile.public_lists || []}
              listsLoading={listsLoading}
              listsError={listsError}
              listFeedback={listFeedback}
              isEditable={isEditable}
              onCreateList={onCreateList}
              onOpenList={onOpenList}
              onEditList={onEditList}
              onDeleteList={onDeleteList}
              onShareList={onShareList}
            />
          )}

          {/* ── Insignias/Stats tab ───────────────────────── */}
          {activeTab === 'insignias' && (
            <InsigniasTab
              profile={profile}
              allRatings={allRatings}
              averageRating={averageRating}
              topGenres={topGenres}
            />
          )}
        </>
      )}

    </div>
  );
}

export default ProfileOverview;
