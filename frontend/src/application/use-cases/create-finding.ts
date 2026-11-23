import type { CreateFindingInput, FindingWriter, MutationReceipt } from '../../domain/ports';
import type { UseCase } from '../contracts';
import { normalizeContent, validateAddress, validateId } from '../validation';

export class CreateFinding implements UseCase<CreateFindingInput, MutationReceipt> {
  constructor(private readonly repository: Pick<FindingWriter, 'createFinding'>) {}

  async execute(input: CreateFindingInput): Promise<MutationReceipt> {
    return this.repository.createFinding({ audit: validateAddress(input.audit, 'audit'),
      expectedNextId: validateId(input.expectedNextId, 'expectedNextId'), ...normalizeContent(input) });
  }
}
