// Menu "⋯" com Denunciar e Bloquear para conteúdo de outras pessoas.
// Exigência da App Store e do Google Play para apps com conteúdo gerado por usuários.
import React, { useEffect, useRef, useState } from 'react';

import { blockUser, getCurrentUser, reportContent } from '../api';
import { apiCache } from '../apiCache';
import { getStoredToken } from '../authStorage';

const REASONS = [
  ['spam', 'Spam ou golpe'],
  ['harassment', 'Assédio ou bullying'],
  ['hate', 'Discurso de ódio'],
  ['sexual', 'Conteúdo sexual ou nudez'],
  ['violence', 'Violência ou ameaça'],
  ['spoiler', 'Spoiler sem aviso'],
  ['other', 'Outro motivo'],
];

const TARGET_LABELS = { post: 'post', comment: 'comentário', user: 'perfil', message: 'mensagem' };

// Id do usuário logado, buscado uma vez por token.
const myIdByToken = new Map();
function useMyUserId(knownId) {
  const [myId, setMyId] = useState(knownId ?? null);
  useEffect(() => {
    if (knownId != null) { setMyId(knownId); return undefined; }
    const token = getStoredToken();
    if (!token) return undefined;
    if (!myIdByToken.has(token)) {
      myIdByToken.set(token, getCurrentUser(token).then((u) => u.id).catch(() => {
        myIdByToken.delete(token);
        return null;
      }));
    }
    let alive = true;
    myIdByToken.get(token).then((id) => { if (alive) setMyId(id); });
    return () => { alive = false; };
  }, [knownId]);
  return myId;
}

function ReportSheet({ targetType, targetId, onClose }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!reason || sending) return;
    setSending(true);
    setError('');
    try {
      const res = await reportContent(getStoredToken(), { targetType, targetId, reason, details });
      setDone(res?.message || 'Denúncia recebida.');
    } catch (err) {
      setError(err.message || 'Não foi possível enviar a denúncia.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="report-sheet-overlay" onClick={onClose} role="presentation">
      <div className="report-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true"
        aria-label={`Denunciar ${TARGET_LABELS[targetType]}`}>
        {done ? (
          <>
            <h3>Obrigado por avisar</h3>
            <p className="report-sheet-copy">{done}</p>
            <button type="button" className="primary-button report-sheet-cancel" onClick={onClose}>Fechar</button>
          </>
        ) : (
          <form onSubmit={submit}>
            <h3>Denunciar {TARGET_LABELS[targetType]}</h3>
            <p className="report-sheet-copy">Por que este conteúdo viola as regras do Moviz? Quem foi denunciado não fica sabendo quem denunciou.</p>
            <div className="report-sheet-reasons" role="radiogroup">
              {REASONS.map(([value, label]) => (
                <label key={value} className={`report-reason${reason === value ? ' selected' : ''}`}>
                  <input type="radio" name="report-reason" value={value} checked={reason === value}
                    onChange={() => setReason(value)} />
                  {label}
                </label>
              ))}
            </div>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000}
              placeholder="Detalhes (opcional)" rows={3} />
            {error ? <p className="error">{error}</p> : null}
            <div className="report-sheet-actions">
              <button type="button" className="secondary-button report-sheet-cancel" onClick={onClose}>Cancelar</button>
              <button type="submit" className="primary-button" disabled={!reason || sending}>
                {sending ? 'Enviando…' : 'Enviar denúncia'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/**
 * targetType/targetId: o que denunciar. author: { id, username } de quem criou.
 * onBlocked(author): chamado depois de bloquear, para a tela esconder o conteúdo.
 * allowBlock=false esconde a opção de bloquear (ex.: a pessoa já está bloqueada).
 */
export default function ContentActions({
  targetType, targetId, author, onBlocked, currentUserId, allowBlock = true, className = '',
}) {
  const myId = useMyUserId(currentUserId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => { if (!rootRef.current?.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menuOpen]);

  if (!author || myId == null || author.id === myId) return null;

  const handleBlock = async () => {
    setMenuOpen(false);
    const ok = window.confirm(
      `Bloquear @${author.username}? Vocês não vão mais ver posts, comentários nem mensagens um do outro. `
      + 'Você pode desbloquear depois nas configurações do perfil.'
    );
    if (!ok) return;
    try {
      await blockUser(getStoredToken(), author.id);
      apiCache.invalidate('my-profile'); // follows desfeitos mudam as contagens do perfil
      onBlocked?.(author);
    } catch (err) {
      window.alert(err.message || 'Não foi possível bloquear agora.');
    }
  };

  return (
    <div className={`content-actions ${className}`} ref={rootRef} onClick={(e) => e.stopPropagation()}>
      <button type="button" className="content-actions-trigger" aria-label="Mais opções"
        aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
        ⋯
      </button>
      {menuOpen ? (
        <div className="content-actions-menu" role="menu">
          <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setReporting(true); }}>
            Denunciar {TARGET_LABELS[targetType]}
          </button>
          {allowBlock ? (
            <button type="button" role="menuitem" className="danger" onClick={handleBlock}>
              Bloquear @{author.username}
            </button>
          ) : null}
        </div>
      ) : null}
      {reporting ? (
        <ReportSheet targetType={targetType} targetId={targetId} onClose={() => setReporting(false)} />
      ) : null}
    </div>
  );
}
