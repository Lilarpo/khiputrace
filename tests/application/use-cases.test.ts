import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { Audit, Finding, Severity } from '../../frontend/src/domain/entities';
import { MAX_U64 } from '../../frontend/src/domain/constraints';
import { RepositoryError } from '../../frontend/src/domain/errors';
import type { MutationReceipt } from '../../frontend/src/domain/ports';
import type { ApplicationDependencies } from '../../frontend/src/application/contracts';
import { InputValidationError, isApplicationError } from '../../frontend/src/application/errors';
import type { InputField, ValidationCode } from '../../frontend/src/application/errors';
import { CreateAudit } from '../../frontend/src/application/use-cases/create-audit';
import { GetAudits } from '../../frontend/src/application/use-cases/get-audits';
import { CreateFinding } from '../../frontend/src/application/use-cases/create-finding';
import { GetFindings } from '../../frontend/src/application/use-cases/get-findings';
import { UpdateFinding } from '../../frontend/src/application/use-cases/update-finding';
import { ResolveFinding } from '../../frontend/src/application/use-cases/resolve-finding';
import { CloseFinding } from '../../frontend/src/application/use-cases/close-finding';
import { createAppServices } from '../../frontend/src/composition/create-services';

// Direcciones de fixtures sin cuentas ni transacciones de red.
const AUTHORITY = '11111111111111111111111111111112';
const AUDIT = '11111111111111111111111111111113';
const FINDING = '11111111111111111111111111111114';
const LARGE_ID = 9007199254740993n;
const receipt: MutationReceipt = Object.freeze({ reference: 'confirmacion-simulada-del-repositorio' });
const audit: Audit = Object.freeze({ address: AUDIT, authority: AUTHORITY, id: LARGE_ID, title: 'Auditoría sintética',
  nextFindingId: 5n, findingCount: 1n, openFindingCount: 1n });
const finding: Finding = Object.freeze({ address: FINDING, audit: AUDIT, id: 4n, title: 'Hallazgo sintético',
  description: 'Detalle sintético', severity: 'high', status: 'open', correctiveAction: null });
const audits: readonly Audit[] = Object.freeze([audit]);
const findings: readonly Finding[] = Object.freeze([finding]);
const content = Object.freeze({ title: '  Hallazgo sintético  ', description: '\u0085Detalle sintético\u0085', severity: 'high' as const });
const normalized = { title: 'Hallazgo sintético', description: 'Detalle sintético', severity: 'high' };

function repositories(options: { failure?: unknown; pending?: Promise<MutationReceipt>; empty?: boolean } = {}) {
  const calls: { method: string; input: unknown }[] = [];
  async function invoke<T>(method: string, input: unknown, value: T | Promise<T>): Promise<T> {
    calls.push({ method, input });
    if (options.failure !== undefined) throw options.failure;
    return value;
  }
  const dependencies: ApplicationDependencies = {
    auditReader: {
      async getAudit() { throw new Error('El caso de uso no debe consultar el estado antes de escribir.'); },
      listAudits: (authority) => invoke('listAudits', authority, options.empty ? [] : audits),
    },
    auditWriter: { createAudit: (input) => invoke('createAudit', input, options.pending ?? receipt) },
    findingReader: {
      async getFinding() { throw new Error('El caso de uso no debe consultar el estado antes de escribir.'); },
      listFindings: (parent) => invoke('listFindings', parent, options.empty ? [] : findings),
    },
    findingWriter: {
      createFinding: (input) => invoke('createFinding', input, options.pending ?? receipt),
      updateFinding: (input) => invoke('updateFinding', input, options.pending ?? receipt),
      resolveFinding: (input) => invoke('resolveFinding', input, options.pending ?? receipt),
      closeFinding: (input) => invoke('closeFinding', input, options.pending ?? receipt),
    },
  };
  return { dependencies, calls };
}

