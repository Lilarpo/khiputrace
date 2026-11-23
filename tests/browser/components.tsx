// Dobles explícitos de contratos Application, solo cargados por Playwright.
import { createRoot } from 'react-dom/client';
import { App } from '../../frontend/src/presentation/App';
import type { Finding } from '../../frontend/src/domain/entities';
import type { FindingUseCases, AuditUseCases } from '../../frontend/src/application/contracts';
import type { WalletConnection, WalletSnapshot } from '../../frontend/src/application/wallet';
import { RepositoryError } from '../../frontend/src/domain/errors';
const authority = '11111111111111111111111111111112';
const audit = { address: '11111111111111111111111111111113', authority, id: 0n, title: 'Auditoría de componente', findingCount: 3n, openFindingCount: 2n, nextFindingId: 8n };
const scenario = new URLSearchParams(window.location.search).get('scenario');
let written = false;
const useCases: AuditUseCases = {
  list: { async execute() { if (written && scenario === 'refresh-error') throw new RepositoryError('network', 'Refresco fallido de prueba.'); return [audit]; } },
  get: { async execute() { if (scenario === 'detail-error') throw new RepositoryError('network', 'Detalle fallido de prueba.'); return scenario === 'missing' ? null : audit; } },
  create: { async execute() {
    if (scenario === 'unknown') throw new RepositoryError('confirmationUnknown', 'Consulta la firma antes de repetir la operación.', 'firma-controlada-no-Devnet');
    written = true; return { reference: 'recibo-controlado-no-Devnet' };
  } },
};
const findingScenario = scenario?.startsWith('findings-') === true;
if (findingScenario) { audit.findingCount = 2n; audit.openFindingCount = 1n; }
let findingWritten = false;
const entries: readonly Finding[] = [
  { address: '11111111111111111111111111111114', audit: audit.address, id: 5n, title: 'Hallazgo abierto de componente', description: 'Descripción sintética de componente', severity: 'high', status: 'open', correctiveAction: null },
  { address: '11111111111111111111111111111115', audit: audit.address, id: 6n, title: 'Hallazgo resuelto de componente', description: 'Descripción de hallazgo resuelto', severity: 'critical', status: 'resolved', correctiveAction: 'Corrección sintética documentada' },
];
async function findingWrite() {
  if (scenario === 'findings-unknown') throw new RepositoryError('confirmationUnknown', 'Comprueba la firma antes de repetir la operación.', 'firma-controlada-de-hallazgo');
  if (scenario === 'findings-pending') await new Promise<void>((resolve) => window.addEventListener('test:confirm-finding', () => resolve(), { once: true }));
  findingWritten = true;
  return { reference: 'recibo-controlado-de-hallazgo' };
}
const findingCases: FindingUseCases = {
  list: { async execute() {
    if (scenario === 'findings-list-error' || findingWritten && scenario === 'findings-refresh-error') throw new RepositoryError('network', 'Consulta de hallazgos fallida de prueba.');
    if (scenario === 'findings-late') { document.documentElement.dataset.findingQuery = 'pending'; await new Promise<void>((resolve) => window.addEventListener('test:release-findings', () => resolve(), { once: true })); }
    return entries;
  } },
  create: { execute: findingWrite }, update: { execute: findingWrite }, resolve: { execute: findingWrite }, close: { execute: findingWrite },
};
let snapshot: WalletSnapshot = { choices: [], status: 'connected', error: null, account: { address: authority, name: 'Wallet de componente', canSign: true } };
const listeners = new Set<() => void>();
window.addEventListener('test:component-disconnect', () => { snapshot = { ...snapshot, account: null, status: 'disconnected' }; listeners.forEach((listener) => listener()); });
const wallet: WalletConnection = { getSnapshot: () => snapshot, subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, connect: async () => {}, disconnect: async () => {} };
const root = document.getElementById('root');
if (!root) throw new Error('Falta root de prueba');
createRoot(root).render(<><p className="environment-banner">Prueba de componentes · datos controlados, sin RPC ni transacciones.</p><App findings={findingScenario ? findingCases : null} wallet={wallet} audits={useCases} configurationError={null} network="Localnet" /></>);
