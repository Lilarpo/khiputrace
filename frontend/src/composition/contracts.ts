import type { AuditUseCases, FindingUseCases } from '../application/contracts';

// La presentación recibirá únicamente los casos de uso ensamblados.
export interface AppServices {
  readonly audits: AuditUseCases;
  readonly findings: FindingUseCases;
}
