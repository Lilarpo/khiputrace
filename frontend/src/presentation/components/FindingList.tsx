import type { Finding } from '../../domain/entities';
import { severityLabel } from '../config/findings';
export function FindingList({ findings, disabled, edit, resolve, close }: {
  findings: readonly Finding[]; disabled: boolean; edit: (finding: Finding) => void;
  resolve: (finding: Finding) => void; close: (finding: Finding) => void;
}) {
  if (findings.length === 0) return <div className="empty-state"><h3>Esta auditoría aún no tiene hallazgos</h3><p>Crea el primero para documentar un riesgo y su seguimiento.</p></div>;
  return <div className="finding-list">{findings.map((finding) => <article className="panel finding-card" key={finding.address} aria-labelledby={`finding-heading-${finding.id}`}>
    <div className="finding-card-header"><h3 id={`finding-heading-${finding.id}`}>#{finding.id.toString()} · {finding.title}</h3><div className="finding-badges"><span className={`severity-badge ${finding.severity}`}>Gravedad: {severityLabel(finding.severity)}</span><span className={`finding-status ${finding.status}`}>{finding.status === 'open' ? 'Abierto' : 'Resuelto'}</span></div></div>
    <p className="preserve-lines">{finding.description}</p>
    {finding.status === 'resolved' && <div className="remediation"><h4>Acción correctiva registrada</h4><p className="preserve-lines">{finding.correctiveAction}</p></div>}
    <details><summary>Dirección del hallazgo</summary><code className="block-address">{finding.address}</code></details>
    <div className="form-actions">{finding.status === 'open' ? <><button className="button secondary" disabled={disabled} onClick={() => edit(finding)} aria-label={`Modificar hallazgo #${finding.id}`}>Modificar</button><button className="button primary" disabled={disabled} onClick={() => resolve(finding)} aria-label={`Resolver hallazgo #${finding.id}`}>Resolver</button></>
      : <button className="button danger" disabled={disabled} onClick={() => close(finding)} aria-label={`Cerrar hallazgo #${finding.id}`}>Cerrar cuenta</button>}</div>
  </article>)}</div>;
}
