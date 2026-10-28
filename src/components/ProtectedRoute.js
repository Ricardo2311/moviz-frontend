import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { getCurrentUser } from '../api';
import { getStoredToken } from '../authStorage';
import { apiCache } from '../apiCache';

/**
 * ProtectedRoute — guards all authenticated routes.
 *
 * KEY FIX: the previous version called getCurrentUser on every
 * location.pathname change, showing a loading spinner on EVERY
 * page navigation. Now it only calls the API when the token changes
 * or the cache is stale (>45 s). All other navigations are instant.
 */
function ProtectedRoute() {
  const location = useLocation();
  const token    = getStoredToken();

  // Read cached user synchronously — avoids loading flash on revisit
  const cachedUser = apiCache.get('current-user');
  const [status, setStatus] = React.useState(
    !token ? 'no-token' : cachedUser ? 'ready' : 'loading'
  );
  const [user, setUser] = React.useState(cachedUser ?? null);

  React.useEffect(() => {
    if (!token) {
      setStatus('no-token');
      return;
    }

    // Fresh cache — no API call needed
    if (!apiCache.isStale('current-user')) {
      const fresh = apiCache.get('current-user');
      if (fresh) { setUser(fresh); setStatus('ready'); }
      return;
    }

    let ignore = false;
    // Only show spinner when there is NO cached data at all
    if (!cachedUser) setStatus('loading');

    getCurrentUser(token)
      .then((payload) => {
        if (ignore) return;
        apiCache.set('current-user', payload);
        setUser(payload);
        setStatus('ready');
      })
      .catch(() => {
        if (ignore) return;
        setStatus('invalid');
      });

    return () => { ignore = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]); // ← only token, NOT location.pathname

  if (!token || status === 'no-token' || status === 'invalid') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (status === 'loading') {
    return (
      <div className="lazy-page-loader">
        <div className="lazy-spinner" />
      </div>
    );
  }

  if (user && !user.onboarding_completed && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  if (user && user.onboarding_completed && location.pathname === '/onboarding') {
    return <Navigate to="/home" replace />;
  }

  return <Outlet context={{ currentUser: user }} />;
}

export default ProtectedRoute;
