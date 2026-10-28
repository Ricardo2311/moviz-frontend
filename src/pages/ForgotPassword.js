import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import { requestPasswordReset } from '../api';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resetLink, setResetLink] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await requestPasswordReset(email);
      setMessage(result.message);
      setResetLink(result.reset_link || '');
      setError('');
    } catch (err) {
      setError(err.message);
      setMessage('');
      setResetLink('');
    }
  };

  return (
    <div className="auth-page">
    <div className="auth-container">
      <span className="auth-logo">Moviz</span>
      <h2>Recuperar senha</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your account email"
            required
          />
        </div>
        <button type="submit">Send reset link</button>
      </form>
      {message ? <p>{message}</p> : null}
      {resetLink ? (
        <p>
          Reset link for local testing:{' '}
          <a href={resetLink}>Open reset password page</a>
        </p>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
      <p>
        Voltar para <Link to="/login">Entrar</Link>
      </p>
    </div>
    </div>
  );
}

export default ForgotPassword;
