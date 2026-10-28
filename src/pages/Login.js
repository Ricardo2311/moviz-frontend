import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { getCurrentUser, login } from '../api';
import { clearStoredToken, getStoredToken, storeToken } from '../authStorage';
import { apiCache } from '../apiCache';

/* ── SVG eye icons ─────────────────────────────────────────────── */
const EyeOpen = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" width="20" height="20" aria-hidden="true">
    <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z"/>
    <circle cx="12" cy="12" r="2.8"/>
  </svg>
);

const EyeOff = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" width="20" height="20" aria-hidden="true">
    <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z"/>
    <circle cx="12" cy="12" r="2.8"/>
    <path d="M5 19 19 5"/>
  </svg>
);

function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  const navigate    = useNavigate();
  const location    = useLocation();
  const redirectTo  = location.state?.from?.pathname || '/home';

  /* Auto-redirect if already logged in (use cache first to avoid flicker) */
  React.useEffect(() => {
    const token = getStoredToken();
    if (!token) return;

    // If we have a fresh cached user, redirect immediately without API call
    const cachedUser = apiCache.get('current-user');
    if (cachedUser && !apiCache.isStale('current-user')) {
      navigate(cachedUser.onboarding_completed ? '/home' : '/onboarding', { replace: true });
      return;
    }

    let ignore = false;
    getCurrentUser(token)
      .then((user) => {
        if (ignore) return;
        apiCache.set('current-user', user);
        navigate(user.onboarding_completed ? '/home' : '/onboarding', { replace: true });
      })
      .catch(() => {
        if (ignore) return;
        clearStoredToken();
      });

    return () => { ignore = true; };
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(identifier, password);

      if (!result || !result.access_token) {
        setError(result?.detail || 'Credenciais inválidas. Tente novamente.');
        return;
      }

      storeToken(result.access_token);

      // Fetch + cache user so ProtectedRoute renders instantly (no extra API call)
      const user = await getCurrentUser(result.access_token);
      apiCache.set('current-user', user);

      navigate(user.onboarding_completed ? redirectTo : '/onboarding', { replace: true });
    } catch (err) {
      setError(err.message || 'Falha ao entrar. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <span className="auth-logo">Moviz</span>
        <h2>Entrar</h2>

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="login-identifier">Usuário ou e-mail</label>
            <input
              id="login-identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Seu usuário ou e-mail"
              autoComplete="username"
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="login-password">Senha</label>
            <div className="password-field">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOpen /> : <EyeOff />}
              </button>
            </div>
          </div>

          {error && <p className="error" role="alert">{error}</p>}

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading || !identifier || !password}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="auth-footer-link">
          <Link to="/forgot-password">Esqueceu sua senha?</Link>
        </p>
        <p className="auth-footer-link">
          Não tem conta? <Link to="/signup">Criar conta</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
