import '../infrastructure/solana/browser-globals';
import type { ApplicationDependencies } from '../application/contracts';
import type { MutationReceipt } from '../domain/ports';
import type { AppServices } from './contracts';
import { createAppServices } from './create-services';
import { StandardWalletConnection } from '../infrastructure/wallet/standard-wallet';
import { RepositoryError } from '../domain/errors';

export interface RuntimeOptions { readonly cluster?: string; readonly endpoint?: string }
export async function createRuntime(programId: string | undefined, options: RuntimeOptions = {}) {
  const cluster = options.cluster ?? 'devnet';
  const network = cluster === 'localnet' ? 'Localnet' : 'Devnet';
  const wallet = new StandardWalletConnection(undefined, cluster === 'localnet' ? 'solana:localnet' : 'solana:devnet');
  let services: AppServices | null = null;
  let configurationError: string | null = null;
  if (programId) {
    try {
      const [{ networkConfig }, { createRepositories }] = await Promise.all([
        import('../infrastructure/solana/config'), import('../infrastructure/anchor/client'),
      ]);
      const config = networkConfig({ cluster, programId, ...(options.endpoint ? { endpoint: options.endpoint } : {}) });
      const readRepositories = createRepositories(config, () => null);
      async function write(operation: (repositories: ApplicationDependencies) => Promise<MutationReceipt>) {
        const signer = await wallet.transactionWallet();
        if (!signer) throw new RepositoryError('walletUnavailable', 'Esta wallet no permite firmar transacciones legacy en la red configurada.');
        const identity = wallet.getSnapshot().account;
        return operation(createRepositories(config, () => wallet.getSnapshot().account === identity ? signer : null));
      }
      services = createAppServices({
        ...readRepositories,
        auditWriter: { createAudit: (input) => write((repositories) => repositories.auditWriter.createAudit(input)) },
        findingWriter: {
          createFinding: (input) => write((repositories) => repositories.findingWriter.createFinding(input)),
          updateFinding: (input) => write((repositories) => repositories.findingWriter.updateFinding(input)),
          resolveFinding: (input) => write((repositories) => repositories.findingWriter.resolveFinding(input)),
          closeFinding: (input) => write((repositories) => repositories.findingWriter.closeFinding(input)),
        },
      });
    } catch { configurationError = 'La configuración del programa no es válida. Revisa red, RPC, despliegue e IDL.'; }
  } else if (cluster !== 'devnet' && cluster !== 'localnet') {
    configurationError = 'Solo se permiten Localnet y Devnet.';
  }
  return { wallet, services, configurationError, network, dispose: () => wallet.dispose() };
}
