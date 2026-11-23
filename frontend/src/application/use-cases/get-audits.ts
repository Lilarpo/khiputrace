import type { Audit } from '../../domain/entities';
import type { AuditReader } from '../../domain/ports';
import type { GetAuditsInput, UseCase } from '../contracts';
import { validateAddress } from '../validation';

export class GetAudits implements UseCase<GetAuditsInput, readonly Audit[]> {
  constructor(private readonly repository: Pick<AuditReader, 'listAudits'>) {}

  async execute(input: GetAuditsInput): Promise<readonly Audit[]> {
    return this.repository.listAudits(validateAddress(input.authority, 'authority'));
  }
}
