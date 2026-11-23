import type { AuditWriter, CreateAuditInput, MutationReceipt } from '../../domain/ports';
import type { UseCase } from '../contracts';
import { normalizeTitle, validateId } from '../validation';

export class CreateAudit implements UseCase<CreateAuditInput, MutationReceipt> {
  constructor(private readonly repository: Pick<AuditWriter, 'createAudit'>) {}

  async execute(input: CreateAuditInput): Promise<MutationReceipt> {
    return this.repository.createAudit({ id: validateId(input.id, 'id'), title: normalizeTitle(input.title) });
  }
}