interface Scenario {
  name: string;
  method: string;
  expected: unknown;
  run: (dependencies: ApplicationDependencies) => Promise<unknown>;
  result: unknown;
  writes: boolean;
}
const scenarios: readonly Scenario[] = [
  { name: 'CreateAudit', method: 'createAudit',
    expected: { id: LARGE_ID, title: 'Auditoría sintética' }, result: receipt, writes: true,
    run: (deps) => new CreateAudit(deps.auditWriter).execute({ id: LARGE_ID, title: '  Auditoría sintética  ' }) },
  { name: 'GetAudits', method: 'listAudits', expected: AUTHORITY, result: audits, writes: false,
    run: (deps) => new GetAudits(deps.auditReader).execute({ authority: AUTHORITY }) },
  { name: 'CreateFinding', method: 'createFinding',
    expected: { audit: AUDIT, expectedNextId: LARGE_ID, ...normalized }, result: receipt, writes: true,
    run: (deps) => new CreateFinding(deps.findingWriter).execute(Object.freeze({ audit: AUDIT, expectedNextId: LARGE_ID, ...content })) },
  { name: 'GetFindings', method: 'listFindings', expected: AUDIT, result: findings, writes: false,
    run: (deps) => new GetFindings(deps.findingReader).execute({ audit: AUDIT }) },
  { name: 'UpdateFinding', method: 'updateFinding',
    expected: { audit: AUDIT, id: 4n, ...normalized }, result: receipt, writes: true,
    run: (deps) => new UpdateFinding(deps.findingWriter).execute(Object.freeze({ audit: AUDIT, id: 4n, ...content })) },
  { name: 'ResolveFinding', method: 'resolveFinding',
    expected: { audit: AUDIT, id: 4n, correctiveAction: 'Corrección aplicada' }, result: receipt, writes: true,
    run: (deps) => new ResolveFinding(deps.findingWriter).execute(Object.freeze({ audit: AUDIT, id: 4n, correctiveAction: '  Corrección aplicada  ' })) },
  { name: 'CloseFinding', method: 'closeFinding',
    expected: { audit: AUDIT, id: 4n }, result: receipt, writes: true,
    run: (deps) => new CloseFinding(deps.findingWriter).execute(Object.freeze({ audit: AUDIT, id: 4n })) },
];

for (const scenario of scenarios) {
  test(`${scenario.name}: invoca solo su puerto con datos normalizados y conserva resultado`, async () => {
    const { dependencies, calls } = repositories();
    const result = await scenario.run(dependencies);
    assert.equal(result, scenario.result);
    assert.deepEqual(calls, [{ method: scenario.method, input: scenario.expected }]);
  });

  test(`${scenario.name}: propaga errores del repositorio con causa, código y referencia intactos`, async () => {
    const failure = scenario.writes
      ? new RepositoryError('confirmationUnknown', 'Resultado incierto sintético', 'firma-sintetica', 6004, { cause: new Error('causa sintética') })
      : new RepositoryError('network', 'RPC sintético caído', null, null, { cause: new Error('causa sintética') });
    const { dependencies, calls } = repositories({ failure });
    await assert.rejects(scenario.run(dependencies), (error: unknown) => error === failure && isApplicationError(error));
    assert.equal(calls.length, 1);
  });

  if (scenario.writes) {
    test(`${scenario.name}: espera al recibo del repositorio y no devuelve éxito prematuro`, async () => {
      let complete: ((value: MutationReceipt) => void) | undefined;
      const pending = new Promise<MutationReceipt>((resolve) => { complete = resolve; });
      const { dependencies, calls } = repositories({ pending });
      let settled = false;
      const operation = scenario.run(dependencies).then((value) => { settled = true; return value; });
      await Promise.resolve();
      assert.equal(calls.length, 1);
      assert.equal(settled, false);
      assert(complete);
      complete(receipt);
      assert.equal(await operation, receipt);
    });
  }
}

