import { Program } from '@anchor-lang/core';
import { Connection } from '@solana/web3.js';
import type { ApplicationDependencies } from '../../application/contracts';
import { networkConfig } from '../solana/config';
import type { NetworkConfig } from '../solana/config';
import type { ChainGateway } from '../solana/gateway';
import { ChainSession } from '../solana/session';
import { TransactionSender } from '../solana/transactions';
import type { TransactionWallet } from '../solana/transactions';
import { AccountReader } from './accounts';
import { IDL } from './generated/khiputrace';
import type { Khiputrace } from './generated/khiputrace';
import { AnchorRepositories } from './repositories';

export function createRepositories(
  config: NetworkConfig,
  getWallet: () => TransactionWallet | null,
  rpc: ChainGateway = new Connection(config.endpoint, { commitment: 'confirmed' }),
): ApplicationDependencies {
  // Revalidar también objetos de configuración construidos fuera de networkConfig.
  const checked = networkConfig({ cluster: config.cluster, endpoint: config.endpoint, programId: config.programId.toBase58() });
  const program = new Program<Khiputrace>(IDL, { connection: new Connection(checked.endpoint, 'confirmed') });
  const session = new ChainSession(rpc, checked);
  const repositories = new AnchorRepositories(program, new AccountReader(session, program), new TransactionSender(session, getWallet));
  return { auditReader: repositories, auditWriter: repositories, findingReader: repositories, findingWriter: repositories };
}
