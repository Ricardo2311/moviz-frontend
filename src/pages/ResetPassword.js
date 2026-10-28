import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { confirmPasswordReset } from '../api';

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

function PasswordField({ label, value, onChange, id }) {
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
          required
          autoComplete="new-password"
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

function PasswordStrength({ password }) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ['Fraca', 'Razoável', 'Boa', 'Forte'];
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e'];
  const label  = labels[score - 1] || 'Muito fraca';
  const color  = colors[score - 1] || '#ef4444';

  return (
    <div className="pwd-strength">
      <div className="pwd-strength-bar">
        {[1, 2, 3, 4].map((s) => (
          <span
            key={s}
            className="pwd-strength-seg"
            style={{ background: s <= score ? color : 'var(--bg-4)' }}
          />
        ))}
      </div>
      <span className="pwd-strength-label" style={{ color }}>{label}</span>
    </div>
  );
}

export default function ResetPassword() {
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading]                 = useState(false);
  const [message, setMessage]                 = useState('');
  const [error, setError]                     = useState('');
  const navigate  = useNavigate();
  const location  = useLocation();
  const resetToken = useMemo(
    () => new URLSearchParams(location.search).get('token') || '',
    [location.search]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resetToken) { setError('Token de redefinição não encontrado.'); return; }
    if (password.length < 6) { setError('A senha deve ter ao menos 6 caracteres.'); return; }
    if (password !== confirmPassword) { setError('As senhas não coincidem.'); return; }

    setLoading(true);
    setError('');
    try {
      const result = await confirmPasswordReset(resetToken, password);
      setMessage(result.message || 'Senha redefinida com sucesso!');
      setTimeout(() => navigate('/login', { replace: true }), 1800);
    } catch (err) {
      setError(err.message || 'Falha ao redefinir senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <span className="auth-logo">Moviz</span>
        <h2>Criar nova senha</h2>
        <p className="auth-subtitle">Escolha uma senha forte para proteger sua conta.</p>

        {message ? (
          <div className="auth-success">
            <span>✅</span> {message}
            <p style={{ marginTop: 8, fontSize: '0.82rem', color: 'var(--text-3)' }}>
              Redirecionando para o login...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <PasswordField
              id="new-password"
              label="Nova senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <PasswordStrength password={password} />

            <PasswordField
              id="confirm-password"
              label="Confirmar nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            {password && confirmPassword && password !== confirmPassword && (
              <p className="auth-match-error">As senhas não coincidem.</p>
            )}

            {error && <p className="error">{error}</p>}

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading || !password || !confirmPassword}
            >
              {loading ? 'Salvando...' : 'Redefinir senha'}
            </button>
          </form>
        )}

        <p className="auth-footer-link">
          Voltar para <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
