import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { Program, BN } from '@anchor-lang/core';
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { IDL } from '../../frontend/src/infrastructure/anchor/generated/khiputrace';
import type { Khiputrace } from '../../frontend/src/infrastructure/anchor/generated/khiputrace';
import { installWallet } from './wallet-fixture';
const evidencePrefix = process.env.KHIPUTRACE_EVIDENCE_PREFIX ?? '3.3';
const connection = new Connection('http://127.0.0.1:18899', 'confirmed');
const program = new Program<Khiputrace>(IDL, { connection });
interface Flow { transactions: { error: unknown; logs: string[]; signature_kind: string; before: Record<string, unknown>; after: Record<string, unknown> }[] }
async function evidence(page: Page): Promise<Flow> { return page.request.get('http://127.0.0.1:18899/evidence').then((response) => response.json()); }
async function createAudit(page: Page) {
  await installWallet(page);
  await page.goto('/#audits');
  await page.getByRole('button', { name: 'Conectar wallet', exact: true }).first().click();
  await page.getByRole('button', { name: 'Wallet efímera LiteSVM' }).click();
  await page.getByRole('button', { name: 'Crear auditoría', exact: true }).click();
  await page.getByLabel('ID de auditoría', { exact: true }).fill('33');
  await page.getByLabel('Título', { exact: true }).fill('Auditoría de hallazgos sintética');
  await page.getByRole('button', { name: 'Revisar auditoría' }).click();
  await page.getByRole('button', { name: 'Firmar y crear auditoría' }).click();
  await expect(page.getByText('Auditoría confirmada', { exact: true })).toBeVisible();
  const authority = await page.getByLabel('Estado de conexión').locator('code').textContent();
  if (!authority) throw new Error('Falta autoridad pública');
  const id = Buffer.alloc(8); id.writeBigUInt64LE(33n);
  const audit = PublicKey.findProgramAddressSync([Buffer.from('audit'), new PublicKey(authority).toBuffer(), id], program.programId)[0];
  await page.getByRole('link', { name: 'Hallazgos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Esta auditoría aún no tiene hallazgos' })).toBeVisible();
  return { authority: new PublicKey(authority), audit };
}
async function content(page: Page, title = 'Riesgo sintético', severity = 'high') {
  await page.getByLabel('Título del hallazgo', { exact: true }).fill(title);
  await page.getByLabel('Descripción del hallazgo', { exact: true }).fill('Descripción sintética del riesgo identificado');
  await page.getByLabel('Gravedad', { exact: true }).selectOption(severity);
  await page.getByRole('button', { name: 'Revisar hallazgo', exact: true }).click();
}
async function submit(page: Page, success: string) {
  await page.getByRole('button', { name: 'Firmar operación del hallazgo' }).click();
  await expect(page.getByText(success, { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Consultando hallazgos y contadores…' })).toHaveCount(0);
}
async function counters(page: Page, values: string[]) { await expect(page.getByLabel('Contadores de hallazgos').locator('dd')).toHaveText(values); }
async function startCreate(page: Page) { await page.getByRole('button', { name: 'Crear hallazgo', exact: true }).click(); }
async function component(page: Page, scenario: string) {
  const module = fileURLToPath(new URL('./components.tsx', import.meta.url));
  await page.route('**/component-harness?*', (route) => route.fulfill({ contentType: 'text/html', body: `<html lang="es"><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>t=>t;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/@fs${module}"></script></html>` }));
  await page.goto(`http://127.0.0.1:4176/component-harness?scenario=${scenario}#findings`);
}
// Otra transacción real de la misma wallet produce estado obsoleto en la UI.
// No se mutan cuentas de la VM mediante fixtures para fabricar el rechazo.
async function external(page: Page, authority: PublicKey, audit: PublicKey, operation: 'create' | 'resolve' | 'close') {
  const finding = PublicKey.findProgramAddressSync([Buffer.from('finding'), audit.toBuffer(), Buffer.alloc(8)], program.programId)[0];
  const accounts = { authority, audit, finding };
  const instruction = operation === 'create'
    ? await program.methods.createFinding(new BN(0), 'Hallazgo concurrente', 'Creado por otra transacción sintética', { high: {} }).accountsStrict({ ...accounts, systemProgram: SystemProgram.programId }).instruction()
    : operation === 'resolve'
      ? await program.methods.resolveFinding('Corrección concurrente aplicada').accountsStrict(accounts).instruction()
      : await program.methods.closeFinding().accountsStrict(accounts).instruction();
  const validity = await connection.getLatestBlockhash();
  const raw = new Transaction({ feePayer: authority, ...validity }).add(instruction).serialize({ requireAllSignatures: false, verifySignatures: false });
  const signed = await page.evaluate((wire) => new Promise<number[]>((resolve) => {
    window.addEventListener('test:signed-wire', (event) => resolve((event as CustomEvent<{ raw: number[] }>).detail.raw), { once: true });
    window.dispatchEvent(new CustomEvent('test:sign-wire', { detail: { raw: wire } }));
  }), Array.from(raw));
  return connection.sendRawTransaction(new Uint8Array(signed), { skipPreflight: false });
}
test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
});

test('SBF producción: ciclo completo, acción correctiva, cierre y siguiente ID no reutilizado', async ({ page }) => {
  test.setTimeout(90000);
  await createAudit(page); await counters(page, ['0', '0', '0']);
  await startCreate(page); await content(page);
  await expect(page.getByRole('heading', { name: 'Revisa el hallazgo antes de firmar' })).toBeVisible();
  await submit(page, 'Hallazgo creado'); await counters(page, ['1', '1', '1']);
  await expect(page.getByRole('article', { name: '#0 · Riesgo sintético' })).toContainText('Gravedad: Alta');
  await expect(page.getByRole('button', { name: 'Cerrar hallazgo #0' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Modificar hallazgo #0' }).click();
  await content(page, 'Riesgo actualizado', 'critical'); await submit(page, 'Hallazgo actualizado');
  await expect(page.getByRole('article', { name: '#0 · Riesgo actualizado' })).toContainText('Gravedad: Crítica');
  await counters(page, ['1', '1', '1']);
  await page.getByRole('button', { name: 'Resolver hallazgo #0' }).click();
  const before = (await evidence(page)).transactions.length;
  await page.getByLabel('Acción correctiva', { exact: true }).fill('corta');
  await page.getByRole('button', { name: 'Revisar hallazgo', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Introduce al menos 10' })).toBeVisible();
  expect((await evidence(page)).transactions.length).toBe(before);
  await page.getByLabel('Acción correctiva', { exact: true }).fill('  Corrección sintética verificada en revisión  ');
  await page.getByRole('button', { name: 'Revisar hallazgo', exact: true }).click();
  await submit(page, 'Hallazgo resuelto'); await counters(page, ['1', '0', '1']);
  await expect(page.getByRole('article').filter({ hasText: 'Riesgo actualizado' })).toContainText('Corrección sintética verificada en revisión');
  await expect(page.getByRole('button', { name: 'Modificar hallazgo #0' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Resolver hallazgo #0' })).toHaveCount(0);
  while (await page.getByRole('button', { name: 'Cerrar notificación' }).count()) await page.getByRole('button', { name: 'Cerrar notificación' }).first().click();
  await page.screenshot({ path: `docs/evidence/${evidencePrefix}-findings-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `docs/evidence/${evidencePrefix}-findings-mobile.png`, fullPage: true });
  await page.getByRole('button', { name: 'Cerrar hallazgo #0' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirmar cierre y firmar' })).toBeDisabled();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
  expect((await evidence(page)).transactions.length).toBe(before + 1);
  await page.getByRole('button', { name: 'Cerrar hallazgo #0' }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Confirmar cierre y firmar' }).click();
  await expect(page.getByText('Cuenta de hallazgo cerrada', { exact: true }).first()).toBeVisible();
  await counters(page, ['0', '0', '1']);
  await expect(page.getByRole('article')).toHaveCount(0);
  await startCreate(page); await content(page, 'Segundo hallazgo', 'low');
  await submit(page, 'Hallazgo creado'); await counters(page, ['1', '1', '2']);
  await expect(page.getByRole('article', { name: '#1 · Segundo hallazgo' })).toBeVisible();
  await page.getByRole('link', { name: 'Resumen', exact: true }).click();
  await expect(page.getByLabel('Resumen de auditorías').locator('article strong')).toHaveText(['1', '1', '1']);
});

test('SBF: secuencia obsoleta rechazada y error del programa visible con estado intacto', async ({ page }) => {
  test.setTimeout(60000);
  const { authority, audit } = await createAudit(page);
  await startCreate(page); await content(page, 'Solicitud con secuencia obsoleta');
  await external(page, authority, audit, 'create');
  await external(page, authority, audit, 'resolve');
  await external(page, authority, audit, 'close');
  await page.getByRole('button', { name: 'Firmar operación del hallazgo' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Código del programa: 6008' })).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: 'El ID no coincide' })).toBeVisible();
  const last = (await evidence(page)).transactions.at(-1);
  expect(last?.error).not.toBeNull(); expect(last?.before).toEqual(last?.after);
  await page.getByRole('button', { name: 'Cerrar formulario de hallazgo' }).click();
  await page.getByRole('button', { name: 'Actualizar hallazgos' }).click();
  await counters(page, ['0', '0', '1']);
  await expect(page.getByRole('heading', { name: 'Esta auditoría aún no tiene hallazgos' })).toBeVisible();
});

test('SBF: modificación obsoleta tras resolver y cierre de abierto rechazados por Rust', async ({ page }) => {
  test.setTimeout(60000);
  const { authority, audit } = await createAudit(page);
  await startCreate(page); await content(page); await submit(page, 'Hallazgo creado');
  await page.getByRole('button', { name: 'Modificar hallazgo #0' }).click();
  await content(page, 'Edición obsoleta');
  await expect(external(page, authority, audit, 'close')).rejects.toThrow();
  let rejected = (await evidence(page)).transactions.at(-1);
  expect(rejected?.before).toEqual(rejected?.after);
  expect(rejected?.logs.some((line) => line.includes('Error Number: 6005'))).toBe(true);
  await external(page, authority, audit, 'resolve');
  await page.getByRole('button', { name: 'Firmar operación del hallazgo' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Código del programa: 6003' })).toBeVisible();
  rejected = (await evidence(page)).transactions.at(-1);
  expect(rejected?.before).toEqual(rejected?.after);
  await page.getByRole('button', { name: 'Cerrar formulario de hallazgo' }).click();
  await page.getByRole('button', { name: 'Actualizar hallazgos' }).click();
  await counters(page, ['1', '0', '1']);
  await expect(page.getByRole('button', { name: 'Modificar hallazgo #0' })).toHaveCount(0);
});

test('componentes: formularios, UTF-8, resolución y confirmación accesible de cierre', async ({ page }) => {
  await component(page, 'findings-normal');
  await expect(page.getByRole('article', { name: '#5 · Hallazgo abierto de componente' })).toContainText('Abierto');
  await expect(page.getByRole('article', { name: '#6 · Hallazgo resuelto de componente' })).toContainText('Gravedad: Crítica');
  await startCreate(page);
  await page.getByRole('button', { name: 'Revisar hallazgo', exact: true }).click();
  await expect(page.getByLabel('Título del hallazgo')).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Título del hallazgo').fill('🔐'.repeat(25));
  await page.getByRole('button', { name: 'Revisar hallazgo', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: '96 bytes' })).toBeVisible();
  await page.getByLabel('Título del hallazgo').fill('Título sintético');
  await page.getByLabel('Descripción del hallazgo').fill('ñ'.repeat(257));
  await page.getByRole('button', { name: 'Revisar hallazgo', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: '512 bytes' })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar formulario de hallazgo' }).click();
  await page.getByRole('button', { name: 'Resolver hallazgo #5' }).click();
  await page.getByLabel('Acción correctiva', { exact: true }).fill('123456789');
  await page.getByRole('button', { name: 'Revisar hallazgo', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: '10 caracteres' })).toBeVisible();
  await page.getByLabel('Acción correctiva', { exact: true }).fill('a'.repeat(513));
  await page.getByRole('button', { name: 'Revisar hallazgo', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: '512 bytes' })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar formulario de hallazgo' }).click();
  await page.getByRole('button', { name: 'Cerrar hallazgo #6' }).click();
  await expect(page.getByRole('button', { name: 'Cancelar cierre' })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Confirmar cierre y firmar' })).toBeDisabled();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
});

for (const scenario of ['pending', 'unknown', 'refresh-error']) {
  test(`componentes: transacción ${scenario}, navegación y recibo`, async ({ page }) => {
    await component(page, `findings-${scenario}`); await startCreate(page); await content(page);
    await page.getByRole('button', { name: 'Firmar operación del hallazgo' }).click();
    if (scenario === 'pending') {
      await expect(page.getByRole('button', { name: 'Esperando confirmación del hallazgo…' })).toBeDisabled();
      await expect(page.getByLabel('Auditoría de los hallazgos')).toBeDisabled();
      await page.getByRole('link', { name: 'Resumen', exact: true }).click();
      await page.evaluate(() => window.dispatchEvent(new Event('test:confirm-finding')));
      await page.getByRole('link', { name: 'Hallazgos', exact: true }).click();
      await expect(page.getByText('Hallazgo creado', { exact: true }).first()).toBeVisible();
    } else if (scenario === 'unknown') {
      await expect(page.getByRole('alert').filter({ hasText: 'firma-controlada-de-hallazgo' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Firmar operación del hallazgo' })).toBeDisabled();
      await expect(page.getByRole('link', { name: 'Ver en Solana Explorer' })).toHaveCount(0);
    } else {
      await expect(page.getByText('Hallazgo creado', { exact: true }).first()).toBeVisible();
      await expect(page.getByRole('alert').filter({ hasText: 'Consulta de hallazgos fallida' })).toBeVisible();
      await expect(page.getByText('recibo-controlado-de-hallazgo')).toBeVisible();
    }
  });
}

test('componentes: fallo de consulta se diferencia de lista vacía y admite reintento', async ({ page }) => {
  await component(page, 'findings-list-error');
  await expect(page.getByRole('alert').filter({ hasText: 'Consulta de hallazgos fallida' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reintentar hallazgos' })).toBeEnabled();
  await expect(page.getByRole('heading', { name: 'Esta auditoría aún no tiene hallazgos' })).toHaveCount(0);
});


test('componentes: consulta tardía tras desconectar no muestra hallazgos de la cuenta anterior', async ({ page }) => {
  await component(page, 'findings-late');
  await expect(page.locator('html')).toHaveAttribute('data-finding-query', 'pending');
  await page.evaluate(() => window.dispatchEvent(new Event('test:component-disconnect')));
  await expect(page.getByRole('heading', { name: 'Conecta tu wallet para consultar hallazgos' })).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('test:release-findings')));
  await expect(page.getByRole('article', { name: '#5 · Hallazgo abierto de componente' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Crear hallazgo', exact: true })).toHaveCount(0);
});
