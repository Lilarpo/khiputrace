import type { Audit } from '../../domain/entities';
import { Icon } from '../components/Icon';
import { KhipuArt } from '../components/KhipuArt';
import { AuditList } from '../components/AuditList';
export interface DashboardProps {
  network?: string; audits: readonly Audit[]; status: string; error: string | null; connected: boolean; configured: boolean;
  connect: () => void; refresh: () => void; showAudits: () => void;
}
export function DashboardPage(props: DashboardProps) {
  const ready = props.status === 'ready';
  const metrics = [
    { label: 'Auditorías', value: BigInt(props.audits.length), icon: 'shield' as const, note: 'Bajo tu responsabilidad' },
    { label: 'Hallazgos activos', value: props.audits.reduce((sum, audit) => sum + audit.findingCount, 0n), icon: 'scan' as const, note: 'Cuentas de hallazgos existentes' },
    { label: 'Pendientes de resolver', value: props.audits.reduce((sum, audit) => sum + audit.openFindingCount, 0n), icon: 'link' as const, note: 'Requieren una acción correctiva' },
  ];
  return <>
    <div className="page-heading"><div><p className="eyebrow">TU CENTRO DE SEGURIDAD</p><h1>Una visión clara.<br />Una huella verificable.</h1><p>Gestiona auditorías y conecta cada hallazgo con su solución.</p></div><span className="workspace-label"><span className="status-dot" />Entorno de desarrollo</span></div>
    <section className="hero" aria-label="Bienvenida"><div className="hero-copy"><span className="hero-label"><Icon name="shield" size={16} /> SEGURIDAD CON TRAZABILIDAD</span><h2>De la detección<br />a la confianza.</h2><p>Tu trabajo de seguridad, conectado en Solana.<br />Cada hallazgo necesita una acción correctiva.</p>
      {!props.connected ? <button className="button mint" onClick={props.connect}>Conectar mi wallet<Icon name="arrow" size={17} /></button> : <span className="hero-connected"><Icon name="check" size={17} />Wallet conectada · Consultas públicas</span>}
    </div><KhipuArt /></section>
    <section className="metrics" aria-label="Resumen de auditorías">{metrics.map((metric) => <article className="metric" key={metric.label}><div className="metric-top"><span>{metric.label}</span><span className="metric-icon"><Icon name={metric.icon} /></span></div><strong>{ready ? metric.value.toString() : '—'}</strong><p>{ready ? metric.note : 'Disponible tras consultar tu cuenta'}</p></article>)}</section>
    <div className="content-grid"><section className="panel audit-panel"><div className="panel-heading"><div><h2>Tus auditorías</h2><p>El punto de partida de cada revisión.</p></div><button className="text-button" onClick={props.showAudits}>Ver sección<Icon name="arrow" size={16} /></button></div>
      <AuditList {...props} loading={props.status === 'loading'} /></section>
      <aside className="panel workflow"><p className="eyebrow">DEL HALLAZGO A LA SOLUCIÓN</p><h2>Un flujo con propósito.</h2><ol><li><span>01</span><div><strong>Documenta</strong><p>Relaciona cada hallazgo con una auditoría.</p></div></li><li><span>02</span><div><strong>Corrige</strong><p>Registra una acción correctiva para resolverlo.</p></div></li><li><span>03</span><div><strong>Verifica</strong><p>Solo los hallazgos resueltos pueden cerrarse.</p></div></li></ol><div className="workflow-note"><Icon name="shield" /><span>La autoridad se valida en el programa, no en la interfaz.</span></div></aside></div>
  </>;
}
