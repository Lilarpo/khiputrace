import { BN } from '@anchor-lang/core';
import type { IdlAccounts } from '@anchor-lang/core';
import type { PublicKey } from '@solana/web3.js';
import type { Audit, Finding, Severity } from '../../domain/entities';
import { RepositoryError } from '../../domain/errors';
import {
  CORRECTIVE_ACTION_MAX_BYTES, CORRECTIVE_ACTION_MIN_CHARS, DESCRIPTION_MAX_BYTES,
  MAX_U64, TITLE_MAX_BYTES, rustTrim,
} from '../../domain/constraints';
import { auditPda, findingPda } from '../solana/pdas';
import type { Khiputrace } from './generated/khiputrace';

export { rustTrim } from '../../domain/constraints';

export type AuditAccount = IdlAccounts<Khiputrace>['audit'];
export type FindingAccount = IdlAccounts<Khiputrace>['finding'];

export function requireAccount(condition: boolean, message: string): asserts condition {
  if (!condition) throw new RepositoryError('invalidAccount', message);
}

export function accountId(value: BN): bigint {
  requireAccount(BN.isBN(value), 'El ID no es un u64 de Anchor.');
  const id = BigInt(value.toString(10));
  requireAccount(id >= 0n && id <= MAX_U64, 'Entero fuera del rango u64.');
  return id;
}

function checkText(value: string, max: number): void {
  requireAccount(typeof value === 'string' && rustTrim(value) === value
    && value.length > 0 && new TextEncoder().encode(value).length <= max, 'Texto de cuenta inválido.');
}

function variant(value: unknown, allowed: readonly string[]): string {
  requireAccount(typeof value === 'object' && value !== null, 'Enum de cuenta inválido.');
  const keys = Object.keys(value);
  const name = keys[0];
  requireAccount(keys.length === 1 && name !== undefined && allowed.includes(name), 'Variante de enum desconocida.');
  return name;
}

export function mapAudit(programId: PublicKey, address: PublicKey, raw: AuditAccount): Audit {
  requireAccount(raw.version === 1, 'Versión de Audit no admitida.');
  const id = accountId(raw.auditId);
  const [expected, bump] = auditPda(programId, raw.authority, id);
  requireAccount(expected.equals(address) && raw.bump === bump, 'PDA o bump de Audit incorrecto.');
  checkText(raw.title, TITLE_MAX_BYTES);
  const nextFindingId = accountId(raw.nextFindingId);
  const findingCount = accountId(raw.activeFindings);
  const openFindingCount = accountId(raw.openFindings);
  requireAccount(openFindingCount <= findingCount && findingCount <= nextFindingId, 'Contadores de Audit inconsistentes.');
  return { address: address.toBase58(), authority: raw.authority.toBase58(), id, title: raw.title,
    nextFindingId, findingCount, openFindingCount };
}

export function mapFinding(programId: PublicKey, address: PublicKey, raw: FindingAccount, audit: Audit): Finding {
  requireAccount(raw.version === 1, 'Versión de Finding no admitida.');
  const id = accountId(raw.findingId);
  const [expected, bump] = findingPda(programId, raw.audit, id);
  requireAccount(expected.equals(address) && raw.bump === bump, 'PDA o bump de Finding incorrecto.');
  requireAccount(raw.audit.toBase58() === audit.address && id < audit.nextFindingId, 'Relación o ID de Finding incorrecto.');
  checkText(raw.title, TITLE_MAX_BYTES);
  checkText(raw.description, DESCRIPTION_MAX_BYTES);
  const severity = variant(raw.severity, ['low', 'medium', 'high', 'critical']) as Severity;
  const base = { address: address.toBase58(), audit: raw.audit.toBase58(), id,
    title: raw.title, description: raw.description, severity };
  const status = variant(raw.status, ['open', 'resolved']);
  if (status === 'open') {
    requireAccount(raw.remediationNote === '', 'Un Finding abierto tiene acción correctiva inesperada.');
    return { ...base, status: 'open', correctiveAction: null };
  }
  checkText(raw.remediationNote, CORRECTIVE_ACTION_MAX_BYTES);
  requireAccount([...raw.remediationNote].length >= CORRECTIVE_ACTION_MIN_CHARS, 'La acción correctiva es demasiado corta.');
  return { ...base, status: 'resolved', correctiveAction: raw.remediationNote };
}
