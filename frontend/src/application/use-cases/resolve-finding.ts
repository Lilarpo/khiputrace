import type { FindingWriter, MutationReceipt, ResolveFindingInput } from '../../domain/ports';
import type { UseCase } from '../contracts';
import { normalizeCorrectiveAction, validateIdentity } from '../validation';

export class ResolveFinding implements UseCase<ResolveFindingInput, MutationReceipt> {
  constructor(private readonly repository: Pick<FindingWriter, 'resolveFinding'>) {}

  async execute(input: ResolveFindingInput): Promise<MutationReceipt> {
    return this.repository.resolveFinding({ ...validateIdentity(input), correctiveAction: normalizeCorrectiveAction(input.correctiveAction) });
  }
}
