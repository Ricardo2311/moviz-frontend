import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

import {
  addMoviesToList,
  fetchMovieWatchStatus,
  fetchMyLists,
  markMovieWatched,
  rateMovie,
  removeMovieFromList,
  unmarkMovieWatched,
} from '../api';
import { getStoredToken } from '../authStorage';
import RichText from './RichText';
import { FEATURES } from '../features';

async function hapticImpact() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch (_) {}
}

const RATING_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

function StarRatingInput({ value, saving, onRate }) {
  const [hoverValue, setHoverValue] = useState(null);
  const displayValue = hoverValue ?? value ?? 0;

  return (
    <div className="movie-rating-stars-block">
      <div
        className="movie-rating-stars"
        onMouseLeave={() => setHoverValue(null)}
        role="slider"
        aria-label="Avaliar filme"
        aria-valuemin={0.5}
        aria-valuemax={5}
        aria-valuenow={displayValue || 0}
      >
        <div className="movie-rating-stars-base">★★★★★</div>
        <div
          className="movie-rating-stars-fill"
          style={{ width: `${(displayValue / 5) * 100}%` }}
        >
          ★★★★★
        </div>
        <div className="movie-rating-stars-hitbox">
          {RATING_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className="movie-rating-star-hit"
              disabled={saving}
              aria-label={`Dar nota ${option.toFixed(1)}`}
              onMouseEnter={() => setHoverValue(option)}
              onFocus={() => setHoverValue(option)}
              onClick={() => onRate(option)}
            />
          ))}
        </div>
      </div>
      <span className="movie-rating-current">
        {displayValue ? `${displayValue.toFixed(1)} / 5` : 'Sem nota ainda'}
      </span>
    </div>
  );
}

