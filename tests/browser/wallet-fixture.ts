import type { Page } from '@playwright/test';

export async function installWallet(page: Page, mode: 'approve' | 'reject' | 'wait' | 'tamper' = 'approve') {
  await page.addInitScript((signingMode) => {
    const identity = crypto.subtle.generateKey('Ed25519', false, ['sign', 'verify']).then(async (keys) => {
      const publicKey = new Uint8Array(await crypto.subtle.exportKey('raw', keys.publicKey));
      let number = 0n;
      for (const byte of publicKey) number = number * 256n + BigInt(byte);
      let address = '';
      while (number) { address = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[Number(number % 58n)] + address; number /= 58n; }
      for (const byte of publicKey) { if (byte !== 0) break; address = '1' + address; }
      return { keys, account: { address, publicKey, chains: ['solana:localnet' as const], features: ['solana:signTransaction' as const] } };
    });
    const listeners = new Set<(change: { accounts: readonly unknown[] }) => void>();
    let approve: (() => void) | undefined;
    window.addEventListener('test:approve-signature', () => approve?.());
    window.addEventListener('wallet-standard:app-ready', (event) => {
      void identity.then(({ keys, account }) => {
        let accounts: readonly typeof account[] = [];
        const provider = {
          version: '1.0.0', name: 'Wallet efímera LiteSVM', icon: 'data:image/svg+xml;base64,PHN2Zy8+', chains: ['solana:localnet'],
          get accounts() { return accounts; },
          features: {
            'standard:connect': { version: '1.0.0', connect: async () => {
              accounts = [account];
              // Fondeo exclusivamente de la VM de pruebas, nunca de una red externa.
              const response = await fetch('http://127.0.0.1:18899', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'requestAirdrop', params: [account.address, 1000000000] }) }).then((value) => value.json());
              if (response.error) throw new Error('Fondeo local falló');
              return { accounts };
            } },
            'standard:disconnect': { version: '1.0.0', disconnect: async () => { accounts = []; } },
            'standard:events': { version: '1.0.0', on: (_name: string, listener: (change: { accounts: readonly unknown[] }) => void) => { listeners.add(listener); return () => listeners.delete(listener); } },
            'solana:signTransaction': { version: '1.0.0', supportedTransactionVersions: ['legacy'], signTransaction: async (input: { transaction: Uint8Array; chain: string }) => {
              if (input.chain !== 'solana:localnet') throw new Error('Red de firma incorrecta');
              if (signingMode === 'reject') throw new Error('Firma rechazada de prueba');
              if (signingMode === 'wait') { document.documentElement.dataset.signing = 'pending'; await new Promise<void>((resolve) => { approve = resolve; }); delete document.documentElement.dataset.signing; }
              const raw = new Uint8Array(input.transaction);
              if (raw[0] !== 1) throw new Error('Se esperaba un firmante legacy');
              const signature = new Uint8Array(await crypto.subtle.sign('Ed25519', keys.privateKey, raw.slice(65)));
              raw.set(signature, 1);
              if (signingMode === 'tamper') raw[raw.length - 1] = (raw[raw.length - 1] ?? 0) ^ 1;
              return [{ signedTransaction: raw }];
            } },
          },
        };
        window.addEventListener('test:sign-wire', (event) => {
          const wire = (event as CustomEvent<{ raw: number[] }>).detail.raw;
          void provider.features['solana:signTransaction'].signTransaction({ transaction: new Uint8Array(wire), chain: 'solana:localnet' }).then((output) => {
            window.dispatchEvent(new CustomEvent('test:signed-wire', { detail: { raw: Array.from(output[0]?.signedTransaction ?? []) } }));
          }).catch(() => window.dispatchEvent(new CustomEvent('test:signed-wire', { detail: { raw: [] } })));
        });
        window.addEventListener('test:disconnect-account', () => { accounts = []; listeners.forEach((listener) => listener({ accounts })); });
        (event as CustomEvent<{ register: (wallet: unknown) => void }>).detail.register(provider);
      });
    });
  }, mode);
}