interface InvalidScenario {
  name: string;
  field: InputField;
  code: ValidationCode;
  run: (dependencies: ApplicationDependencies) => Promise<unknown>;
}
const invalid: InvalidScenario[] = [];
for (const id of [-1n, MAX_U64 + 1n, 1 as unknown as bigint]) {
  invalid.push({ name: `CreateAudit ID inválido ${String(id)}`, field: 'id', code: 'invalidId',
    run: (deps) => new CreateAudit(deps.auditWriter).execute({ id, title: 'Auditoría' }) });
  invalid.push({ name: `CreateFinding ID inválido ${String(id)}`, field: 'expectedNextId', code: 'invalidId',
    run: (deps) => new CreateFinding(deps.findingWriter).execute({ ...content, audit: AUDIT, expectedNextId: id }) });
}
for (const [title, code] of [['', 'required'], ['\u0085 \t\n', 'required'], ['x'.repeat(97), 'tooLong'], ['é'.repeat(49), 'tooLong'], ['\ud800', 'invalidUnicode']] as const) {
  invalid.push({ name: `CreateAudit título ${code} ${title.length}`, field: 'title', code,
    run: (deps) => new CreateAudit(deps.auditWriter).execute({ id: 0n, title }) });
}
for (const [field, value, code] of [
  ['title', '', 'required'], ['title', 'x'.repeat(97), 'tooLong'],
  ['description', ' \n ', 'required'], ['description', 'é'.repeat(257), 'tooLong'],
  ['description', '\udc00', 'invalidUnicode'], ['severity', 'unknown', 'invalidSeverity'],
] as const) {
  const badContent = { ...content, [field]: value } as { title: string; description: string; severity: Severity };
  invalid.push({ name: `CreateFinding ${field} ${code}`, field, code,
    run: (deps) => new CreateFinding(deps.findingWriter).execute({ ...badContent, audit: AUDIT, expectedNextId: 0n }) });
  invalid.push({ name: `UpdateFinding ${field} ${code}`, field, code,
    run: (deps) => new UpdateFinding(deps.findingWriter).execute({ ...badContent, audit: AUDIT, id: 0n }) });
}
for (const [index, address] of ['', 'dirección inválida', '0'.repeat(32), '1'.repeat(31), '1'.repeat(45), ` ${AUDIT}`, `${AUDIT}\n`].entries()) {
  invalid.push({ name: `GetAudits dirección inválida caso ${index}`, field: 'authority', code: 'invalidAddress',
    run: (deps) => new GetAudits(deps.auditReader).execute({ authority: address }) });
  invalid.push({ name: `GetFindings dirección inválida caso ${index}`, field: 'audit', code: 'invalidAddress',
    run: (deps) => new GetFindings(deps.findingReader).execute({ audit: address }) });
}
for (const [correctiveAction, code] of [
  ['', 'required'], ['\u0085 \n', 'required'], ['x'.repeat(9), 'tooShort'], ['🦙'.repeat(9), 'tooShort'],
  ['é'.repeat(257), 'tooLong'], ['\ud800'.repeat(10), 'invalidUnicode'],
] as const) {
  invalid.push({ name: `ResolveFinding acción inválida ${code} ${correctiveAction.length}`, field: 'correctiveAction', code,
    run: (deps) => new ResolveFinding(deps.findingWriter).execute({ audit: AUDIT, id: 0n, correctiveAction }) });
}
for (const operation of ['update', 'resolve', 'close'] as const) {
  for (const badField of ['id', 'audit'] as const) {
    invalid.push({ name: `${operation} identidad inválida ${badField}`, field: badField,
      code: badField === 'id' ? 'invalidId' : 'invalidAddress', run: (deps) => {
        const identity = { audit: badField === 'audit' ? '' : AUDIT, id: badField === 'id' ? -1n : 0n };
        if (operation === 'update') return new UpdateFinding(deps.findingWriter).execute({ ...identity, ...content });
        if (operation === 'resolve') return new ResolveFinding(deps.findingWriter).execute({ ...identity, correctiveAction: 'Corrección aplicada' });
        return new CloseFinding(deps.findingWriter).execute(identity);
      } });
  }
}
invalid.push({ name: 'CreateFinding auditoría inválida', field: 'audit', code: 'invalidAddress',
  run: (deps) => new CreateFinding(deps.findingWriter).execute({ ...content, audit: '', expectedNextId: 0n }) });

for (const scenario of invalid) {
  test(`${scenario.name}: error tipado y ningún acceso al repositorio`, async () => {
    const { dependencies, calls } = repositories();
    await assert.rejects(scenario.run(dependencies), (error: unknown) => error instanceof InputValidationError
      && error.field === scenario.field && error.code === scenario.code && isApplicationError(error));
    assert.deepEqual(calls, []);
  });
}

test('límites válidos: u64, UTF-8, scalars Unicode y trim de Rust', async () => {
  const { dependencies, calls } = repositories();
  const create = new CreateAudit(dependencies.auditWriter);
  for (const id of [0n, LARGE_ID, MAX_U64]) {
    await create.execute({ id, title: ` \u0085${'é'.repeat(48)}\u0085 ` });
    assert.deepEqual(calls.at(-1), { method: 'createAudit', input: { id, title: 'é'.repeat(48) } });
  }
  await new CreateFinding(dependencies.findingWriter).execute({ audit: AUDIT, expectedNextId: LARGE_ID,
    title: '\ufeffTítulo', description: ` ${'é'.repeat(256)} `, severity: 'critical' });
  assert.deepEqual(calls.at(-1), { method: 'createFinding', input: { audit: AUDIT, expectedNextId: LARGE_ID,
    title: '\ufeffTítulo', description: 'é'.repeat(256), severity: 'critical' } });
  for (const note of ['x'.repeat(10), 'é'.repeat(10), '🦙'.repeat(10), 'é'.repeat(256)]) {
    await new ResolveFinding(dependencies.findingWriter).execute({ audit: AUDIT, id: 0n, correctiveAction: `\u0085 ${note} \u0085` });
    assert.deepEqual(calls.at(-1), { method: 'resolveFinding', input: { audit: AUDIT, id: 0n, correctiveAction: note } });
  }
  for (const severity of ['low', 'medium', 'high', 'critical'] as const) {
    await new UpdateFinding(dependencies.findingWriter).execute({ audit: AUDIT, id: 0n, ...content, severity });
    assert.deepEqual(calls.at(-1), { method: 'updateFinding', input: { audit: AUDIT, id: 0n, ...normalized, severity } });
  }
});

