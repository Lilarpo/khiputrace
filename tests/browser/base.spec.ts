import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
const evidencePrefix = process.env.KHIPUTRACE_EVIDENCE_PREFIX ?? '3.1';
const ADDRESS = '4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi';

async function wallet(page: Page, options: { reject?: boolean; delayed?: boolean; disconnectError?: boolean; wrongChain?: boolean; late?: boolean } = {}) {
  await page.addInitScript((settings) => {
    let accounts: readonly { address: string; publicKey: Uint8Array; chains: readonly `${string}:${string}`[]; features: readonly `${string}:${string}`[] }[] = [];
    const listeners = new Set<(change: { accounts: typeof accounts }) => void>();
    let approve: (() => void) | undefined;
    let register: ((provider: unknown) => void) | undefined;
    const account = { address: '4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi', publicKey: new Uint8Array(32).fill(1), chains: settings.wrongChain ? ['solana:mainnet' as const] : ['solana:devnet' as const], features: [] };
    const emit = () => listeners.forEach((listener) => listener({ accounts }));
    const provider = {
      version: '1.0.0' as const, name: 'Wallet de prueba', icon: 'data:image/svg+xml;base64,PHN2Zy8+' as const,
      chains: ['solana:devnet' as const], get accounts() { return accounts; },
      features: {
        'standard:connect': { version: '1.0.0' as const, connect: async () => {
          if (settings.reject) throw new Error('Rechazo simulado');
          if (settings.delayed) await new Promise<void>((resolve) => { approve = resolve; });
          accounts = [account]; emit(); return { accounts };
        } },
        'standard:disconnect': { version: '1.0.0' as const, disconnect: async () => { accounts = []; emit(); if (settings.disconnectError) throw new Error('Error simulado'); } },
        'standard:events': { version: '1.0.0' as const, on: (_event: string, listener: (change: { accounts: typeof accounts }) => void) => { listeners.add(listener); return () => listeners.delete(listener); } },
        'solana:signTransaction': { version: '1.0.0' as const, signTransaction: () => { throw new Error('Esta base no debe solicitar firmas'); } },
      },
    };
    window.addEventListener('wallet-standard:app-ready', (event) => {
      const detail = (event as CustomEvent<{ register: (provider: unknown) => void }>).detail;
      register = detail.register;
      if (!settings.late) register(provider);
    });
    window.addEventListener('test:register', () => register?.(provider));
    window.addEventListener('test:approve', () => approve?.());
    window.addEventListener('test:account-change', () => {
      accounts = [{ ...account, address: '11111111111111111111111111111111', publicKey: new Uint8Array(32) }]; emit();
    });
    window.addEventListener('test:unsupported', () => { accounts = [{ ...account, chains: ['solana:mainnet'] }]; emit(); });
  }, options);
}
async function connect(page: Page) {
  await page.getByRole('button', { name: 'Conectar wallet', exact: true }).first().click();
  await page.getByRole('button', { name: 'Wallet de prueba' }).click();
}
test.beforeEach(async ({ page }) => {
  // Todo tráfico externo queda bloqueado; las pruebas no consultan Devnet real.
  await page.route('**/*', (route) => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
});

test('escritorio: identidad, navegación y datos sin inventar', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Una visión clara. Una huella verificable.' })).toBeVisible();
  await expect(page.getByLabel('Resumen de auditorías').locator('article strong')).toHaveText(['—', '—', '—']);
  await expect(page.getByText('Programa pendiente de configuración', { exact: true })).toBeVisible();
  await expect(page.getByText('Solana Devnet', { exact: true })).toBeVisible();
  await page.screenshot({ path: `docs/evidence/${evidencePrefix}-desktop.png`, fullPage: true });
  await page.getByRole('link', { name: 'Auditorías', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Registro de auditorías' })).toBeVisible();
  await page.getByRole('link', { name: 'Hallazgos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Cada hallazgo, una solución.' })).toBeVisible();
  await page.getByRole('link', { name: 'Guía de uso', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Trabaja con confianza.' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('móvil: layout sin overflow y selector accesible con teclado', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `docs/evidence/${evidencePrefix}-mobile.png`, fullPage: true });
  await page.getByRole('button', { name: 'Conectar mi wallet' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('No detectamos wallets compatibles')).toBeVisible();
  await expect(page.getByText('Esta conexión no solicita firmas ni mueve fondos.', { exact: false })).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('conectar, mostrar dirección pública, copiar y desconectar sin persistencia', async ({ page }) => {
  await wallet(page); await page.goto('/'); await connect(page);
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByText(ADDRESS, { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tu wallet está lista. El programa, pendiente.' })).toBeVisible();
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Copiar dirección pública' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Dirección pública copiada.' })).toBeVisible();
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
  await page.getByRole('button', { name: 'Desconectar wallet' }).click();
  await expect(page.getByText(ADDRESS, { exact: true })).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Conectar wallet', exact: true }).first()).toBeEnabled();
});

test('wallet rechazada: error visible y notificación descartable', async ({ page }) => {
  await wallet(page, { reject: true }); await page.goto('/'); await connect(page);
  await expect(page.getByRole('alert').first()).toContainText('No se pudo conectar.');
  await page.getByRole('button', { name: 'Cerrar selector de wallet' }).click();
  await page.getByRole('button', { name: 'Cerrar notificación' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('cancelar conexión pendiente ignora una aprobación tardía', async ({ page }) => {
  await wallet(page, { delayed: true }); await page.goto('/'); await connect(page);
  await expect(page.getByText('Revisa la solicitud en tu wallet.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar conexión' }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('test:approve')));
  await expect(page.getByText(ADDRESS, { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Desconectar wallet' })).toHaveCount(0);
});

test('cambio de cuenta y pérdida de compatibilidad Devnet limpian la sesión', async ({ page }) => {
  await wallet(page); await page.goto('/'); await connect(page);
  await expect(page.getByText(ADDRESS, { exact: true })).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('test:account-change')));
  await expect(page.getByText('11111111111111111111111111111111', { exact: true })).toBeVisible();
  await expect(page.getByText(ADDRESS, { exact: true })).not.toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('test:unsupported')));
  await expect(page.getByRole('button', { name: 'Desconectar wallet' })).toHaveCount(0);
  await expect(page.getByRole('alert').first()).toContainText('La cuenta cambió');
});

test('cuenta sin soporte Devnet no deja sesión activa', async ({ page }) => {
  await wallet(page, { wrongChain: true }); await page.goto('/'); await connect(page);
  await expect(page.getByRole('alert').first()).toContainText('No se pudo conectar.');
  await expect(page.getByRole('button', { name: 'Desconectar wallet' })).toHaveCount(0);
});

test('error de desconexión informa cierre local sin afirmar revocación', async ({ page }) => {
  await wallet(page, { disconnectError: true }); await page.goto('/'); await connect(page);
  await page.getByRole('button', { name: 'Desconectar wallet' }).click();
  await expect(page.getByRole('alert')).toContainText('Sesión local cerrada.');
  await expect(page.getByText(ADDRESS, { exact: true })).not.toBeVisible();
});

async function rpc(page: Page, list: () => Promise<unknown>) {
  const methods: string[] = [];
  await page.route('https://api.devnet.solana.com*', async (route) => {
    const request = route.request().postDataJSON() as { method: string; id: string; params?: unknown[] };
    methods.push(request.method);
    let result: unknown;
    if (request.method === 'getGenesisHash') result = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
    else if (request.method === 'getAccountInfo') result = { context: { slot: 1 }, value: { data: ['', 'base64'], executable: true, lamports: 1, owner: 'BPFLoader2111111111111111111111111111111111', rentEpoch: 0 } };
    else if (request.method === 'getProgramAccounts') result = await list();
    else throw new Error(`RPC no permitido: ${request.method}`);
    await route.fulfill({ json: { jsonrpc: '2.0', id: request.id, result } });
  });
  return methods;
}

test('Application real: carga, lista vacía confirmada por RPC controlado y ninguna escritura', async ({ page }) => {
  await wallet(page);
  let release: (() => void) | undefined;
  const methods = await rpc(page, () => new Promise<unknown>((resolve) => { release = () => resolve([]); }));
  await page.goto('http://127.0.0.1:4174'); await connect(page);
  await expect(page.getByRole('heading', { name: 'Consultando auditorías' })).toBeVisible();
  await expect.poll(() => !!release).toBe(true); release?.();
  await expect(page.getByRole('heading', { name: 'Aún no tienes auditorías' })).toBeVisible();
  await expect(page.getByLabel('Resumen de auditorías').locator('article strong')).toHaveText(['0', '0', '0']);
  expect(methods).toEqual(['getGenesisHash', 'getAccountInfo', 'getProgramAccounts']);
});

test('error RPC, reintento y respuesta tardía tras desconectar', async ({ page }) => {
  await wallet(page);
  let attempts = 0; let release: (() => void) | undefined;
  await rpc(page, async () => { attempts++; if (attempts === 1) return 'respuesta-inválida-sintética'; return new Promise((resolve) => { release = () => resolve([]); }); });
  await page.goto('http://127.0.0.1:4174'); await connect(page);
  await expect(page.getByRole('heading', { name: 'No pudimos cargar tus auditorías' })).toBeVisible();
  await page.getByRole('button', { name: 'Reintentar consulta' }).click();
  await expect.poll(() => !!release).toBe(true);
  await page.getByRole('button', { name: 'Desconectar wallet' }).click(); release?.();
  await expect(page.getByRole('heading', { name: 'Tu espacio de auditoría comienza aquí' })).toBeVisible();
  await expect(page.getByLabel('Resumen de auditorías').locator('article strong')).toHaveText(['—', '—', '—']);
});

test('wallet registrada después de cargar aparece sin recargar la página', async ({ page }) => {
  await wallet(page, { late: true }); await page.goto('/');
  await page.getByRole('button', { name: 'Conectar mi wallet' }).click();
  await expect(page.getByText('No detectamos wallets compatibles')).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('test:register')));
  await page.getByRole('button', { name: 'Wallet de prueba' }).click();
  await expect(page.getByText(ADDRESS, { exact: true })).toBeVisible();
});
