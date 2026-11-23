import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { installWallet } from './wallet-fixture';
const evidencePrefix = process.env.KHIPUTRACE_EVIDENCE_PREFIX ?? '3.2';


async function connect(page: Page) {
  await page.goto('/#audits');
  await page.getByRole('button', { name: 'Conectar wallet', exact: true }).first().click();
  await page.getByRole('button', { name: 'Wallet efímera LiteSVM' }).click();
  await expect(page.getByRole('heading', { name: 'Aún no tienes auditorías' })).toBeVisible();
}
async function form(page: Page, id = '9007199254740993', title = 'Auditoría E2E sintética') {
  await page.getByRole('button', { name: 'Crear auditoría', exact: true }).click();
  await page.getByLabel('ID de auditoría', { exact: true }).fill(id);
  await page.getByLabel('Título', { exact: true }).fill(title);
  await page.getByRole('button', { name: 'Revisar auditoría' }).click();
}
async function evidence(page: Page) {
  return page.request.get('http://127.0.0.1:18899/evidence').then((response) => response.json()) as Promise<{ transactions: { signature: string; error: unknown; logs: string[]; before: Record<string, unknown>; after: Record<string, unknown> }[] }>;
}
test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
});

test('SBF real: validar, firmar, confirmar, refrescar, leer detalle y rechazar ID duplicado', async ({ page }) => {
  await installWallet(page, 'wait'); await connect(page);
  const initial = (await evidence(page)).transactions.length;
  await form(page, '-1', '   ');
  await expect(page.getByText('Introduce un ID decimal', { exact: false })).toBeVisible();
  await expect(page.getByText('Este campo es obligatorio.')).toBeVisible();
  expect((await evidence(page)).transactions.length).toBe(initial);
  await page.getByLabel('ID de auditoría', { exact: true }).fill('9007199254740993');
  await page.getByLabel('Título', { exact: true }).fill('  Auditoría E2E sintética  ');
  await page.getByRole('button', { name: 'Revisar auditoría' }).click();
  await expect(page.getByRole('heading', { name: 'Revisa antes de firmar' })).toBeVisible();
  await expect(page.getByText('Tu wallet pagará', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Firmar y crear auditoría' }).click();
  await expect(page.getByText('Firma y confirmación pendientes', { exact: true })).toBeVisible();
  expect((await evidence(page)).transactions.length).toBe(initial);
  await expect(page.getByRole('button', { name: 'Esperando confirmación…' })).toBeDisabled();
  await expect(page.locator('html')).toHaveAttribute('data-signing', 'pending');
  await page.getByRole('link', { name: 'Resumen', exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('test:approve-signature')));
  await expect(page.getByLabel('Resumen de auditorías').locator('article strong').first()).toHaveText('1');
  await page.getByRole('link', { name: 'Auditorías', exact: true }).click();
  await expect(page.getByText('Auditoría confirmada', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ver auditoría Auditoría E2E sintética' }).click();
  const detail = page.getByRole('region', { name: 'Detalle de auditoría' });
  await expect(detail.getByText('9007199254740993', { exact: true })).toBeVisible();
  await expect(detail.locator('dd')).toHaveCount(6);
  await expect(detail.locator('dd').nth(3)).toHaveText('0');
  await expect(detail.locator('dd').nth(4)).toHaveText('0');
  await expect(detail.locator('dd').nth(5)).toHaveText('0');
  while (await page.getByRole('button', { name: 'Cerrar notificación' }).count()) await page.getByRole('button', { name: 'Cerrar notificación' }).first().click();
  await page.screenshot({ path: `docs/evidence/${evidencePrefix}-audits-desktop.png`, fullPage: true });
  const created = (await evidence(page)).transactions.at(-1);
  expect(created?.error).toBeNull();
  expect(created?.logs.some((line) => line.includes('Instruction: CreateAudit'))).toBe(true);
  await page.getByRole('button', { name: 'Cerrar formulario' }).click();
  await form(page, '9007199254740993', 'Auditoría duplicada sintética');
  await page.getByRole('button', { name: 'Firmar y crear auditoría' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-signing', 'pending');
  await page.evaluate(() => window.dispatchEvent(new Event('test:approve-signature')));
  await expect(page.getByText('No se pudo crear la auditoría', { exact: true })).toBeVisible();
  const rejected = (await evidence(page)).transactions.at(-1);
  expect(rejected?.error).not.toBeNull();
  expect(rejected?.logs.some((line) => line.includes('Instruction: CreateAudit'))).toBe(true);
  const changedAccounts = Object.entries(rejected?.before ?? {}).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(rejected?.after[key]));
  // Preflight ejecuta el rechazo en SBF sin enviar: todas las cuentas permanecen intactas.
  expect(changedAccounts).toHaveLength(0);
  await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ver auditoría Auditoría E2E sintética' })).toHaveCount(1);
});

test('firma rechazada no envía transacción ni crea datos', async ({ page }) => {
  await installWallet(page, 'reject'); await connect(page);
  const initial = (await evidence(page)).transactions.length;
  await form(page, '1'); await page.getByRole('button', { name: 'Firmar y crear auditoría' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'La wallet no pudo firmar' })).toBeVisible();
  expect((await evidence(page)).transactions.length).toBe(initial);
  await expect(page.getByRole('heading', { name: 'Aún no tienes auditorías' })).toBeVisible();
});

test('desconexión durante firma retira formulario e ignora resultado tardío', async ({ page }) => {
  await installWallet(page, 'wait'); await connect(page);
  const initial = (await evidence(page)).transactions.length;
  await form(page, '2'); await page.getByRole('button', { name: 'Firmar y crear auditoría' }).click();
  await expect(page.getByRole('button', { name: 'Esperando confirmación…' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-signing', 'pending');
  await page.evaluate(() => { window.dispatchEvent(new Event('test:disconnect-account')); window.dispatchEvent(new Event('test:approve-signature')); });
  await expect(page.getByRole('heading', { name: 'Nueva auditoría' })).toHaveCount(0);
  await expect(page.getByText('Auditoría confirmada', { exact: true })).toHaveCount(0);
  expect((await evidence(page)).transactions.length).toBe(initial);
});

async function component(page: Page, scenario: string) {
  const module = fileURLToPath(new URL('./components.tsx', import.meta.url));
  await page.route('**/component-harness?*', (route) => route.fulfill({ contentType: 'text/html', body: `<html lang="es"><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>t=>t; window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/@fs${module}"></script></html>` }));
  await page.goto(`http://127.0.0.1:4176/component-harness?scenario=${scenario}#audits`);
  await expect(page.getByRole('button', { name: 'Ver auditoría Auditoría de componente' })).toBeVisible();
}

test('componentes: límites UTF-8/u64 y revisión normalizada, sin firma al editar', async ({ page }) => {
  await component(page, 'normal'); await form(page, '18446744073709551616', '🔐'.repeat(25));
  await expect(page.getByText('El ID debe ser un entero', { exact: false })).toBeVisible();
  await expect(page.getByText('El texto admite como máximo 96 bytes UTF-8.')).toBeVisible();
  await page.getByLabel('ID de auditoría', { exact: true }).fill('18446744073709551615');
  await page.getByLabel('Título', { exact: true }).fill('  Revisión sintética  ');
  await page.getByRole('button', { name: 'Revisar auditoría' }).click();
  await expect(page.getByText('Revisión sintética', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `docs/evidence/${evidencePrefix}-audit-form-mobile.png`, fullPage: true });
  await page.getByRole('button', { name: 'Editar datos' }).click();
  await expect(page.getByLabel('Título', { exact: true })).toHaveValue('  Revisión sintética  ');
  await expect(page.getByText('Auditoría confirmada', { exact: true })).toHaveCount(0);
});

test('componentes: resultado incierto conserva firma y bloquea nuevo envío', async ({ page }) => {
  await component(page, 'unknown'); await form(page, '0');
  await page.getByRole('button', { name: 'Firmar y crear auditoría' }).click();
  await expect(page.getByRole('alert')).toContainText('Resultado de transacción incierto');
  await expect(page.getByRole('alert')).toContainText('firma-controlada-no-Devnet');
  await expect(page.getByRole('button', { name: 'Firmar y crear auditoría' })).toBeDisabled();
  await expect(page.getByRole('link', { name: 'Ver en Solana Explorer' })).toHaveCount(0);
});

test('componentes: fallo al refrescar no transforma una confirmación en fracaso', async ({ page }) => {
  await component(page, 'refresh-error'); await form(page, '0');
  await page.getByRole('button', { name: 'Firmar y crear auditoría' }).click();
  await expect(page.getByText('Auditoría confirmada', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No pudimos cargar tus auditorías' })).toBeVisible();
  await expect(page.getByText('recibo-controlado-no-Devnet')).toBeVisible();
});

for (const scenario of ['normal', 'missing', 'detail-error']) {
  test(`componentes: detalle ${scenario} y contadores de cuenta`, async ({ page }) => {
    await component(page, scenario);
    await page.getByRole('button', { name: 'Ver auditoría Auditoría de componente' }).click();
    const detail = page.getByRole('region', { name: 'Detalle de auditoría' });
    if (scenario === 'normal') {
      await expect(detail.locator('dd')).toHaveText(['0', '11111111111111111111111111111113', '11111111111111111111111111111112', '3', '2', '8']);
      await page.setViewportSize({ width: 390, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: `docs/evidence/${evidencePrefix}-audits-mobile.png`, fullPage: true });
    } else if (scenario === 'missing') await expect(detail).toContainText('No se encontró la cuenta');
    else { await expect(detail.getByRole('alert')).toHaveText('Detalle fallido de prueba.'); await expect(detail.getByRole('button', { name: 'Reintentar detalle' })).toBeVisible(); }
  });
}


test('wallet que altera el mensaje firmado es rechazada antes del envío', async ({ page }) => {
  await installWallet(page, 'tamper'); await connect(page);
  const initial = (await evidence(page)).transactions.length;
  await form(page, '3'); await page.getByRole('button', { name: 'Firmar y crear auditoría' }).click();
  await expect(page.getByText('No se pudo crear la auditoría', { exact: true })).toBeVisible();
  expect((await evidence(page)).transactions.length).toBe(initial);
});
