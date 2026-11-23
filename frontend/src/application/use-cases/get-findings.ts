import type { Finding } from '../../domain/entities';
import type { FindingReader } from '../../domain/ports';
import type { GetFindingsInput, UseCase } from '../contracts';
import { validateAddress } from '../validation';

export class GetFindings implements UseCase<GetFindingsInput, readonly Finding[]> {
  constructor(private readonly repository: Pick<FindingReader, 'listFindings'>) {}

  async execute(input: GetFindingsInput): Promise<readonly Finding[]> {
    return this.repository.listFindings(validateAddress(input.audit, 'audit'));
  }
}
