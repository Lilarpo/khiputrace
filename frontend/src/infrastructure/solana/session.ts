import { BPF_LOADER_DEPRECATED_PROGRAM_ID, BPF_LOADER_PROGRAM_ID, PublicKey } from '@solana/web3.js';
import { RepositoryError } from '../../domain/errors';
import type { NetworkConfig } from './config';
import type { ChainGateway } from './gateway';

export const DEVNET_GENESIS = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
const PUBLIC_GENESIS = [DEVNET_GENESIS, '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', '4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY'];
const LOADERS = [BPF_LOADER_PROGRAM_ID, BPF_LOADER_DEPRECATED_PROGRAM_ID,
  new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111')];

export class ChainSession {
  constructor(readonly rpc: ChainGateway, readonly config: NetworkConfig) {}

  async assertReady(): Promise<void> {
    const genesis = await this.rpc.getGenesisHash();
    if ((this.config.cluster === 'devnet' && genesis !== DEVNET_GENESIS)
      || (this.config.cluster === 'localnet' && PUBLIC_GENESIS.includes(genesis))) {
      throw new RepositoryError('configuration', 'La identidad de la red RPC no coincide con la configuración.');
    }
    const program = await this.rpc.getAccountInfo(this.config.programId, 'confirmed');
    if (!program?.executable || !LOADERS.some((loader) => loader.equals(program.owner))) {
      throw new RepositoryError('programUnavailable', 'No existe un programa ejecutable con el Program ID configurado.');
    }
  }
}
