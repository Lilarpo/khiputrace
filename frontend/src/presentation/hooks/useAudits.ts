import { useCallback, useEffect, useRef, useState } from 'react';
import type { Audit } from '../../domain/entities';
import type { AuditUseCases } from '../../application/contracts';
import { isApplicationError } from '../../application/errors';
import { useNotifications } from './useNotifications';
interface AuditState { owner: string | null; status: 'idle' | 'loading' | 'ready' | 'error'; audits: readonly Audit[]; error: string | null }
const initial: AuditState = { owner: null, status: 'idle', audits: [], error: null };
export function useAudits(authority: string | null, useCases: AuditUseCases | null) {
  const [state, setState] = useState<AuditState>(initial);
  const [revision, setRevision] = useState(0);
  const request = useRef(0);
  const notify = useNotifications();
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const id = ++request.current;
    if (!authority || !useCases) { setState(initial); return; }
    setState((previous) => ({ owner: authority, status: 'loading', audits: previous.owner === authority ? previous.audits : [], error: null }));
    void useCases.list.execute({ authority }).then((audits) => {
      if (request.current === id) setState({ owner: authority, status: 'ready', audits, error: null });
    }).catch((cause: unknown) => {
      if (request.current !== id) return;
      const error = isApplicationError(cause) ? cause.message : 'No se pudieron consultar las auditorías. Inténtalo de nuevo.';
      setState((previous) => ({ owner: authority, status: 'error', audits: previous.owner === authority ? previous.audits : [], error })); notify(error, 'error');
    });
    return () => { request.current++; };
  }, [authority, useCases, revision, notify]);
  // No mostrar datos de la cuenta anterior ni durante el primer render de un cambio.
  return { ...(authority && state.owner === authority && useCases ? state : initial), refresh };
}
