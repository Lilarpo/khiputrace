import { expect, test } from '@playwright/test';
import { strict as assert } from 'node:assert';
import { writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { Wallet } from '@anchor-lang/core';
import { Connection, SystemProgram, Transaction } from '@solana/web3.js';
import { createAppServices } from '../../frontend/src/composition/create-services';
import { createRepositories } from '../../frontend/src/infrastructure/anchor/client';
import { networkConfig } from '../../frontend/src/infrastructure/solana/config';
import { IDL } from '../../frontend/src/infrastructure/anchor/generated/khiputrace';
import { auditPda, findingPda } from '../../frontend/src/infrastructure/solana/pdas';
import { DEVNET_GENESIS } from '../../frontend/src/infrastructure/solana/session';

test('Devnet real: UI de producción, ciclo completo y rechazo Rust visible', async ({ page }) => {
  assert.equal(process.env.KHIPUTRACE_DEVNET_UI_EXECUTE, '1', 'Ejecutar mediante el runner explícito Devnet.');
  const endpoint = 'https://api.devnet.solana.com';
  const rpc = new Connection(endpoint, 'confirmed');
  assert.equal(await rpc.getGenesisHash(), DEVNET_GENESIS);
  process.env.ANCHOR_WALLET = `${homedir()}/.local/share/khiputrace/devnet/deployer-keypair.json`;
  const wallet = Wallet.local();
  const config = networkConfig({ cluster: 'devnet', programId: IDL.address });
  const auditId = 202611220424n;
  const audit = auditPda(config.programId, wallet.publicKey, auditId)[0];
  const finding0 = findingPda(config.programId, audit, 0n)[0];
  const finding1 = findingPda(config.programId, audit, 1n)[0];
  assert.equal(await rpc.getAccountInfo(audit, 'confirmed'), null, 'La auditoría UI ya existe.');
  const allowed = new Set([wallet.publicKey, audit, finding0, finding1, SystemProgram.programId].map((key) => key.toBase58()));
  const services = createAppServices(createRepositories(config, () => wallet, rpc));
  const steps: Record<string, unknown>[] = [];
  const responses: { signature?: string; error?: unknown }[] = [];
  const signing: Record<string, unknown>[] = [];
  const pending: Promise<void>[] = [];
  const report: Record<string, unknown> = { startedAtUtc: new Date().toISOString(), network: 'devnet', endpoint,
    programId: IDL.address, authority: wallet.publicKey.toBase58(), audit: audit.toBase58(), auditId: auditId.toString(),
    walletKind: 'Proveedor Wallet Standard de pruebas; firma oficial Node desde keypair externo. Sin extensión real, claves privadas en navegador ni mocks RPC.', steps, responses, signing };
  const save = () => writeFileSync('docs/evidence/4.2-ui-flow.json', `${JSON.stringify(report, null, 2)}\n`);
  async function snapshot() {
    const result = await rpc.getMultipleAccountsInfoAndContext([audit, finding0, finding1], 'confirmed');
    return { slot: result.context.slot, accounts: result.value.map((account, index) => ({
      address: [audit, finding0, finding1][index]?.toBase58(), value: account === null ? null
        : { owner: account.owner.toBase58(), lamports: account.lamports, executable: account.executable, base64: account.data.toString('base64') },
    })) };
  }
  await page.exposeFunction('signDevnetTransaction', async (wire: number[]) => {
    assert(signing.length < 12, 'Límite de firmas del recorrido UI alcanzado.');
    const tx = Transaction.from(Buffer.from(wire));
    assert(tx.feePayer?.equals(wallet.publicKey)); assert.equal(tx.instructions.length, 1);
    assert(tx.instructions.every((instruction) => instruction.programId.equals(config.programId)
      && instruction.keys.every((key) => allowed.has(key.pubkey.toBase58()))));
    assert(tx.instructions[0]?.keys[1]?.pubkey.equals(audit), 'Solo se firma la auditoría de prueba UI.');
    signing.push({ proposedAtUtc: new Date().toISOString(), programId: config.programId.toBase58(), audit: audit.toBase58() }); save();
    const signed = await wallet.signTransaction(tx);
    return Array.from(signed.serialize());
  });
  await page.addInitScript(({ address, bytes }) => {
    const account = { address, publicKey: new Uint8Array(bytes), chains: ['solana:devnet'], features: ['solana:signTransaction'] };
    window.addEventListener('wallet-standard:app-ready', (event) => {
      let accounts: readonly typeof account[] = [];
      const provider = { version: '1.0.0', name: 'Wallet de pruebas Devnet', icon: 'data:image/svg+xml;base64,PHN2Zy8+', chains: ['solana:devnet'],
        get accounts() { return accounts; }, features: {
          'standard:connect': { version: '1.0.0', connect: async () => { accounts = [account]; return { accounts }; } },
          'standard:disconnect': { version: '1.0.0', disconnect: async () => { accounts = []; } },
          'standard:events': { version: '1.0.0', on: () => () => {} },
          'solana:signTransaction': { version: '1.0.0', supportedTransactionVersions: ['legacy'], signTransaction: async (input: { transaction: Uint8Array; chain: string }) => {
            if (input.chain !== 'solana:devnet') throw new Error('Red incorrecta.');
            const signer = window as unknown as { signDevnetTransaction(wire: number[]): Promise<number[]> };
            return [{ signedTransaction: new Uint8Array(await signer.signDevnetTransaction(Array.from(input.transaction))) }];
          } },
        } };
      (event as CustomEvent<{ register: (wallet: unknown) => void }>).detail.register(provider);
    });
  }, { address: wallet.publicKey.toBase58(), bytes: Array.from(wallet.publicKey.toBytes()) });
  page.on('response', (response) => {
    if (!response.url().startsWith(endpoint) || response.request().method() !== 'POST') return;
    pending.push((async () => {
      const request = response.request().postDataJSON() as { method?: string };
      if (request.method !== 'sendTransaction') return;
      const value = await response.json() as { result?: string; error?: unknown };
      if (value.result) responses.push({ signature: value.result });
      else responses.push({ error: value.error });
      save();
    })());
  });
  async function step(id: string, expected: string, operation: () => Promise<void>) {
    const record: Record<string, unknown> = { id, expected, status: 'running', initial: await snapshot() };
    steps.push(record); save();
    const start = responses.length;
    try {
      await operation(); await Promise.all(pending);
      record.final = await snapshot(); record.rpc = responses.slice(start); record.status = 'passed'; save();
    } catch (error: unknown) {
      record.status = 'failed'; record.error = error instanceof Error ? error.message : String(error); save(); throw error;
    }
  }
  const counters = async (values: string[]) => expect(page.getByLabel('Contadores de hallazgos').locator('dd')).toHaveText(values);
  const content = async (title: string, severity = 'high') => {
    await page.getByLabel('Título del hallazgo', { exact: true }).fill(title);
    await page.getByLabel('Descripción del hallazgo', { exact: true }).fill('Descripción sintética del recorrido Devnet UI');
    await page.getByLabel('Gravedad', { exact: true }).selectOption(severity);
    await page.getByRole('button', { name: 'Revisar hallazgo', exact: true }).click();
  };
  const submit = async (title: string) => {
    await page.getByRole('button', { name: 'Firmar operación del hallazgo' }).click();
    await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Consultando hallazgos y contadores…' })).toHaveCount(0);
  };
  try {
    report.balanceStartLamports = await rpc.getBalance(wallet.publicKey, 'confirmed'); save();
    await page.goto('/#audits');
    await page.getByRole('button', { name: 'Conectar wallet', exact: true }).first().click();
    await page.getByRole('button', { name: 'Wallet de pruebas Devnet' }).click();
    await step('ui-create-audit', 'Revisar, firmar y confirmar auditoría; detalle y contadores iniciales cero.', async () => {
      await page.getByRole('button', { name: 'Crear auditoría', exact: true }).click();
      await page.getByLabel('ID de auditoría', { exact: true }).fill(auditId.toString());
      await page.getByLabel('Título', { exact: true }).fill('Auditoría UI real Devnet 4.2');
      await page.getByRole('button', { name: 'Revisar auditoría' }).click();
      await page.getByRole('button', { name: 'Firmar y crear auditoría' }).click();
      await expect(page.getByText('Auditoría confirmada', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Ver auditoría Auditoría UI real Devnet 4.2', exact: true }).click();
      const detail = page.getByRole('region', { name: 'Detalle de auditoría' });
      await expect(detail.locator('dd').nth(3)).toHaveText('0');
      await page.getByRole('link', { name: 'Hallazgos', exact: true }).click();
      await page.getByLabel('Auditoría de los hallazgos').selectOption(audit.toBase58()); await counters(['0', '0', '0']);
    });
    await step('ui-create-finding', 'Crear ID 0, gravedad alta y contadores activos/abiertos/next=1/1/1.', async () => {
      await page.getByRole('button', { name: 'Crear hallazgo', exact: true }).click(); await content('Riesgo UI Devnet');
      await submit('Hallazgo creado'); await counters(['1', '1', '1']);
    });
    await step('ui-update-open', 'Modificar la misma PDA abierta y mostrar gravedad crítica.', async () => {
      await page.getByRole('button', { name: 'Modificar hallazgo #0' }).click(); await content('Riesgo UI actualizado', 'critical');
      await submit('Hallazgo actualizado'); await counters(['1', '1', '1']);
      await expect(page.getByRole('article', { name: '#0 · Riesgo UI actualizado' })).toContainText('Gravedad: Crítica');
    });
    await step('ui-resolve', 'Resolver con acción correctiva y reflejar 1/0/1.', async () => {
      await page.getByRole('button', { name: 'Resolver hallazgo #0' }).click();
      await page.getByLabel('Acción correctiva', { exact: true }).fill('Corrección UI Devnet aplicada y verificada');
      await page.getByRole('button', { name: 'Revisar hallazgo', exact: true }).click();
      await submit('Hallazgo resuelto'); await counters(['1', '0', '1']);
    });
    while (await page.getByRole('button', { name: 'Cerrar notificación' }).count()) await page.getByRole('button', { name: 'Cerrar notificación' }).first().click();
    await page.screenshot({ path: 'docs/evidence/4.2-ui-devnet-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: 'docs/evidence/4.2-ui-devnet-mobile.png', fullPage: true });
    await step('ui-close-resolved', 'Confirmar cierre explícito, cuenta ausente y contadores 0/0/1.', async () => {
      await page.getByRole('button', { name: 'Cerrar hallazgo #0' }).click(); await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: 'Confirmar cierre y firmar' }).click();
      await expect(page.getByText('Cuenta de hallazgo cerrada', { exact: true }).first()).toBeVisible(); await counters(['0', '0', '1']);
    });
    await step('ui-monotonic-id', 'Nuevo hallazgo ID 1; no reutilizar 0, contadores 1/1/2.', async () => {
      await page.getByRole('button', { name: 'Crear hallazgo', exact: true }).click(); await content('Segundo riesgo UI', 'low');
      await submit('Hallazgo creado'); await counters(['1', '1', '2']);
    });
    await page.getByRole('button', { name: 'Modificar hallazgo #1' }).click(); await content('Edición obsoleta UI');
    const external = await services.findings.resolve.execute({ audit: audit.toBase58(), id: 1n, correctiveAction: 'Resolución concurrente sintética Devnet UI' });
    report.concurrentResolution = { signature: external.reference, explorer: `https://explorer.solana.com/tx/${external.reference}?cluster=devnet` }; save();
    await step('ui-program-error', 'Mostrar error Rust 6003 por edición obsoleta; cuentas sin cambios.', async () => {
      const before = await snapshot();
      await page.getByRole('button', { name: 'Firmar operación del hallazgo' }).click();
      await expect(page.getByRole('alert').filter({ hasText: 'Código del programa: 6003' })).toBeVisible();
      await Promise.all(pending);
      const response = responses.at(-1)?.error as { data?: { logs?: string[] } } | undefined;
      expect(response?.data?.logs?.some((line) => line.includes('Error Number: 6003'))).toBe(true);
      expect((await snapshot()).accounts).toEqual(before.accounts);
      await page.screenshot({ path: 'docs/evidence/4.2-ui-program-error.png', fullPage: true });
    });
    await page.getByRole('button', { name: 'Cerrar formulario de hallazgo' }).click();
    await page.getByRole('button', { name: 'Actualizar hallazgos' }).click(); await counters(['1', '0', '2']);
    await step('ui-close-second', 'Cerrar el segundo resuelto, devolver rent y conservar siguiente ID 2.', async () => {
      await page.getByRole('button', { name: 'Cerrar hallazgo #1' }).click(); await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: 'Confirmar cierre y firmar' }).click();
      await expect(page.getByText('Cuenta de hallazgo cerrada', { exact: true }).first()).toBeVisible(); await counters(['0', '0', '2']);
    });
    const account = await services.audits.get.execute({ address: audit.toBase58() }); assert(account);
    assert.deepEqual([account.nextFindingId, account.findingCount, account.openFindingCount], [2n, 0n, 0n]);
    report.balanceEndLamports = await rpc.getBalance(wallet.publicKey, 'confirmed');
    report.completedAtUtc = new Date().toISOString(); report.verified = true; save();
  } catch (error: unknown) {
    report.verified = false; report.error = error instanceof Error ? error.message : String(error); save(); throw error;
  } finally { await Promise.all(pending); save(); }
});
