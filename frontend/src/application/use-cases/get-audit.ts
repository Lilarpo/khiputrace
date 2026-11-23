import type { Audit } from '../../domain/entities';
import type { AuditReader } from '../../domain/ports';
import type { UseCase } from '../contracts';
import { validateAddress } from '../validation';

export class GetAudit implements UseCase<{ readonly address: string }, Audit | null> {
  constructor(private readonly repository: Pick<AuditReader, 'getAudit'>) {}
  execute(input: { readonly address: string }): Promise<Audit | null> {
    return this.repository.getAudit(validateAddress(input.address, 'audit'));
  }
}