function MovieDetailsModal({ details, loading, error, onClose, onRatingSaved, onOpenMovie }) {
  const navigate = useNavigate();
  const [lists, setLists] = useState([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [showLists, setShowLists] = useState(false);
  const [listFeedback, setListFeedback] = useState('');
  const [submittingListId, setSubmittingListId] = useState(null);
  const [userLists, setUserLists] = useState([]);
  const [currentMovieId, setCurrentMovieId] = useState(null);
  const [currentRating, setCurrentRating] = useState(null);
  const [ratingSaving, setRatingSaving] = useState(false);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [showPostPrompt, setShowPostPrompt] = useState(false);
  const [watchedByMe, setWatchedByMe] = useState(false);
  const [watchLoading, setWatchLoading] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    if (!details?.id || !token) {
      setLists([]);
      setShowLists(false);
      setListFeedback('');
      setUserLists([]);
      setCurrentMovieId(null);
      setCurrentRating(null);
      setRatingFeedback('');
      setShowPostPrompt(false);
      setWatchedByMe(false);
      return;
    }

    const isNewMovie = currentMovieId !== details.id;
    if (isNewMovie) {
      setCurrentMovieId(details.id);
      setUserLists(details?.user_lists || []);
      setCurrentRating(typeof details?.user_rating === 'number' ? details.user_rating : null);
      setRatingFeedback('');
      setShowPostPrompt(false);
    } else if (Array.isArray(details?.user_lists) && details.user_lists.length) {
      setUserLists((current) => {
        const currentIds = new Set(current.map((item) => item.id));
        const nextItems = [...current];
        details.user_lists.forEach((item) => {
          if (!currentIds.has(item.id)) {
            currentIds.add(item.id);
            nextItems.push(item);
          }
        });
        return nextItems;
      });
      if (typeof details?.user_rating === 'number') {
        setCurrentRating(details.user_rating);
      }
    }

    setListsLoading(true);
    fetchMyLists(token)
      .then((payload) => setLists(payload || []))
      .catch(() => setLists([]))
      .finally(() => setListsLoading(false));

    if (isNewMovie) {
      fetchMovieWatchStatus(token, details.id)
        .then((status) => setWatchedByMe(status.in_watched || false))
        .catch(() => {});
    }
  }, [currentMovieId, details?.id, details?.user_lists, details?.user_rating]);

  if (!details && !loading && !error) {
    return null;
  }

  const watchProviders = details?.watch_providers || {};
  const friendRatings = details?.friend_ratings || [];
  const communityReviews = details?.community_reviews || [];
  const criticReviews = details?.critic_reviews || [];
  const similarMovies = details?.similar_movies || [];
  const providerGroups = [{ key: 'flatrate', title: 'Streaming' }];
  const hasAnyProvider = providerGroups.some(
    (group) => (watchProviders[group.key] || []).length > 0
  );

  return (
    <div className="movie-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="movie-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          className="movie-modal-close"
          onClick={onClose}
          aria-label="Fechar detalhes"
        >
          x
        </button>

        {loading ? <p className="loading-copy">Carregando detalhes do filme...</p> : null}
        {error ? <p className="error">{error}</p> : null}

        {details ? (
          <>
            <div className="movie-modal-hero">
              {details.poster_path ? (
                <img
                  className="movie-modal-poster"
                  src={`https://image.tmdb.org/t/p/w400${details.poster_path}`}
                  alt={details.title}
                />
              ) : (
                <div className="movie-modal-poster no-poster">No image</div>
              )}

              <div className="movie-modal-copy">
                <p className="eyebrow">Detalhes do filme</p>
                <h2>{details.title}</h2>
                <section className="movie-moviz-score-shell">
                  <p className="movie-moviz-score-label">Selo principal</p>
                  <div className="movie-moviz-score">
                    <strong>
                      {typeof details.average_rating === 'number'
                        ? details.average_rating.toFixed(1)
                        : '--'}
                    </strong>
                    <div>
                      <span>Media Moviz</span>
                      <p>
                        {typeof details.average_rating === 'number'
                          ? `${details.rating_count || 0} avaliacao(oes) da comunidade`
                          : 'Ainda sem avaliacoes da comunidade'}
                      </p>
                    </div>
                  </div>
                </section>
                <div className="movie-modal-meta">
                  <span>{details.release_date || 'Data indisponivel'}</span>
                  <span>
                    {details.runtime ? `${details.runtime} min` : 'Duracao indisponivel'}
                  </span>
                </div>
                <p className="movie-modal-overview">
                  {details.overview || 'Sinopse indisponivel no momento.'}
                </p>
                <div className="movie-modal-tags">
                  {(details.genres || []).map((genre) => (
                    <span key={genre}>{genre}</span>
                  ))}
                </div>
                <div className="movie-modal-list-actions">
                  <div className="movie-rating-panel">
                    <div className="movie-rating-header">
                      <div>
                        <strong>Sua avaliacao</strong>
                        <p>
                          Essa nota entra na sua lista de filmes avaliados, nas insignias e vai
                          alimentar recomendacoes e chatbot no futuro.
                        </p>
                      </div>
                    </div>
                    <StarRatingInput
                      value={currentRating}
                      saving={ratingSaving}
                      onRate={async (value) => {
                        const token = getStoredToken();
                        if (!token || !details?.id) {
                          return;
                        }
                        setRatingSaving(true);
                        setRatingFeedback('');
                        try {
                          const ratedMovie = await rateMovie(token, details.id, {
                            title: details.title,
                            poster_path: details.poster_path,
                            release_date: details.release_date,
                            rating: value,
                          });
                          setCurrentRating(ratedMovie.rating);
                          setRatingFeedback(`Você avaliou este filme com nota ${ratedMovie.rating.toFixed(1)}.`);
                          hapticImpact();
                          onRatingSaved?.(ratedMovie);
                          setShowPostPrompt(true);
                        } catch (submitError) {
                          setRatingFeedback(submitError.message || 'Falha ao salvar avaliação.');
                        } finally {
                          setRatingSaving(false);
                        }
                      }}
                    />
                    {ratingFeedback ? <p className="helper-copy">{ratingFeedback}</p> : null}
                  </div>

                  <button
                    type="button"
                    className={watchedByMe ? 'secondary-button movie-watched-btn active' : 'secondary-button movie-watched-btn'}
                    disabled={watchLoading}
                    onClick={async () => {
                      const token = getStoredToken();
                      if (!token || !details?.id) return;
                      setWatchLoading(true);
                      try {
                        if (watchedByMe) {
                          await unmarkMovieWatched(token, details.id);
                          setWatchedByMe(false);
                        } else {
                          await markMovieWatched(token, {
                            movie_id: details.id,
                            title: details.title,
                            poster_path: details.poster_path,
                            release_date: details.release_date,
                          });
                          setWatchedByMe(true);
                        }
                      } catch {
                        // silently ignore
                      } finally {
                        setWatchLoading(false);
                      }
                    }}
                  >
                    {watchLoading ? '...' : watchedByMe ? 'Assistido' : 'Marcar como assistido'}
                  </button>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      setShowLists((current) => !current);
                      setListFeedback('');
                    }}
                  >
                    Adicionar filme a uma lista
                  </button>
                  {showLists ? (
                    <div className="movie-modal-lists-picker">
                      {listsLoading ? <p>Carregando listas...</p> : null}
                      {!listsLoading && !lists.length ? (
                        <p>Voce ainda nao tem listas disponiveis.</p>
                      ) : null}
                      {!listsLoading && lists.length ? (
                        <div className="movie-modal-lists-scroll">
                          {lists.map((movieList) => {
                            const existingEntry = userLists.find((item) => item.id === movieList.id);
                            const isSubmitting = submittingListId === movieList.id;

                            return (
                              <button
                                key={movieList.id}
                                type="button"
                                className="movie-modal-list-option"
                                onClick={async () => {
                                  const token = getStoredToken();
                                  if (!token) {
                                    return;
                                  }
                                  setSubmittingListId(movieList.id);
                                  setListFeedback('');
                                  try {
                                    if (existingEntry?.item_id) {
                                      await removeMovieFromList(token, movieList.id, existingEntry.item_id);
                                      setUserLists((current) =>
                                        current.filter((item) => item.id !== movieList.id)
                                      );
                                      setListFeedback(`"${details.title}" removido(a) de "${movieList.title}".`);
                                    } else {
                                      const updatedList = await addMoviesToList(token, movieList.id, [
                                        {
                                          movie_id: details.id,
                                          title: details.title,
                                          poster_path: details.poster_path,
                                          release_date: details.release_date,
                                        },
                                      ]);
                                      const matchingItem = (updatedList.items || []).find(
                                        (item) => item.movie_id === details.id
                                      );
                                      setUserLists((current) =>
                                        current.some((item) => item.id === movieList.id)
                                          ? current
                                          : [
                                              ...current,
                                              {
                                                id: movieList.id,
                                                item_id: matchingItem?.id || null,
                                                title: movieList.title,
                                                visibility: movieList.visibility,
                                              },
                                            ]
                                      );
                                      setListFeedback(`"${details.title}" adicionado(a) em "${movieList.title}".`);
                                    }
                                  } catch (submitError) {
                                    setListFeedback(
                                      submitError.message ||
                                        'Falha ao atualizar o filme na lista.'
                                    );
                                  } finally {
                                    setSubmittingListId(null);
                                  }
                                }}
                                disabled={isSubmitting}
                              >
                                <div>
                                  <strong>{movieList.title}</strong>
                                  <span>{movieList.item_count} filme(s)</span>
                                </div>
                                <span>
                                  {isSubmitting
                                    ? existingEntry?.item_id
                                      ? 'Removendo...'
                                      : 'Adicionando...'
                                    : existingEntry?.item_id
                                      ? 'Remover'
                                      : 'Adicionar'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {listFeedback ? <p className="helper-copy">{listFeedback}</p> : null}
                  {userLists.length ? (
                    <div className="movie-modal-existing-lists">
                      <strong>Ja esta em:</strong>
                      <div className="movie-modal-existing-list-chips">
                        {userLists.map((movieList) => (
                          <button
                            key={movieList.id}
                            type="button"
                            className="filter-chip active"
                            onClick={() => {
                              onClose();
                              navigate(`/lists/${movieList.id}`);
                            }}
                          >
                            {movieList.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="helper-copy">Este filme ainda nao foi adicionado a nenhuma das suas listas.</p>
                  )}

                  <button
                    type="button"
                    className="secondary-button movie-share-btn"
                    onClick={async () => {
                      try {
                        const { Share } = await import('@capacitor/share');
                        await Share.share({
                          title: details.title,
                          text: `${details.title}${details.release_date ? ` (${details.release_date.slice(0, 4)})` : ''} — veja no Moviz!`,
                          dialogTitle: 'Compartilhar filme',
                        });
                      } catch (_) {}
                    }}
                  >
                    ↗ Compartilhar
                  </button>

                  <div className="movie-trailer-block">
                    <strong>Trailer</strong>
                    {details.trailer_url ? (
                      <a
                        href={details.trailer_url}
                        target="_blank"
                        rel="noreferrer"
                        className="primary-button movie-trailer-link"
                      >
                        Assistir trailer
                      </a>
                    ) : (
                      <p className="helper-copy">Nao ha trailers disponiveis.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="movie-modal-sections">
              <section>
                <h3>Atores principais</h3>
                <ul className="movie-modal-list">
                  {(details.cast || []).length ? (
                    details.cast.map((actor) => (
                      <li key={`${actor.id}-${actor.name}`}>
                        <strong>{actor.name}</strong>
                        <span>{actor.character || 'Papel nao informado'}</span>
                      </li>
                    ))
                  ) : (
                    <li>Elenco indisponivel.</li>
                  )}
                </ul>
              </section>

              <section>
                <h3>Onde assistir ({details.watch_region || 'BR'})</h3>
                {!hasAnyProvider ? (
                  <p className="provider-empty-copy">
                    Nenhum provedor de streaming foi encontrado para este titulo no Brasil
                    neste momento. Isso geralmente significa que ele ainda nao entrou em
                    catalogos digitais ou esta apenas em exibicao nos cinemas.
                  </p>
                ) : null}
                <div className="provider-groups">
                  {providerGroups.map((group) => (
                    <div key={group.key} className="provider-group">
                      <h4>{group.title}</h4>
                      {(watchProviders[group.key] || []).length ? (
                        <div className="provider-list">
                          {watchProviders[group.key].map((provider) => (
                            <div
                              key={`${group.key}-${provider.provider_id}`}
                              className="provider-chip"
                            >
                              {provider.logo_path ? (
                                <img
                                  src={provider.logo_path}
                                  alt={provider.provider_name}
                                />
                              ) : null}
                              <span>{provider.provider_name}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>Nenhum provedor informado.</p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="friend-ratings-section">
                  <h3>Amigos que avaliaram este filme</h3>
                  {friendRatings.length ? (
                    <div className="friend-ratings-list">
                      {friendRatings.map((friend) => (
                        <button
                          type="button"
                          key={`${friend.username}-${friend.rated_at}`}
                          className="friend-rating-card"
                          onClick={() => {
                            onClose();
                            navigate(`/users/${friend.username}`);
                          }}
                        >
                          {friend.profile_image_url ? (
                            <img src={friend.profile_image_url} alt={friend.username} />
                          ) : (
                            <div className="friend-rating-avatar-fallback">
                              {friend.username.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <strong>@{friend.username}</strong>
                            <p>Nota {Number(friend.rating || 0).toFixed(1)}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="provider-empty-copy">
                      Nenhum amigo seu avaliou este filme ainda.
                    </p>
                  )}
                </div>
              </section>

              <section>
                {FEATURES.verifiedCritics && (<>
                <h3>Criticas verificadas</h3>
                {criticReviews.length ? (
                  <div className="movie-review-list">
                    {criticReviews.map((review) => (
                      <button
                        type="button"
                        key={`critic-${review.id}`}
                        className="movie-review-card"
                        onClick={() => {
                          onClose();
                          navigate(`/users/${review.author.username}`);
                        }}
                      >
                        <div className="movie-review-head">
                          <strong>@{review.author.username}</strong>
                          <div className="movie-review-head-right">
                            {typeof review.rating === 'number' ? (
                              <span className="critic-review-rating">
                                {review.rating.toFixed(1)} / 5
                              </span>
                            ) : null}
                            <span className="critic-badge">Critico verificado</span>
                          </div>
                        </div>
                        <div className="movie-review-flags">
                          {review.contains_spoiler ? <span className="spoiler-flag">Spoiler</span> : null}
                          {review.would_watch_again === true ? <span>Assistiria de novo</span> : null}
                          {review.would_watch_again === false ? <span>Nao assistiria de novo</span> : null}
                        </div>
                        {review.review_headline ? <h4>{review.review_headline}</h4> : null}
                        <p>
                          {review.text_content ? (
                            <RichText text={review.text_content} />
                          ) : (
                            'Sem texto adicional.'
                          )}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="provider-empty-copy">Nao ha reviews de criticos verificados para este filme.</p>
                )}
                </>)}

                <h3>Reviews da comunidade</h3>
                {communityReviews.length ? (
                  <div className="movie-review-list">
                    {communityReviews.map((review) => (
                      <button
                        type="button"
                        key={`community-${review.id}`}
                        className="movie-review-card"
                        onClick={() => {
                          onClose();
                          navigate(`/users/${review.author.username}`);
                        }}
                      >
                        <div className="movie-review-head">
                          <strong>@{review.author.username}</strong>
                          {typeof review.rating === 'number' ? (
                            <span>Nota {review.rating.toFixed(1)}</span>
                          ) : null}
                        </div>
                        <div className="movie-review-flags">
                          {review.contains_spoiler ? <span className="spoiler-flag">Spoiler</span> : null}
                          {review.would_watch_again === true ? <span>Assistiria de novo</span> : null}
                          {review.would_watch_again === false ? <span>Nao assistiria de novo</span> : null}
                        </div>
                        {review.review_headline ? <h4>{review.review_headline}</h4> : null}
                        <p>
                          {review.text_content ? (
                            <RichText text={review.text_content} />
                          ) : (
                            'Sem texto adicional.'
                          )}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="provider-empty-copy">Ainda nao ha reviews da comunidade para este filme.</p>
                )}

                <h3>Filmes similares</h3>
                {similarMovies.length ? (
                  <div className="movie-similar-grid">
                    {similarMovies.map((movie) => (
                      <button
                        key={movie.id}
                        type="button"
                        className="movie-similar-card"
                        onClick={() => onOpenMovie?.(movie)}
                      >
                        {movie.poster_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w300${movie.poster_path}`}
                            alt={movie.title}
                          />
                        ) : (
                          <div className="club-cover-generic">
                            <span className="club-cover-generic-badge" />
                            <div className="club-cover-generic-lines">
                              <span />
                              <span />
                              <span />
                            </div>
                          </div>
                        )}
                        <div>
                          <strong>{movie.title}</strong>
                          <span>{movie.release_date || 'Data indisponivel'}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="provider-empty-copy">Nao encontramos filmes similares agora.</p>
                )}
              </section>
            </div>
          </>
        ) : null}

        {showPostPrompt && details ? (
          <div className="feed-modal-overlay movie-post-prompt-overlay" role="presentation">
            <div className="feed-modal feed-confirm-modal movie-post-prompt" role="dialog" aria-modal="true">
              <button
                type="button"
                className="feed-modal-close"
                onClick={() => setShowPostPrompt(false)}
              >
                x
              </button>
              <p className="eyebrow">Avaliacao salva</p>
              <h2>Quer criar um post/review desse filme agora?</h2>
              <p className="feed-confirm-copy">
                Se continuar, a tela de publicacao abre com <strong>{details.title}</strong> ja selecionado.
              </p>
              <div className="feed-confirm-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowPostPrompt(false)}
                >
                  Agora nao
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    setShowPostPrompt(false);
                    onClose?.();
                    navigate('/posts/new', {
                      state: {
                        prefilledMovie: {
                          id: details.id,
                          title: details.title,
                          poster_path: details.poster_path,
                          release_date: details.release_date,
                        },
                      },
                    });
                  }}
                >
                  Sim, criar review
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default MovieDetailsModal;
