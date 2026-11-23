import type { AccountAddress, Audit, Finding } from '../domain/entities';
import type {
  AuditReader, AuditWriter, CreateAuditInput, CreateFindingInput,
  FindingIdentity, FindingReader, FindingWriter, MutationReceipt,
  ResolveFindingInput, UpdateFindingInput,
} from '../domain/ports';

export interface UseCase<Input, Output> {
  execute(input: Input): Promise<Output>;
}

export interface GetAuditsInput { readonly authority: AccountAddress }
export interface GetFindingsInput { readonly audit: AccountAddress }

export interface AuditUseCases {
  readonly get: UseCase<{ readonly address: AccountAddress }, Audit | null>;
  readonly list: UseCase<GetAuditsInput, readonly Audit[]>;
  readonly create: UseCase<CreateAuditInput, MutationReceipt>;
}

export interface FindingUseCases {
  readonly list: UseCase<GetFindingsInput, readonly Finding[]>;
  readonly create: UseCase<CreateFindingInput, MutationReceipt>;
  readonly update: UseCase<UpdateFindingInput, MutationReceipt>;
  readonly resolve: UseCase<ResolveFindingInput, MutationReceipt>;
  readonly close: UseCase<FindingIdentity, MutationReceipt>;
}

export interface ApplicationDependencies {
  readonly auditReader: AuditReader;
  readonly auditWriter: AuditWriter;
  readonly findingReader: FindingReader;
  readonly findingWriter: FindingWriter;
}
