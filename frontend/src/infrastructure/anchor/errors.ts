import { AnchorError } from '@anchor-lang/core';
import { SendTransactionError } from '@solana/web3.js';
import { RepositoryError } from '../../domain/errors';
import { IDL } from './generated/khiputrace';

export function programFailure(code: number, cause: unknown, reference: string | null = null): RepositoryError {
  const entry = IDL.errors.find((error) => error.code === code);
  return new RepositoryError(entry ? 'programRejected' : 'transactionFailed',
    entry?.msg ?? 'El programa rechazó la transacción.', reference, code, { cause });
}

export function mapError(cause: unknown): RepositoryError {
  if (cause instanceof RepositoryError) return cause;
  if (cause instanceof AnchorError) return programFailure(cause.error.errorCode.number, cause);
  if (cause instanceof SendTransactionError) {
    const anchor = cause.logs ? AnchorError.parse(cause.logs) : null;
    if (anchor) return programFailure(anchor.error.errorCode.number, cause);
    return new RepositoryError('transactionFailed', 'El RPC rechazó la transacción.', null, null, { cause });
  }
  if (cause instanceof RangeError) {
    return new RepositoryError('configuration', cause.message, null, null, { cause });
  }
  if (typeof cause === 'object' && cause !== null && 'code' in cause && cause.code === 4001) {
    return new RepositoryError('walletRejected', 'La wallet rechazó la solicitud.', null, null, { cause });
  }
  return new RepositoryError('network', 'No se pudo completar la solicitud a Solana.', null, null, { cause });
}

export async function repositoryCall<T>(operation: () => Promise<T>): Promise<T> {
  try { return await operation(); } catch (cause) { throw mapError(cause); }
}
