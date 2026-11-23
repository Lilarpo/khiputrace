import type { FindingWriter, MutationReceipt, UpdateFindingInput } from '../../domain/ports';
import type { UseCase } from '../contracts';
import { normalizeContent, validateIdentity } from '../validation';

export class UpdateFinding implements UseCase<UpdateFindingInput, MutationReceipt> {
  constructor(private readonly repository: Pick<FindingWriter, 'updateFinding'>) {}

  async execute(input: UpdateFindingInput): Promise<MutationReceipt> {
    return this.repository.updateFinding({ ...validateIdentity(input), ...normalizeContent(input) });
  }
}
