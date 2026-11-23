import { useEffect, useState } from 'react';
import type { Audit } from '../../domain/entities';
import type { AuditUseCases } from '../../application/contracts';
import { isApplicationError } from '../../application/errors';
export function AuditDetail({ address, authority, useCases, revision, close }: {
  address: string; authority: string; useCases: AuditUseCases; revision: number; close: () => void;
}) {
  const [state, setState] = useState<{ loading: boolean; audit: Audit | null; error: string | null }>({ loading: true, audit: null, error: null });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ loading: true, audit: null, error: null });
    void useCases.get.execute({ address }).then((audit) => {
      if (!active) return;
      if (audit && audit.authority !== authority) { setState({ loading: false, audit: null, error: 'Esta auditoría no pertenece a la wallet conectada.' }); return; }
      setState({ loading: false, audit, error: null });
    }).catch((cause: unknown) => { if (active) setState({ loading: false, audit: null, error: isApplicationError(cause) ? cause.message : 'No se pudo consultar el detalle.' }); });
    return () => { active = false; };
  }, [address, authority, useCases, revision, retry]);
  return <section className="panel audit-detail" aria-labelledby="audit-detail-title"><div className="panel-heading"><h2 id="audit-detail-title">Detalle de auditoría</h2><button className="text-button" onClick={close}>Cerrar detalle</button></div>
    {state.loading ? <p role="status">Consultando detalle…</p> : state.error ? <><p role="alert">{state.error}</p><button className="button secondary" onClick={() => setRetry((value) => value + 1)}>Reintentar detalle</button></> : !state.audit ? <p>No se encontró la cuenta de auditoría.</p> : <><h3>{state.audit.title}</h3><dl><dt>ID de auditoría</dt><dd>{state.audit.id.toString()}</dd><dt>Cuenta PDA</dt><dd className="mono">{state.audit.address}</dd><dt>Autoridad</dt><dd className="mono">{state.audit.authority}</dd><dt>Hallazgos activos</dt><dd>{state.audit.findingCount.toString()}</dd><dt>Hallazgos abiertos</dt><dd>{state.audit.openFindingCount.toString()}</dd><dt>Siguiente ID de hallazgo</dt><dd>{state.audit.nextFindingId.toString()}</dd></dl><p className="quiet-note">Los contadores provienen de la cuenta. Cerrar un hallazgo no hace retroceder su secuencia de IDs.</p></>}
  </section>;
}
