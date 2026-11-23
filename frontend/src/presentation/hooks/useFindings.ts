import { useCallback, useEffect, useRef, useState } from 'react';
import type { AuditUseCases, FindingUseCases } from '../../application/contracts';
import type { Audit, Finding } from '../../domain/entities';
import { isApplicationError } from '../../application/errors';
interface FindingsState {
  readonly status: 'loading' | 'ready' | 'error';
  readonly audit: Audit | null;
  readonly findings: readonly Finding[];
  readonly error: string | null;
}
export function useFindings(address: string, authority: string, audits: AuditUseCases, findings: FindingUseCases) {
  const [revision, setRevision] = useState(0);
  const request = useRef(0);
  const [state, setState] = useState<FindingsState>({ status: 'loading', audit: null, findings: [], error: null });
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const id = ++request.current;
    setState({ status: 'loading', audit: null, findings: [], error: null });
    void Promise.all([audits.get.execute({ address }), findings.list.execute({ audit: address })]).then(([audit, entries]) => {
      if (id !== request.current) return;
      if (!audit || audit.authority !== authority) {
        setState({ status: 'error', audit: null, findings: [], error: 'La auditoría ya no está disponible para esta wallet.' });
        return;
      }
      setState({ status: 'ready', audit, findings: entries, error: null });
    }).catch((cause: unknown) => {
      if (id === request.current) setState({ status: 'error', audit: null, findings: [], error: isApplicationError(cause) ? cause.message : 'No se pudieron consultar los hallazgos.' });
    });
    return () => { request.current++; };
  }, [address, authority, audits, findings, revision]);
  return { ...state, refresh };
}
