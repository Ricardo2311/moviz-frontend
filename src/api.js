const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';

async function readJson(response, fallbackMessage) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    // detail pode ser string, objeto ({ code, message }) ou lista (erros 422 do FastAPI).
    const { detail } = body;
    let msg = detail;
    if (Array.isArray(detail)) msg = 'Dados inválidos. Revise e tente novamente.';
    else if (detail && typeof detail === 'object') msg = detail.message;
    const error = new Error(msg || body.error || `${fallbackMessage} (${response.status})`);
    error.status = response.status;
    error.code = detail && typeof detail === 'object' && !Array.isArray(detail) ? detail.code : undefined;
    throw error;
  }
  return body;
}

export async function login(username, password) {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return readJson(response, 'Login failed');
}

export async function signup(username, email, password, country) {
  const response = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password, country: country || null }),
  });
  return readJson(response, 'Signup failed');
}

export async function requestPasswordReset(email) {
  const response = await fetch(`${baseUrl}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return readJson(response, 'Password reset request failed');
}

export async function confirmPasswordReset(token, password) {
  const response = await fetch(`${baseUrl}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
  return readJson(response, 'Password reset failed');
}

export async function submitOnboarding(token, payload) {
  const response = await fetch(`${baseUrl}/api/onboarding`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return readJson(response, 'Onboarding save failed');
}

export async function searchMovies(token, query) {
  const response = await fetch(
    `${baseUrl}/api/movies/search?q=${encodeURIComponent(query)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return readJson(response, 'Movie search failed');
}

export async function searchPeople(token, query) {
  const response = await fetch(
    `${baseUrl}/api/people/search?q=${encodeURIComponent(query)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return readJson(response, 'People search failed');
}

export async function fetchFeed(token, mode = 'discover', cursor = null, limit = 10) {
  const params = new URLSearchParams({ mode, limit: String(limit) });
  if (cursor) {
    params.set('cursor', cursor);
  }

  const response = await fetch(`${baseUrl}/api/feed?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Feed fetch failed');
}

export async function createFeedPost(token, payload) {
  const response = await fetch(`${baseUrl}/api/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return readJson(response, 'Post creation failed');
}

export async function fetchFeedPost(token, postId) {
  const response = await fetch(`${baseUrl}/api/posts/${postId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Feed post fetch failed');
}

export async function fetchMyPosts(token, skip = 0, limit = 20) {
  const response = await fetch(`${baseUrl}/api/profile/posts?skip=${skip}&limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'My posts fetch failed');
}

export async function fetchMySavedPosts(token, skip = 0, limit = 20) {
  const response = await fetch(`${baseUrl}/api/profile/saved?skip=${skip}&limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Saved posts fetch failed');
}

export async function suggestHashtags(token, query) {
  const response = await fetch(
    `${baseUrl}/api/hashtags/suggest?q=${encodeURIComponent(query)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return readJson(response, 'Hashtag suggestions failed');
}

export async function suggestMentions(token, query) {
  const response = await fetch(
    `${baseUrl}/api/mentions/suggest?q=${encodeURIComponent(query)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return readJson(response, 'Mention suggestions failed');
}

export async function registerDeviceToken(token, deviceToken, platform = '') {
  const formData = new FormData();
  formData.append('token', deviceToken);
  formData.append('platform', platform);
  const response = await fetch(`${baseUrl}/api/devices/register`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!response.ok) return;
}

export async function fetchNotificationCount(token) {
  const response = await fetch(`${baseUrl}/api/notifications/unread-count`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Notification count fetch failed');
}

export async function markAllNotificationsRead(token) {
  const response = await fetch(`${baseUrl}/api/notifications/read-all`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Mark all read failed');
}

export async function fetchNotifications(token, type = 'all') {
  const params = new URLSearchParams();
  if (type && type !== 'all') {
    params.set('type', type);
  }
  const response = await fetch(`${baseUrl}/api/notifications${params.toString() ? `?${params.toString()}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Notifications fetch failed');
}

export async function markNotificationRead(token, notificationId, isRead = true) {
  const response = await fetch(`${baseUrl}/api/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ is_read: isRead }),
  });
  return readJson(response, 'Notification update failed');
}

export async function searchCatalog(token, query = '', type = 'all') {
  const params = new URLSearchParams();
  params.set('q', query);
  params.set('type', type);
  const response = await fetch(`${baseUrl}/api/search?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Search failed');
}

export async function fetchTrending(token) {
  const response = await fetch(`${baseUrl}/api/trending`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Trending fetch failed');
}

export async function fetchClubs(token, query = '', genres = []) {
  const params = new URLSearchParams();
  if (query) {
    params.set('q', query);
  }
  if (genres.length) {
    params.set('genres', genres.join(','));
  }
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`${baseUrl}/api/clubs${suffix}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Clubs fetch failed');
}

export async function createClub(token, payload) {
  const response = await fetch(`${baseUrl}/api/clubs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return readJson(response, 'Club creation failed');
}

export async function joinClub(token, clubId) {
  const response = await fetch(`${baseUrl}/api/clubs/${clubId}/join`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Club join failed');
}

export async function leaveClub(token, clubId) {
  const response = await fetch(`${baseUrl}/api/clubs/${clubId}/membership`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Club leave failed');
}

export async function cancelClubJoinRequest(token, clubId) {
  const response = await fetch(`${baseUrl}/api/clubs/${clubId}/join-request`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Club request cancel failed');
}

export async function fetchClubDetail(token, clubId) {
  const response = await fetch(`${baseUrl}/api/clubs/${clubId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Club details fetch failed');
}

export async function createClubPost(token, clubId, payload) {
  const response = await fetch(`${baseUrl}/api/clubs/${clubId}/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return readJson(response, 'Club post creation failed');
}

export async function approveClubJoinRequest(token, clubId, requestId) {
  const response = await fetch(`${baseUrl}/api/clubs/${clubId}/requests/${requestId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Club request approval failed');
}

export async function rejectClubJoinRequest(token, clubId, requestId) {
  const response = await fetch(`${baseUrl}/api/clubs/${clubId}/requests/${requestId}/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Club request rejection failed');
}

export async function updateClubMemberRole(token, clubId, memberUserId, role) {
  const response = await fetch(`${baseUrl}/api/clubs/${clubId}/members/${memberUserId}/role`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ role }),
  });
  return readJson(response, 'Club member role update failed');
}

export async function removeClubMember(token, clubId, memberUserId) {
  const response = await fetch(`${baseUrl}/api/clubs/${clubId}/members/${memberUserId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Club member removal failed');
}

export async function removeClubPost(token, clubId, postId) {
  const response = await fetch(`${baseUrl}/api/clubs/${clubId}/posts/${postId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Club post removal failed');
}

export async function fetchClubPosts(token, clubId, cursor = null, limit = 20) {
  const params = new URLSearchParams({ limit });
  if (cursor) {
    params.set('cursor', cursor);
  }
  const response = await fetch(`${baseUrl}/api/clubs/${clubId}/posts?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Club posts fetch failed');
}

export async function reportClubPost(token, clubId, postId, reason) {
  const response = await fetch(`${baseUrl}/api/clubs/${clubId}/posts/${postId}/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  });
  return readJson(response, 'Report failed');
}

export async function fetchClubPostReports(token, clubId) {
  const response = await fetch(`${baseUrl}/api/clubs/${clubId}/reports`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Reports fetch failed');
}

export async function fetchMyLists(token) {
  const response = await fetch(`${baseUrl}/api/lists/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Lists fetch failed');
}

export async function createMyList(token, payload) {
  const response = await fetch(`${baseUrl}/api/lists`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return readJson(response, 'List creation failed');
}

export async function fetchMyListDetail(token, listId) {
  const response = await fetch(`${baseUrl}/api/lists/${listId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'List details fetch failed');
}

export async function fetchUserListDetail(token, username, listId) {
  const response = await fetch(`${baseUrl}/api/users/${username}/lists/${listId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Public list details fetch failed');
}

export async function updateMyList(token, listId, payload) {
  const response = await fetch(`${baseUrl}/api/lists/${listId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return readJson(response, 'List update failed');
}

export async function addMoviesToList(token, listId, movies) {
  const response = await fetch(`${baseUrl}/api/lists/${listId}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ movies }),
  });
  return readJson(response, 'Add movies to list failed');
}

export async function removeMovieFromList(token, listId, itemId) {
  const response = await fetch(`${baseUrl}/api/lists/${listId}/items/${itemId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Remove movie from list failed');
}

export async function reorderMyListItems(token, listId, itemIds) {
  const response = await fetch(`${baseUrl}/api/lists/${listId}/items/reorder`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ item_ids: itemIds }),
  });
  return readJson(response, 'List reorder failed');
}

export async function deleteMyList(token, listId) {
  const response = await fetch(`${baseUrl}/api/lists/${listId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'List deletion failed');
}

export async function togglePostLike(token, postId) {
  const response = await fetch(`${baseUrl}/api/posts/${postId}/like`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Like action failed');
}

export async function createPostComment(token, postId, content) {
  const response = await fetch(`${baseUrl}/api/posts/${postId}/comment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ content }),
  });
  return readJson(response, 'Comment failed');
}

export async function fetchPostComments(token, postId) {
  const response = await fetch(`${baseUrl}/api/posts/${postId}/comments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Comments fetch failed');
}

export async function followUser(token, userId) {
  const response = await fetch(`${baseUrl}/api/users/${userId}/follow`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Follow action failed');
}

export async function unfollowUser(token, userId) {
  const response = await fetch(`${baseUrl}/api/users/${userId}/follow`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Unfollow action failed');
}

export async function removeFollower(token, userId) {
  const response = await fetch(`${baseUrl}/api/users/${userId}/follower`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Follower removal failed');
}

export async function approveFollowRequest(token, userId) {
  const response = await fetch(`${baseUrl}/api/users/${userId}/follow-request/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Follow request approval failed');
}

export async function rejectFollowRequest(token, userId) {
  const response = await fetch(`${baseUrl}/api/users/${userId}/follow-request/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Follow request rejection failed');
}

export async function savePost(token, postId) {
  const response = await fetch(`${baseUrl}/api/posts/${postId}/save`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Save action failed');
}

export async function sharePost(token, postId, friendUsername) {
  const response = await fetch(`${baseUrl}/api/posts/${postId}/share`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ friend_username: friendUsername }),
  });
  return readJson(response, 'Share action failed');
}

export async function fetchDirectConversations(token) {
  const response = await fetch(`${baseUrl}/api/direct/conversations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Direct conversations fetch failed');
}

export async function createDirectGroup(token, payload) {
  const response = await fetch(`${baseUrl}/api/direct/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return readJson(response, 'Direct group creation failed');
}

export async function createDirectConversation(token, friendUsername) {
  const response = await fetch(`${baseUrl}/api/direct/conversations/direct`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ friend_username: friendUsername }),
  });
  return readJson(response, 'Direct conversation creation failed');
}

export async function fetchDirectConversation(token, conversationId) {
  const response = await fetch(`${baseUrl}/api/direct/conversations/${conversationId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Direct conversation fetch failed');
}

export async function sendDirectMessage(token, conversationId, content) {
  const response = await fetch(`${baseUrl}/api/direct/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ content }),
  });
  return readJson(response, 'Direct message send failed');
}

export async function fetchConversationMessages(token, conversationId, beforeId = null) {
  const params = new URLSearchParams();
  if (beforeId != null) params.set('before_id', String(beforeId));
  const qs = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(
    `${baseUrl}/api/direct/conversations/${conversationId}/messages${qs}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return readJson(response, 'Messages fetch failed');
}

export async function getCurrentUser(token) {
  const response = await fetch(`${baseUrl}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Session validation failed');
}

export async function fetchChatStatus(token) {
  const response = await fetch(`${baseUrl}/api/chat/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Chat status failed');
}

export async function earnChatMessages(token) {
  const response = await fetch(`${baseUrl}/api/chat/earn-messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Earn messages failed');
}

export async function syncPremium(token) {
  const response = await fetch(`${baseUrl}/api/premium/sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Premium sync failed');
}

export async function sendChatMessage(token, message, history = []) {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message, history }),
  });
  return readJson(response, 'Chat failed');
}

export async function fetchRecommendationRows(token) {
  const response = await fetch(`${baseUrl}/api/recommendations/rows`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Recommendation rows fetch failed');
}

export async function fetchRecommendations(token, limit = 20) {
  const response = await fetch(`${baseUrl}/api/recommendations?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Recommendations fetch failed');
}

export async function fetchMovies(token, page = 1) {
  const response = await fetch(`${baseUrl}/api/movies?page=${page}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Movie fetch failed');
}

export async function fetchBrowseMovies(token, section) {
  const response = await fetch(`${baseUrl}/api/browse?section=${section}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Browse movies fetch failed');
}

export async function fetchMovieGenres(token) {
  const response = await fetch(`${baseUrl}/api/genres`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Movie genres fetch failed');
}

export async function fetchMovieDetails(token, movieId) {
  const response = await fetch(`${baseUrl}/api/movies/${movieId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Movie details fetch failed');
}

export async function rateMovie(token, movieId, payload) {
  const response = await fetch(`${baseUrl}/api/movies/${movieId}/rating`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return readJson(response, 'Movie rating failed');
}

export async function fetchProfile(token) {
  const response = await fetch(`${baseUrl}/api/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Profile fetch failed');
}

export async function updateProfile(token, payload) {
  const formData = new FormData();
  formData.append('username', payload.username);
  formData.append('bio', payload.bio || '');
  formData.append('country', payload.country || '');
  formData.append('favorite_genres_json', JSON.stringify(payload.favoriteGenres || []));
  formData.append('favorite_movie_json', JSON.stringify(payload.favoriteMovie || null));
  formData.append('is_private_account', payload.isPrivateAccount ? 'true' : 'false');
  formData.append(
    'notification_preferences_json',
    JSON.stringify(payload.notificationPreferences || {})
  );
  formData.append('current_password', payload.currentPassword || '');
  formData.append('new_password', payload.newPassword || '');
  if (payload.profileImageFile) {
    formData.append('profile_image', payload.profileImageFile);
  }

  const response = await fetch(`${baseUrl}/api/profile`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  return readJson(response, 'Profile update failed');
}

export async function fetchMyRatings(token) {
  const response = await fetch(`${baseUrl}/api/profile/ratings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Rated movies fetch failed');
}

export async function fetchUserProfile(token, username) {
  const response = await fetch(`${baseUrl}/api/users/${username}/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'User profile fetch failed');
}

export async function fetchUserRatings(token, username) {
  const response = await fetch(`${baseUrl}/api/users/${username}/ratings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'User ratings fetch failed');
}

export async function fetchUserConnections(token, username, kind) {
  const params = new URLSearchParams({ kind });
  const response = await fetch(`${baseUrl}/api/users/${username}/connections?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'User connections fetch failed');
}

export async function deleteMyAccount(token) {
  const response = await fetch(`${baseUrl}/api/profile`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Account deletion failed');
}

export async function submitCriticApplication(token, payload) {
  const response = await fetch(`${baseUrl}/api/critic-application`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return readJson(response, 'Critic application failed');
}

export async function fetchMyCriticApplication(token) {
  const response = await fetch(`${baseUrl}/api/critic-application`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Critic application fetch failed');
}

export async function fetchCritics(token, limit = 50) {
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await fetch(`${baseUrl}/api/critics?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Critics fetch failed');
}

export async function fetchCriticProfile(token, username) {
  const response = await fetch(`${baseUrl}/api/critics/${encodeURIComponent(username)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Critic profile fetch failed');
}

export async function fetchCriticReviews(token, username, cursor = null, limit = 10) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) {
    params.set('cursor', cursor);
  }
  const response = await fetch(
    `${baseUrl}/api/critics/${encodeURIComponent(username)}/reviews?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return readJson(response, 'Critic reviews fetch failed');
}

export async function fetchMovieWatchStatus(token, movieId) {
  const response = await fetch(`${baseUrl}/api/movies/${movieId}/watch-status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Watch status fetch failed');
}

export async function markMovieWatched(token, payload) {
  const response = await fetch(`${baseUrl}/api/movies/mark-watched`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return readJson(response, 'Mark watched failed');
}

export async function unmarkMovieWatched(token, movieId) {
  const response = await fetch(`${baseUrl}/api/movies/${movieId}/mark-watched`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Unmark watched failed');
}

export async function fetchPostsByHashtag(token, tag, cursor = null, limit = 20) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) {
    params.set('cursor', cursor);
  }
  const response = await fetch(
    `${baseUrl}/api/hashtags/${encodeURIComponent(tag)}/posts?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return readJson(response, 'Hashtag posts fetch failed');
}

export async function fetchGlobalRanking(token, limit = 50) {
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await fetch(`${baseUrl}/api/rankings/global?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Global ranking fetch failed');
}

export async function fetchFriendsRanking(token, limit = 50) {
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await fetch(`${baseUrl}/api/rankings/friends?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Friends ranking fetch failed');
}

export async function fetchCountryRanking(token, limit = 50) {
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await fetch(`${baseUrl}/api/rankings/country?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response, 'Country ranking fetch failed');
}

export async function adminToggleCriticStatus(adminKey, userId, isVerifiedCritic) {
  const response = await fetch(`${baseUrl}/api/admin/users/${userId}/critic-status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': adminKey,
    },
    body: JSON.stringify({ is_verified_critic: isVerifiedCritic }),
  });
  return readJson(response, 'Admin critic toggle failed');
}
