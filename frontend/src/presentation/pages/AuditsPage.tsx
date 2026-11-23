import { useState } from 'react';
import type { AuditUseCases } from '../../application/contracts';
import type { DashboardProps } from './DashboardPage';
import { AuditList } from '../components/AuditList';
import { AuditDetail } from '../components/AuditDetail';
import { CreateAuditForm } from '../components/CreateAuditForm';
import { Icon } from '../components/Icon';
export function AuditsPage(props: DashboardProps & { useCases: AuditUseCases | null; authority: string | null; canSign: boolean; network: string }) {
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const refresh = () => { props.refresh(); setRevision((value) => value + 1); };
  const enabled = props.connected && props.configured && props.canSign;
  return <><div className="page-heading"><div><p className="eyebrow">ESPACIO DE TRABAJO</p><h1>Auditorías</h1><p>Gestiona las auditorías de la wallet conectada.</p></div><div className="form-actions"><button className="button secondary" disabled={!props.connected || !props.configured || props.status === 'loading'} onClick={refresh}><Icon name="refresh" size={17} />Actualizar</button><button className="button primary" disabled={!enabled || creating} onClick={() => setCreating(true)}>Crear auditoría</button></div></div>
    {props.connected && props.configured && !props.canSign && <p className="config-error" role="status">Esta wallet permite consultar, pero no ofrece firma de transacciones legacy en la red configurada.</p>}
    {creating && props.useCases && props.authority && enabled && <CreateAuditForm useCases={props.useCases} authority={props.authority} network={props.network} confirmed={refresh} close={() => setCreating(false)} />}
    <section className="panel"><div className="panel-heading"><h2>Registro de auditorías</h2><span className="tag">{props.network}</span></div><AuditList {...props} network={props.network} refresh={refresh} loading={props.status === 'loading'} select={setSelected} /></section>
    {selected && props.useCases && props.authority && <AuditDetail key={selected} address={selected} authority={props.authority} useCases={props.useCases} revision={revision} close={() => setSelected(null)} />}
  </>;
}
