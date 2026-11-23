import type { ApplicationDependencies } from '../application/contracts';
import { CreateAudit } from '../application/use-cases/create-audit';
import { GetAudit } from '../application/use-cases/get-audit';
import { GetAudits } from '../application/use-cases/get-audits';
import { CreateFinding } from '../application/use-cases/create-finding';
import { GetFindings } from '../application/use-cases/get-findings';
import { UpdateFinding } from '../application/use-cases/update-finding';
import { ResolveFinding } from '../application/use-cases/resolve-finding';
import { CloseFinding } from '../application/use-cases/close-finding';
import type { AppServices } from './contracts';

export function createAppServices(dependencies: ApplicationDependencies): AppServices {
  return {
    audits: { get: new GetAudit(dependencies.auditReader), create: new CreateAudit(dependencies.auditWriter), list: new GetAudits(dependencies.auditReader) },
    findings: {
      create: new CreateFinding(dependencies.findingWriter), list: new GetFindings(dependencies.findingReader),
      update: new UpdateFinding(dependencies.findingWriter), resolve: new ResolveFinding(dependencies.findingWriter),
      close: new CloseFinding(dependencies.findingWriter),
    },
  };
}
