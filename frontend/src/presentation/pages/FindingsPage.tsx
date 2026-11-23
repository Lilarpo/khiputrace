import { useEffect, useState } from 'react';
import type { Audit, Finding } from '../../domain/entities';
import type { AuditUseCases, FindingUseCases } from '../../application/contracts';
import { useFindings } from '../hooks/useFindings';
import { useFindingMutation } from '../hooks/useFindingMutation';
import { FindingForm } from '../components/FindingForm';
import type { FindingEditorRequest } from '../components/FindingForm';
import { FindingList } from '../components/FindingList';
import { CloseFindingDialog } from '../components/CloseFindingDialog';
import { TransactionNotice } from '../components/TransactionNotice';
interface FindingsPageProps {
  active: boolean; audits: readonly Audit[]; auditStatus: string; auditError: string | null;
  auditCases: AuditUseCases | null; findingCases: FindingUseCases | null; authority: string | null;
  canSign: boolean; network: string; refreshAudits: () => void; connect: () => void;
}
export function FindingsPage(props: FindingsPageProps) {
  const [visited, setVisited] = useState(props.active);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (props.active) setVisited(true); }, [props.active]);
  const audit = props.audits.find((entry) => entry.address === selected) ?? props.audits[0];
  return <><div className="page-heading"><div><p className="eyebrow">HALLAZGOS DE SEGURIDAD</p><h1>Cada hallazgo, una solución.</h1><p>Documenta riesgos, registra correcciones y verifica su resolución.</p></div></div>
    {!props.authority ? <div className="panel empty-state"><h2>Conecta tu wallet para consultar hallazgos</h2><button className="button primary" onClick={props.connect}>Conectar para consultar hallazgos</button></div>
      : !props.auditCases || !props.findingCases ? <p className="config-error">La gestión de hallazgos estará disponible al configurar un programa verificado.</p>
      : props.auditStatus === 'loading' && !audit ? <p role="status">Consultando tus auditorías…</p>
      : props.auditError && !audit ? <div className="panel empty-state"><p role="alert">{props.auditError}</p><button className="button secondary" onClick={props.refreshAudits}>Reintentar auditorías</button></div>
      : !audit ? <p className="panel empty-state">Primero crea una auditoría desde la sección Auditorías.</p>
      : <><div className="panel audit-selector form-field"><label htmlFor="finding-audit">Auditoría de los hallazgos</label><select id="finding-audit" value={audit.address} disabled={busy || props.auditStatus === 'loading'} onChange={(event) => setSelected(event.target.value)}>{props.audits.map((entry) => <option key={entry.address} value={entry.address}>#{entry.id.toString()} · {entry.title}</option>)}</select></div>
        {props.auditError && <p role="alert">No se pudo actualizar el listado de auditorías: {props.auditError}</p>}
        {visited && <FindingWorkspace key={audit.address} address={audit.address} authority={props.authority} auditCases={props.auditCases} findingCases={props.findingCases} canSign={props.canSign} network={props.network} refreshAudits={props.refreshAudits} busyChanged={setBusy} />}
      </>}
  </>;
}
function FindingWorkspace({ address, authority, auditCases, findingCases, canSign, network, refreshAudits, busyChanged }: {
  address: string; authority: string; auditCases: AuditUseCases; findingCases: FindingUseCases;
  canSign: boolean; network: string; refreshAudits: () => void; busyChanged: (busy: boolean) => void;
}) {
  const data = useFindings(address, authority, auditCases, findingCases);
  const [editor, setEditor] = useState<FindingEditorRequest | null>(null);
  const [closing, setClosing] = useState<Finding | null>(null);
  const mutation = useFindingMutation(() => { data.refresh(); refreshAudits(); });
  useEffect(() => { busyChanged(mutation.busy); return () => busyChanged(false); }, [mutation.busy, busyChanged]);
  const disabled = !canSign || mutation.locked || data.status !== 'ready' || !!editor || !!closing;
  return <section aria-label="Gestión de hallazgos">
    <div className="panel-heading findings-heading"><h2 id="finding-list-title" tabIndex={-1}>Hallazgos de la auditoría</h2><div className="form-actions"><button className="button secondary" disabled={mutation.busy || data.status === 'loading'} onClick={() => { setEditor(null); data.refresh(); refreshAudits(); }}>Actualizar hallazgos</button><button className="button primary" disabled={disabled} onClick={() => setEditor({ kind: 'create' })}>Crear hallazgo</button></div></div>
    <TransactionNotice state={mutation.state} network={network} confirmedTitle={mutation.title} errorTitle="No se pudo completar la operación del hallazgo" />
    {!canSign && <p role="status">Tu wallet permite consultar. Para modificar necesitas firma legacy en la red configurada.</p>}
    {data.status === 'loading' ? <p role="status">Consultando hallazgos y contadores…</p> : data.error ? <div className="panel empty-state"><p role="alert">{data.error}</p><button className="button secondary" onClick={data.refresh}>Reintentar hallazgos</button></div> : data.audit && <>
      <dl className="finding-counters panel" aria-label="Contadores de hallazgos"><div><dt>Activos</dt><dd>{data.audit.findingCount.toString()}</dd></div><div><dt>Abiertos</dt><dd>{data.audit.openFindingCount.toString()}</dd></div><div><dt>Siguiente ID</dt><dd>{data.audit.nextFindingId.toString()}</dd></div></dl>
      {editor && <FindingForm request={editor} audit={data.audit} authority={authority} network={network} useCases={findingCases} mutation={mutation} close={() => setEditor(null)} />}
      <FindingList findings={data.findings} disabled={disabled} edit={(finding) => setEditor({ kind: 'update', finding })} resolve={(finding) => setEditor({ kind: 'resolve', finding })} close={setClosing} />
      {closing && <CloseFindingDialog finding={closing} authority={authority} network={network} useCases={findingCases} mutation={mutation} close={() => { setClosing(null); document.getElementById('finding-list-title')?.focus(); }} />}
    </>}
  </section>;
}
