import type { Program } from '@anchor-lang/core';
import type { AccountInfo, PublicKey } from '@solana/web3.js';
import type { Buffer } from 'buffer';
import { RepositoryError } from '../../domain/errors';
import type { Audit } from '../../domain/entities';
import type { ChainSession } from '../solana/session';
import { mapAudit, mapFinding, requireAccount } from './mappers';
import type { AuditAccount, FindingAccount } from './mappers';
import type { Khiputrace } from './generated/khiputrace';

export class AccountReader {
  constructor(readonly session: ChainSession, readonly program: Program<Khiputrace>) {}

  private check(info: AccountInfo<Buffer>, size: number): void {
    requireAccount(info.owner.equals(this.session.config.programId) && !info.executable,
      'La cuenta no pertenece al programa o es ejecutable.');
    requireAccount(info.data.length === size, 'Tamaño de cuenta incorrecto.');
  }

  audit(address: PublicKey, info: AccountInfo<Buffer>) {
    try {
      this.check(info, 174);
      return mapAudit(this.session.config.programId, address,
        this.program.coder.accounts.decode<AuditAccount>('audit', info.data));
    } catch (cause) { throw this.invalid(cause); }
  }

  finding(address: PublicKey, info: AccountInfo<Buffer>, audit: Audit) {
    try {
      this.check(info, 1184);
      return mapFinding(this.session.config.programId, address,
        this.program.coder.accounts.decode<FindingAccount>('finding', info.data), audit);
    } catch (cause) { throw this.invalid(cause); }
  }

  async getAudit(address: PublicKey): Promise<Audit | null> {
    const info = await this.session.rpc.getAccountInfo(address, 'confirmed');
    return info === null ? null : this.audit(address, info);
  }

  private invalid(cause: unknown): RepositoryError {
    return cause instanceof RepositoryError ? cause
      : new RepositoryError('invalidAccount', 'No se pudo decodificar la cuenta Anchor.', null, null, { cause });
  }
}
