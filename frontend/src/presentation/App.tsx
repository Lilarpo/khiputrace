import { useCallback, useState } from 'react';
import type { AuditUseCases, FindingUseCases } from '../application/contracts';
import type { WalletConnection } from '../application/wallet';
import { BrandMark, Icon } from './components/Icon';
import { WalletDialog } from './components/WalletDialog';
import { navigation } from './config/navigation';
import { useWallet } from './hooks/useWallet';
import { useAudits } from './hooks/useAudits';
import { usePage } from './hooks/usePage';
import { Notifications, useNotifications } from './hooks/useNotifications';
import { DashboardPage } from './pages/DashboardPage';
import { AuditsPage } from './pages/AuditsPage';
import { FindingsPage } from './pages/FindingsPage';
import { GuidePage } from './pages/GuidePage';
import './styles.css';

export interface AppProps { wallet: WalletConnection; audits: AuditUseCases | null; configurationError: string | null; network?: string; findings?: FindingUseCases | null }
export function App(props: AppProps) { return <Notifications><Workspace {...props} /></Notifications>; }
function Workspace({ wallet: connection, audits, configurationError, network = 'Devnet', findings = null }: AppProps) {
  const wallet = useWallet(connection);
  const data = useAudits(wallet.account?.address ?? null, audits);
  const page = usePage();
  const [walletOpen, setWalletOpen] = useState(false);
  const closeWallet = useCallback(() => setWalletOpen(false), []);
  const notify = useNotifications();
  const busy = wallet.status === 'connecting' || wallet.status === 'disconnecting';
  const pendingLabel = wallet.status === 'disconnecting' ? 'Desconectando…' : 'Conectando…';
  const address = wallet.account?.address;
  const abbreviated = address ? `${address.slice(0, 5)}…${address.slice(-5)}` : '';
  const copy = async () => {
    if (!address) return;
    try { await navigator.clipboard.writeText(address); notify('Dirección pública copiada.', 'success'); }
    catch { notify('No se pudo copiar. Puedes seleccionar la dirección completa.', 'error'); }
  };
  const dashboardProps = { ...data, network, connected: !!wallet.account, configured: !!audits, connect: () => setWalletOpen(true), showAudits: () => { window.location.hash = 'audits'; } };
  return <div className="app-shell"><a className="skip-link" href="#workspace" onClick={(event) => { event.preventDefault(); document.getElementById('workspace')?.focus(); }}>Saltar al contenido</a>
    <aside className="sidebar"><a href="#overview" className="brand" aria-label="KhipuTrace, inicio"><BrandMark /><span>Khipu<span className="brand-light">Trace</span><small>SEGURIDAD CON TRAZABILIDAD</small></span></a>
      <div className="nav-label">ESPACIO DE TRABAJO</div><nav aria-label="Navegación principal">{navigation.map((item) => <a key={item.id} href={`#${item.id}`} className={`nav-item ${page === item.id ? 'active' : ''}`} aria-current={page === item.id ? 'page' : undefined}><Icon name={item.icon} /><span>{item.label}</span>{page === item.id && <span className="nav-dot" />}</a>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-security"><Icon name="shield" size={23} /><strong>Confianza verificable.</strong><p>La conexión inicia el camino.<br />El programa valida cada paso.</p></div><div className="built-on"><span className="solana-mark">≋</span> Construido sobre Solana <span>↗</span></div></div>
    </aside>
    <div className="workspace"><header className="topbar"><div className="breadcrumb">Espacio de trabajo <span>/</span> <strong>{navigation.find((item) => item.id === page)?.label}</strong></div><div className="header-actions"><span className="network-pill" title="Red objetivo de la aplicación, no una confirmación del despliegue"><span className="status-dot" />Solana {network}</span>
      {wallet.account ? <div className="wallet-connected"><span className="wallet-address" title={address}><Icon name="wallet" size={17} /><span>{abbreviated}</span></span><button className="icon-button" aria-label="Desconectar wallet" onClick={() => void connection.disconnect()}><Icon name="logout" size={17} /></button></div>
        : <button className="button primary wallet-top-button" disabled={busy} onClick={() => setWalletOpen(true)}>{busy ? <span className="spinner" /> : <Icon name="wallet" size={17} />}{busy ? pendingLabel : 'Conectar wallet'}</button>}
    </div></header>
      <main id="workspace" tabIndex={-1}>
        <div className="environment-banner"><span className="banner-label"><span className="tiny-dot" /> RED DE PRUEBAS</span><span>Trabajamos en {network}. Usa datos sintéticos y fondos sin valor real.</span><span className="banner-end">Sin operaciones Mainnet<Icon name="shield" size={14} /></span></div>
        {configurationError && <div className="config-error" role="alert"><Icon name="alert" /><span>{configurationError}</span></div>}
        {page === 'overview' && <DashboardPage {...dashboardProps} />}
        <div hidden={page !== 'audits'}><AuditsPage key={address ?? 'disconnected'} {...dashboardProps} useCases={audits} authority={address ?? null} canSign={wallet.account?.canSign === true} network={network} /></div>
        <div hidden={page !== 'findings'}><FindingsPage key={address ?? 'disconnected'} active={page === 'findings'} audits={data.audits} auditStatus={data.status} auditError={data.error} auditCases={audits} findingCases={findings} authority={address ?? null} canSign={wallet.account?.canSign === true} network={network} refreshAudits={data.refresh} connect={() => setWalletOpen(true)} /></div>
        {page === 'guide' && <GuidePage network={network} />}
        <section className="connection-strip" aria-label="Estado de conexión"><div><span className="feature-icon small"><Icon name="wallet" /></span><div><strong>{wallet.account ? wallet.account.name : 'Tu wallet, tu identidad'}</strong><p>{wallet.account ? 'Dirección pública conectada a esta sesión' : 'Conecta sin compartir claves ni solicitar firmas.'}</p></div></div>
          {address ? <div className="address-line"><code>{address}</code><button className="icon-button" onClick={() => void copy()} aria-label="Copiar dirección pública"><Icon name="copy" size={17} /></button></div> : <span className="tag">Sin conexión</span>}
        </section>
        <footer><span>© KhipuTrace <span className="footer-divider">/</span> Hecho para construir confianza.</span><span><span className="status-dot" />{data.status === 'ready' ? `${network} verificada · Lectura confirmada` : audits ? `${network} objetivo · Consulta pendiente` : 'Programa pendiente de configuración'}</span></footer>
      </main>
    </div><WalletDialog open={walletOpen} close={closeWallet} connection={connection} wallet={wallet} network={network} />
  </div>;
}
