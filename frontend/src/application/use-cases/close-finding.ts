import type { FindingIdentity, FindingWriter, MutationReceipt } from '../../domain/ports';
import type { UseCase } from '../contracts';
import { validateIdentity } from '../validation';

export class CloseFinding implements UseCase<FindingIdentity, MutationReceipt> {
  constructor(private readonly repository: Pick<FindingWriter, 'closeFinding'>) {}

  async execute(input: FindingIdentity): Promise<MutationReceipt> {
    return this.repository.closeFinding(validateIdentity(input));
  }
}
