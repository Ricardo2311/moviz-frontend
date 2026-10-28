import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { getCurrentUser, login, signup } from '../api';
import { storeToken } from '../authStorage';
import { apiCache } from '../apiCache';
import { COUNTRIES } from '../countries';

/* ── SVG eye icons (shared shape, reused for both fields) ─────── */
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

function PasswordField({ id, label, value, onChange, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="password-field">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {show ? <EyeOpen /> : <EyeOff />}
        </button>
      </div>
    </div>
  );
}

function Signup() {
  const [username, setUsername]             = useState('');
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [country, setCountry]               = useState('');
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');

  const navigate = useNavigate();

  const passwordMismatch = password && confirmPassword && password !== confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter ao menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await signup(username, email, password, country);
      const authResult = await login(username, password);
      storeToken(authResult.access_token);

      // Cache user so ProtectedRoute skips the extra API call
      const user = await getCurrentUser(authResult.access_token);
      apiCache.set('current-user', user);

      navigate('/onboarding', { replace: true });
    } catch (err) {
      setError(err.message || 'Falha ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <span className="auth-logo">Moviz</span>
        <h2>Criar conta</h2>

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="signup-username">Nome de usuário</label>
            <input
              id="signup-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Escolha um nome de usuário"
              autoComplete="username"
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="signup-email">E-mail</label>
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Seu endereço de e-mail"
              autoComplete="email"
              required
            />
          </div>

          <PasswordField
            id="signup-password"
            label="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />

          <PasswordField
            id="signup-confirm-password"
            label="Confirmar senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />

          {passwordMismatch && (
            <p className="auth-match-error" role="alert">As senhas não coincidem.</p>
          )}

          <div className="auth-field">
            <label htmlFor="signup-country">País</label>
            <select
              id="signup-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              <option value="">Selecione seu país</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {error && <p className="error" role="alert">{error}</p>}

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading || !username || !email || !password || !confirmPassword || !!passwordMismatch}
          >
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <p className="auth-footer-link">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
        <p className="auth-legal-notice">
          Ao criar uma conta, você concorda com nossos{' '}
          <Link to="/terms">Termos de Uso</Link> e{' '}
          <Link to="/privacy">Política de Privacidade</Link>.
        </p>
      </div>
    </div>
  );
}

export default Signup;
