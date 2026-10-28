import './App.css';
import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

// These tiny pages load eagerly (always needed on first visit)
import Login          from './pages/Login';
import Signup         from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword  from './pages/ResetPassword';
import PrivacyPolicy  from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout      from './components/AppLayout';
import { FEATURES }   from './features';

// All app pages are lazy-loaded — each becomes its own JS chunk.
// The browser only downloads a page's code the first time you visit it.
const Onboarding    = lazy(() => import('./pages/Onboarding'));
const Home          = lazy(() => import('./pages/Home'));
const Feed          = lazy(() => import('./pages/Feed'));
const CreatePost    = lazy(() => import('./pages/CreatePost'));
const Direct        = lazy(() => import('./pages/Direct'));
const Profile       = lazy(() => import('./pages/Profile'));
const ListDetail    = lazy(() => import('./pages/ListDetail'));
const FriendProfile = lazy(() => import('./pages/FriendProfile'));
const RatedMovies   = lazy(() => import('./pages/RatedMovies'));
const Connections   = lazy(() => import('./pages/Connections'));
const Clubs         = lazy(() => import('./pages/Clubs'));
const ClubDetail    = lazy(() => import('./pages/ClubDetail'));
const CreateClubPost = lazy(() => import('./pages/CreateClubPost'));
const Explore       = lazy(() => import('./pages/Explore'));
const Critics       = lazy(() => import('./pages/Critics'));
const Hashtag       = lazy(() => import('./pages/Hashtag'));
const Rankings      = lazy(() => import('./pages/Rankings'));
const BrowseMovies  = lazy(() => import('./pages/BrowseMovies'));
const Notifications = lazy(() => import('./pages/Notifications'));
const PostDetail    = lazy(() => import('./pages/PostDetail'));
const MyPosts       = lazy(() => import('./pages/MyPosts'));
const Recommendations = lazy(() => import('./pages/Recommendations'));
const Chatbot       = lazy(() => import('./pages/Chatbot'));
const Premium       = lazy(() => import('./pages/Premium'));

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Forward to Sentry if initialized
    try {
      const Sentry = window.__SENTRY__;
      if (Sentry?.captureException) Sentry.captureException(error, { extra: info });
    } catch (_) {}
    if (process.env.NODE_ENV !== 'production') console.error('ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <p className="error-boundary__icon">⚠</p>
          <h2>Algo deu errado</h2>
          <p>O app encontrou um problema inesperado.</p>
          <button
            className="primary-button"
            onClick={() => this.setState({ hasError: false })}
          >
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Shown while a lazy page chunk is downloading (first visit only). */
function PageLoader() {
  return (
    <div className="lazy-page-loader">
      <div className="lazy-spinner" />
    </div>
  );
}

function BackButtonHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cleanup = () => {};
    import('@capacitor/app').then(({ App: CapApp }) => {
      CapApp.addListener('backButton', ({ canGoBack }) => {
        // Close innermost dialog first (post-rate prompt inside movie modal)
        const innerDialog = document.querySelector('.movie-post-prompt-overlay');
        if (innerDialog) {
          innerDialog.querySelector('.secondary-button')?.click();
          return;
        }
        // Close rewarded ad modal
        const rewardedAd = document.querySelector('.rewarded-ad-overlay');
        if (rewardedAd) {
          rewardedAd.querySelector('.rewarded-ad-cancel')?.click();
          return;
        }
        // Close movie details modal
        const movieOverlay = document.querySelector('.movie-modal-overlay');
        if (movieOverlay) {
          movieOverlay.click();
          return;
        }
        // Navigate back or minimize app to home screen
        if (canGoBack) {
          navigate(-1);
        } else {
          CapApp.minimizeApp();
        }
      }).then((handle) => {
        cleanup = () => handle.remove();
      });
    });
    return () => cleanup();
  }, [navigate]);

  return null;
}

function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <span className="offline-banner__icon">⚠</span>
      <span>Sem conexão — verifique sua internet</span>
    </div>
  );
}

function DeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cleanup = () => {};
    import('@capacitor/app').then(({ App: CapApp }) => {
      CapApp.addListener('appUrlOpen', (event) => {
        try {
          const url = new URL(event.url);
          const path = url.pathname + url.search;
          if (path) navigate(path, { replace: true });
        } catch (_) {}
      }).then((handle) => {
        cleanup = () => handle.remove();
      });
    });

    return () => cleanup();
  }, [navigate]);

  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <BackButtonHandler />
        <DeepLinkHandler />
        <OfflineBanner />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/"               element={<Login />} />
          <Route path="/login"          element={<Login />} />
          <Route path="/signup"         element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password"  element={<ResetPassword />} />
          <Route path="/privacy"        element={<PrivacyPolicy />} />
          <Route path="/terms"          element={<TermsOfService />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/onboarding"                          element={<Onboarding />} />
              <Route path="/home"                                element={<Home />} />
              <Route path="/feed"                                element={<Feed />} />
              <Route path="/posts/new"                           element={<CreatePost />} />
              <Route path="/direct"                              element={<Direct />} />
              <Route path="/profile"                             element={<Profile />} />
              <Route path="/lists/:listId"                       element={<ListDetail />} />
              <Route path="/users/:username/lists/:listId"       element={<ListDetail />} />
              <Route path="/profile/ratings"                     element={<RatedMovies />} />
              <Route path="/users/:username/connections/:kind"   element={<Connections />} />
              <Route path="/explore"                             element={<Explore />} />
              {FEATURES.verifiedCritics && (
                <Route path="/critics"                           element={<Critics />} />
              )}
              <Route path="/clubs"                               element={<Clubs />} />
              <Route path="/clubs/:clubId"                       element={<ClubDetail />} />
              <Route path="/clubs/:clubId/posts/new"             element={<CreateClubPost />} />
              <Route path="/users/:username"                     element={<FriendProfile />} />
              <Route path="/users/:username/ratings"             element={<RatedMovies />} />
              <Route path="/recommendations"                     element={<Recommendations />} />
              <Route path="/chat"                                element={<Chatbot />} />
              <Route path="/premium"                             element={<Premium />} />
              <Route path="/hashtags/:tag"                       element={<Hashtag />} />
              <Route path="/rankings"                            element={<Rankings />} />
              <Route path="/browse/:section"                     element={<BrowseMovies />} />
              <Route path="/notifications"                       element={<Notifications />} />
              <Route path="/posts/:postId"                       element={<PostDetail />} />
              <Route path="/profile/posts"                       element={<MyPosts />} />
              <Route path="/profile/saved"                       element={<MyPosts />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </Router>
    </ErrorBoundary>
  );
}

export default App;
