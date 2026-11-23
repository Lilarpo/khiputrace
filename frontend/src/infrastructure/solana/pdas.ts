import { PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { RepositoryError } from '../../domain/errors';
import { MAX_U64 } from '../../domain/constraints';
export { MAX_U64 } from '../../domain/constraints';

export function encodeId(id: bigint): Buffer {
  if (id < 0n || id > MAX_U64) throw new RangeError('El ID debe ser un entero u64.');
  const bytes = Buffer.alloc(8);
  bytes.writeBigUInt64LE(id);
  return bytes;
}

export function auditPda(programId: PublicKey, authority: PublicKey, id: bigint): readonly [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('audit'), authority.toBuffer(), encodeId(id)], programId);
}

export function findingPda(programId: PublicKey, audit: PublicKey, id: bigint): readonly [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('finding'), audit.toBuffer(), encodeId(id)], programId);
}

export function accountAddress(value: string): PublicKey {
  try { return new PublicKey(value); }
  catch (cause) { throw new RepositoryError('configuration', 'Dirección de cuenta inválida.', null, null, { cause }); }
}
