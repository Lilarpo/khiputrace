import type { AccountAddress, Audit, EntityId, Finding, Severity } from './entities';

export interface CreateAuditInput {
  readonly id: EntityId;
  readonly title: string;
}

export interface FindingContent {
  readonly title: string;
  readonly description: string;
  readonly severity: Severity;
}

export interface FindingIdentity {
  readonly audit: AccountAddress;
  readonly id: EntityId;
}

export interface CreateFindingInput extends FindingContent {
  readonly audit: AccountAddress;
  readonly expectedNextId: EntityId;
}

export interface UpdateFindingInput extends FindingIdentity, FindingContent {}

export interface ResolveFindingInput extends FindingIdentity {
  readonly correctiveAction: string;
}

// La implementación devuelve éxito solo después de confirmar la escritura.
export interface MutationReceipt { readonly reference: string }

export interface AuditReader {
  getAudit(address: AccountAddress): Promise<Audit | null>;
  listAudits(authority: AccountAddress): Promise<readonly Audit[]>;
}

export interface AuditWriter {
  createAudit(input: CreateAuditInput): Promise<MutationReceipt>;
}

export interface FindingReader {
  getFinding(identity: FindingIdentity): Promise<Finding | null>;
  listFindings(audit: AccountAddress): Promise<readonly Finding[]>;
}

export interface FindingWriter {
  createFinding(input: CreateFindingInput): Promise<MutationReceipt>;
  updateFinding(input: UpdateFindingInput): Promise<MutationReceipt>;
  resolveFinding(input: ResolveFindingInput): Promise<MutationReceipt>;
  closeFinding(identity: FindingIdentity): Promise<MutationReceipt>;
}
