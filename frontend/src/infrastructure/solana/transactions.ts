import { Transaction } from '@solana/web3.js';
import type { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { utils } from '@anchor-lang/core';
import type { MutationReceipt } from '../../domain/ports';
import { RepositoryError } from '../../domain/errors';
import { mapError, programFailure } from '../anchor/errors';
import type { ChainSession } from './session';

export interface TransactionWallet {
  readonly publicKey: PublicKey;
  signTransaction(transaction: Transaction): Promise<Transaction>;
}

export class TransactionSender {
  constructor(private readonly session: ChainSession, private readonly getWallet: () => TransactionWallet | null) {}

  wallet(): TransactionWallet {
    const wallet = this.getWallet();
    if (!wallet) throw new RepositoryError('walletUnavailable', 'Conecta una wallet para firmar.');
    return { publicKey: wallet.publicKey, signTransaction: (transaction) => wallet.signTransaction(transaction) };
  }

  async send(instruction: TransactionInstruction, wallet: TransactionWallet): Promise<MutationReceipt> {
    const { rpc } = this.session;
    await this.session.assertReady();
    const validity = await rpc.getLatestBlockhash('confirmed');
    const transaction = new Transaction({ feePayer: wallet.publicKey, ...validity }).add(instruction);
    const message = transaction.serializeMessage();
    let signed: Transaction;
    try { signed = await wallet.signTransaction(transaction); }
    catch (cause) {
      throw new RepositoryError('walletRejected', 'La wallet no pudo firmar la transacción.', null, null, { cause });
    }
    if (!message.equals(signed.serializeMessage()) || !signed.verifySignatures()
      || !this.wallet().publicKey.equals(wallet.publicKey)) {
      throw new RepositoryError('walletRejected', 'La wallet o el mensaje cambiaron durante la firma.');
    }
    // La firma ya existe antes del envío: conservarla si la confirmación queda incierta.
    const signatureBytes = signed.signature;
    if (!signatureBytes) throw new RepositoryError('walletRejected', 'La wallet no devolvió una firma.');
    const reference = utils.bytes.bs58.encode(signatureBytes);
    await this.session.assertReady();
    if (!this.wallet().publicKey.equals(wallet.publicKey)) {
      throw new RepositoryError('walletRejected', 'La wallet cambió antes del envío.');
    }
    try {
      const returned = await rpc.sendRawTransaction(signed.serialize(), {
        skipPreflight: false, preflightCommitment: 'confirmed', maxRetries: 3,
      });
      if (returned !== reference) throw new Error('El RPC devolvió una firma diferente.');
      const confirmation = await rpc.confirmTransaction({ signature: reference, ...validity }, 'confirmed');
      if (confirmation.value.err) {
        const error = confirmation.value.err;
        if (typeof error === 'object' && 'InstructionError' in error) {
          const instructionError = error.InstructionError;
          if (Array.isArray(instructionError) && instructionError[0] === 0) {
            const detail: unknown = instructionError[1];
            if (typeof detail === 'object' && detail !== null && 'Custom' in detail
              && typeof detail.Custom === 'number') throw programFailure(detail.Custom, error, reference);
          }
        }
        throw new RepositoryError('transactionFailed', 'La transacción fue confirmada con error.', reference, null, { cause: error });
      }
      return { reference };
    } catch (cause) {
      const mapped = mapError(cause);
      if (mapped.code === 'programRejected' || mapped.code === 'transactionFailed') throw mapped;
      throw new RepositoryError('confirmationUnknown',
        'No se pudo confirmar el resultado. Consulta la firma antes de repetir la operación.', reference, null, { cause });
    }
  }
}
