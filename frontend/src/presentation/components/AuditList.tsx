import type { Audit } from '../../domain/entities';
import { Icon } from './Icon';
export function AuditList({ audits, loading, error, connected, configured, connect, refresh, select, network = 'Devnet' }: {
  audits: readonly Audit[]; loading: boolean; error: string | null; connected: boolean; configured: boolean;
  connect: () => void; refresh: () => void; select?: (address: string) => void; network?: string;
}) {
  if (loading) return <div className="empty-state" role="status"><span className="spinner large" /><h3>Consultando auditorías</h3><p>Esperando la respuesta de Solana {network}…</p></div>;
  if (error) return <div className="empty-state"><span className="feature-icon warning"><Icon name="alert" size={26} /></span><h3>No pudimos cargar tus auditorías</h3><p role="alert">{error}</p><button className="button secondary" onClick={refresh}><Icon name="refresh" size={17} />Reintentar consulta</button></div>;
  if (!connected || !configured || audits.length === 0) return <div className="empty-state">
    <span className="empty-illustration"><Icon name="shield" size={37} /><i /><i /><i /></span>
    <h3>{!connected ? 'Tu espacio de auditoría comienza aquí' : !configured ? 'Tu wallet está lista. El programa, pendiente.' : 'Aún no tienes auditorías'}</h3>
    <p>{!connected ? 'Conecta tu wallet para acceder a las auditorías de tu cuenta.' : !configured ? 'Las consultas estarán disponibles al configurar un programa verificado en la red configurada. No se están mostrando datos de ejemplo.' : 'No se encontraron auditorías para esta dirección. Puedes crear una desde la sección Auditorías.'}</p>
    {!connected && <button className="button secondary" onClick={connect}><Icon name="wallet" size={17} />Conectar wallet</button>}
    <span className="quiet-note"><span className="tiny-dot" />Datos públicos · Autorización verificada on-chain</span>
  </div>;
  return <div className="table-scroll"><table><thead><tr><th>Auditoría</th><th>ID</th><th>Hallazgos activos</th><th>Abiertos</th></tr></thead><tbody>
    {audits.map((audit) => <tr key={audit.address}><td><span className="audit-cell"><Icon name="shield" />{select ? <button className="text-button" onClick={() => select(audit.address)} aria-label={`Ver auditoría ${audit.title}`}>{audit.title}</button> : <strong>{audit.title}</strong>}</span></td><td className="mono">#{audit.id.toString()}</td><td>{audit.findingCount.toString()}</td><td><span className="count-badge">{audit.openFindingCount.toString()}</span></td></tr>)}
  </tbody></table></div>;
}
