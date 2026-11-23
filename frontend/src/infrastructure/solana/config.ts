import { PublicKey } from '@solana/web3.js';
import { RepositoryError } from '../../domain/errors';
import { IDL } from '../anchor/generated/khiputrace';

export interface NetworkConfig {
  readonly cluster: 'localnet' | 'devnet';
  readonly endpoint: string;
  readonly programId: PublicKey;
  readonly commitment: 'confirmed';
}

export function networkConfig(input: {
  readonly cluster: string;
  readonly programId: string;
  readonly endpoint?: string;
}): NetworkConfig {
  if (input.cluster !== 'localnet' && input.cluster !== 'devnet') {
    throw new RepositoryError('configuration', 'Solo se permiten Localnet y Devnet.');
  }
  const endpoint = input.endpoint ?? (input.cluster === 'devnet'
    ? 'https://api.devnet.solana.com' : 'http://127.0.0.1:8899');
  let programId: PublicKey;
  let url: URL;
  try {
    programId = new PublicKey(input.programId);
    url = new URL(endpoint);
  } catch (cause) {
    throw new RepositoryError('configuration', 'RPC o Program ID inválido.', null, null, { cause });
  }
  if (programId.toBase58() !== IDL.address) {
    throw new RepositoryError('configuration', 'El Program ID no coincide con el IDL generado.');
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash
    || (input.cluster === 'localnet' && (!local || url.protocol !== 'http:'))
    || (input.cluster === 'devnet' && url.href !== 'https://api.devnet.solana.com/')) {
    throw new RepositoryError('configuration', 'El RPC no pertenece a una red permitida.');
  }
  return Object.freeze({ cluster: input.cluster, endpoint: url.href, programId, commitment: 'confirmed' });
}
