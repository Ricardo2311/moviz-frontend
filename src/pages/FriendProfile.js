import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import HomeButton from '../components/HomeButton';
import MovieDetailsModal from '../components/MovieDetailsModal';
import ProfileOverview from '../components/ProfileOverview';
import { fetchMovieDetails, fetchUserProfile, fetchUserRatings, followUser, unfollowUser } from '../api';
import { getStoredToken } from '../authStorage';

function ConfirmActionModal({ open, title, message, confirmLabel, loading, onClose, onConfirm }) {
  if (!open) {
    return null;
  }

  return (
    <div className="feed-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="feed-modal confirm-action-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button type="button" className="feed-modal-close" onClick={onClose}>
          x
        </button>
        <p className="eyebrow">Confirmacao</p>
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="create-post-actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button type="button" className="primary-button" onClick={onConfirm} disabled={loading}>
            {loading ? 'Atualizando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function FriendProfile() {
  const [profile, setProfile] = useState(null);
  const [allRatings, setAllRatings] = useState([]);
  const [pageError, setPageError] = useState(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [selectedMovieDetails, setSelectedMovieDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const { username } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    fetchUserProfile(token, username)
      .then(async (profilePayload) => {
        const ratingsPayload = profilePayload.can_view_private_profile
          ? await fetchUserRatings(token, username).catch(() => [])
          : [];
        setProfile(profilePayload);
        setAllRatings(ratingsPayload || []);
      })
      .catch((err) => setPageError(err.message));
  }, [navigate, username]);

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

  if (pageError) {
    return <p className="error">{pageError}</p>;
  }

  if (!profile) {
    return <p className="loading-copy">Carregando perfil do amigo...</p>;
  }

  const handleToggleFollow = async () => {
    const token = getStoredToken();
    if (!token || !profile?.user?.id || followLoading) {
      return;
    }
    const wantsToUnfollow = Boolean(profile.is_following || profile.follow_request_pending);
    if (wantsToUnfollow) {
      setConfirmModalOpen(true);
      return;
    }

    setFollowLoading(true);
    setPageError(null);
    try {
      if (wantsToUnfollow) {
        await unfollowUser(token, profile.user.id);
      } else {
        const response = await followUser(token, profile.user.id);
        setProfile((current) =>
          current
            ? {
                ...current,
                is_following: Boolean(response.following),
                follow_request_pending: Boolean(response.pending),
                follower_count: Math.max(
                  0,
                  (current.follower_count || 0) + (response.following ? 1 : 0)
                ),
              }
            : current
        );
        return;
      }
      setProfile((current) =>
        current
          ? {
              ...current,
              is_following: false,
              follow_request_pending: false,
              follower_count: Math.max(
                0,
                (current.follower_count || 0) - (current.is_following ? 1 : 0)
              ),
            }
          : current
      );
    } catch (err) {
      setPageError(err.message || 'Falha ao atualizar seguimento.');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleConfirmUnfollow = async () => {
    const token = getStoredToken();
    if (!token || !profile?.user?.id || followLoading) {
      return;
    }

    setFollowLoading(true);
    setPageError(null);
    try {
      await unfollowUser(token, profile.user.id);
      setProfile((current) =>
        current
          ? {
              ...current,
              is_following: false,
              follow_request_pending: false,
              follower_count: Math.max(
                0,
                (current.follower_count || 0) - (current.is_following ? 1 : 0)
              ),
            }
          : current
      );
      setConfirmModalOpen(false);
    } catch (err) {
      setPageError(err.message || 'Falha ao atualizar seguimento.');
    } finally {
      setFollowLoading(false);
    }
  };

  return (
    <>
      <HomeButton />
      <ProfileOverview
        profile={profile}
        allRatings={allRatings}
        pageTitle={`Perfil de @${profile.user.username}`}
        subtitle="Veja os filmes assistidos, as insignias e a rede social deste perfil."
        isEditable={false}
        profileAction={(
          <button
            type="button"
            className={profile.is_following ? 'secondary-button' : 'primary-button'}
            onClick={handleToggleFollow}
            disabled={followLoading}
          >
            {followLoading
              ? 'Atualizando...'
              : profile.is_following
                ? 'Deixar de seguir'
                : profile.follow_request_pending
                  ? 'Pedido enviado'
                  : profile.is_private_account
                    ? 'Pedir para seguir'
                    : 'Seguir'}
          </button>
        )}
        onOpenSettings={() => {}}
        onOpenConnections={(kind) => navigate(`/users/${profile.user.username}/connections/${kind}`)}
        onMovieClick={handleMovieClick}
        onViewAllRatings={() => navigate(`/users/${profile.user.username}/ratings`)}
        onConnectionClick={(friendUsername) => navigate(`/users/${friendUsername}`)}
        onOpenList={(movieList) => navigate(`/users/${profile.user.username}/lists/${movieList.id}`)}
      />

      <MovieDetailsModal
        details={selectedMovieDetails || selectedMovie}
        loading={detailsLoading}
        error={detailsError}
        onOpenMovie={handleMovieClick}
        onClose={() => {
          setSelectedMovie(null);
          setSelectedMovieDetails(null);
          setDetailsLoading(false);
          setDetailsError(null);
        }}
      />
      <ConfirmActionModal
        open={confirmModalOpen}
        title="Parar de seguir?"
        message={`Tem certeza que deseja parar de seguir @${profile.user.username}?`}
        confirmLabel="Parar de seguir"
        loading={followLoading}
        onClose={() => {
          if (!followLoading) {
            setConfirmModalOpen(false);
          }
        }}
        onConfirm={handleConfirmUnfollow}
      />
    </>
  );
}

export default FriendProfile;
