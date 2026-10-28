import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { fetchChatStatus, getCurrentUser, syncPremium } from '../api';
import { getStoredToken } from '../authStorage';
import {
  fetchPremiumPackages, isPurchaseAvailable, purchasePremium, restorePremium,
} from '../monetization';

const PACKAGE_LABELS = {
  ANNUAL: 'Anual',
  MONTHLY: 'Mensal',
};

export default function Premium() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [premiumLimit, setPremiumLimit] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const canPurchase = isPurchaseAvailable();

  useEffect(() => {
    const token = getStoredToken();
    if (!token) { navigate('/login', { replace: true }); return; }
    let cancelled = false;
    (async () => {
      try {
        const [me, status] = await Promise.all([getCurrentUser(token), fetchChatStatus(token)]);
        if (cancelled) return;
        setUser(me);
        setPremiumLimit(status.premium_daily_limit);
        if (canPurchase && !me.is_premium) {
          const available = await fetchPremiumPackages(me.id);
          if (!cancelled) setPackages(available);
        }
      } catch (_) {
        if (!cancelled) setError('Não foi possível carregar os planos agora.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [navigate, canPurchase]);

  const confirmWithServer = async () => {
    const result = await syncPremium(getStoredToken());
    setUser((u) => ({ ...u, is_premium: result.is_premium }));
    return result.is_premium;
  };

  const handleBuy = async (aPackage) => {
    setBusy(true);
    setError('');
    setFeedback('');
    try {
      const bought = await purchasePremium(user.id, aPackage);
      if (!bought) return;
      const active = await confirmWithServer();
      setFeedback(active
        ? 'Bem-vindo ao Premium! Seus benefícios já estão ativos.'
        : 'Compra recebida. A confirmação da loja pode levar alguns minutos.');
    } catch (err) {
      setError(err.message || 'Não foi possível concluir a compra.');
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    setBusy(true);
    setError('');
    setFeedback('');
    try {
      await restorePremium(user.id);
      const active = await confirmWithServer();
      setFeedback(active ? 'Assinatura restaurada!' : 'Nenhuma assinatura ativa encontrada nesta conta da loja.');
    } catch (err) {
      setError(err.message || 'Não foi possível restaurar as compras.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="premium-page">
      <header className="premium-hero">
        <p className="eyebrow">Moviz Premium</p>
        <h1>Mais cinema, zero anúncio</h1>
        <p className="premium-subtitle">Apoie o Moviz e converse muito mais com o CineBot.</p>
      </header>

      <ul className="premium-benefits">
        <li><span>✦</span>{premiumLimit ? `${premiumLimit} mensagens por dia` : 'Muito mais mensagens'} no CineBot</li>
        <li><span>✦</span>Nenhum anúncio no app</li>
        <li><span>✦</span>Apoio direto a um app brasileiro independente</li>
      </ul>

      {loading ? <p className="loading-copy">Carregando planos...</p> : null}
      {feedback ? <p className="success-copy">{feedback}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!loading && user?.is_premium ? (
        <div className="premium-active">
          <strong>Você é Premium ✦</strong>
          <p>Gerencie ou cancele a assinatura nas configurações da sua loja (Google Play ou App Store).</p>
        </div>
      ) : null}

      {!loading && !user?.is_premium && !canPurchase ? (
        <p className="helper-copy premium-unavailable">
          As assinaturas ficam disponíveis no app Moviz para Android e iPhone.
        </p>
      ) : null}

      {!loading && !user?.is_premium && canPurchase ? (
        <div className="premium-plans">
          {packages.length === 0 && !error ? (
            <p className="helper-copy">Nenhum plano disponível no momento.</p>
          ) : null}
          {packages.map((pkg) => (
            <button
              key={pkg.identifier}
              type="button"
              className={`premium-plan${pkg.packageType === 'ANNUAL' ? ' premium-plan--featured' : ''}`}
              onClick={() => handleBuy(pkg)}
              disabled={busy}
            >
              <span className="premium-plan-name">{PACKAGE_LABELS[pkg.packageType] || pkg.product.title}</span>
              <span className="premium-plan-price">{pkg.product.priceString}</span>
              {pkg.packageType === 'ANNUAL' && pkg.product.pricePerMonthString ? (
                <span className="premium-plan-note">equivale a {pkg.product.pricePerMonthString}/mês</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      {canPurchase && user ? (
        <button type="button" className="secondary-button premium-restore" onClick={handleRestore} disabled={busy}>
          Restaurar compras
        </button>
      ) : null}

      <p className="premium-legal">
        A assinatura renova automaticamente até ser cancelada nas configurações da loja, com pelo menos
        24 horas de antecedência do fim do período. Ao assinar você concorda com os{' '}
        <Link to="/terms">Termos de Uso</Link> e a <Link to="/privacy">Política de Privacidade</Link>.
      </p>
    </div>
  );
}