test('consultas vacías legítimas y errores inesperados no se convierten en éxito', async () => {
  const empty = repositories({ empty: true });
  assert.deepEqual(await new GetAudits(empty.dependencies.auditReader).execute({ authority: AUTHORITY }), []);
  assert.deepEqual(await new GetFindings(empty.dependencies.findingReader).execute({ audit: AUDIT }), []);
  const unexpected = new Error('Fallo inesperado sintético');
  for (const scenario of scenarios) await assert.rejects(scenario.run(repositories({ failure: unexpected }).dependencies), (error: unknown) => error === unexpected);
  assert.equal(isApplicationError(unexpected), false);
  assert.equal(isApplicationError(null), false);
});

test('el rechazo del programa y su firma se conservan sin traducirlos a validación UX', async () => {
  const failure = new RepositoryError('programRejected', 'Estado rechazado por Rust', 'firma-sintetica', 6003);
  for (const scenario of scenarios.filter((item) => item.writes)) {
    await assert.rejects(scenario.run(repositories({ failure }).dependencies), (error: unknown) => error instanceof RepositoryError && error === failure
      && error.programCode === 6003 && error.reference === 'firma-sintetica');
  }
});

test('composición expone los siete casos y no conecta adaptadores ni pantallas', async () => {
  const { dependencies, calls } = repositories();
  const services = createAppServices(dependencies);
  assert.deepEqual(Object.keys(services).sort(), ['audits', 'findings']);
  assert.equal(await services.audits.create.execute({ id: 0n, title: 'Auditoría' }), receipt);
  assert.equal(await services.audits.list.execute({ authority: AUTHORITY }), audits);
  assert.equal(await services.findings.list.execute({ audit: AUDIT }), findings);
  await services.findings.create.execute({ audit: AUDIT, expectedNextId: 5n, ...content });
  await services.findings.update.execute({ audit: AUDIT, id: 4n, ...content });
  await services.findings.resolve.execute({ audit: AUDIT, id: 4n, correctiveAction: 'Corrección aplicada' });
  await services.findings.close.execute({ audit: AUDIT, id: 4n });
  assert.deepEqual(calls.map((call) => call.method), ['createAudit', 'listAudits', 'listFindings', 'createFinding', 'updateFinding', 'resolveFinding', 'closeFinding']);
});

test('normalizar texto conserva el DTO original inmutable', async () => {
  const { dependencies, calls } = repositories();
  const input = Object.freeze({ audit: AUDIT, id: 4n, ...content });
  const original = structuredClone(input);
  await new UpdateFinding(dependencies.findingWriter).execute(input);
  assert.deepEqual(input, original);
  assert.notEqual(calls[0]?.input, input);
  assert.deepEqual(calls[0]?.input, { audit: AUDIT, id: 4n, ...normalized });
});


test('GetAudit: consulta detalle, ausencia y errores sin adaptar datos', async () => {
  const { GetAudit } = await import('../../frontend/src/application/use-cases/get-audit');
  let calls = 0;
  const reader = { getAudit: async (address: string) => { calls++; assert.equal(address, AUDIT); return audit; } };
  assert.equal(await new GetAudit(reader).execute({ address: AUDIT }), audit);
  assert.equal(calls, 1);
  await assert.rejects(async () => new GetAudit(reader).execute({ address: 'invalid' }), InputValidationError);
  assert.equal(calls, 1);
  assert.equal(await new GetAudit({ getAudit: async () => null }).execute({ address: AUDIT }), null);
  const error = new RepositoryError('network', 'Fallo de detalle de prueba');
  await assert.rejects(new GetAudit({ getAudit: async () => { throw error; } }).execute({ address: AUDIT }), (cause: unknown) => cause === error);
});
