// Los adaptadores validarán estas representaciones al cruzar el límite externo.
export type AccountAddress = string;
export type EntityId = bigint;
export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface Audit {
  readonly address: AccountAddress;
  readonly authority: AccountAddress;
  readonly id: EntityId;
  readonly title: string;
  readonly nextFindingId: EntityId;
  readonly findingCount: bigint;
  readonly openFindingCount: bigint;
}

interface FindingData {
  readonly address: AccountAddress;
  readonly audit: AccountAddress;
  readonly id: EntityId;
  readonly title: string;
  readonly description: string;
  readonly severity: Severity;
}

export type Finding = FindingData & (
  | { readonly status: 'open'; readonly correctiveAction: null }
  | { readonly status: 'resolved'; readonly correctiveAction: string }
);
