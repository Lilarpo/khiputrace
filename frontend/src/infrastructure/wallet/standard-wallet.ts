import { getWallets } from '@wallet-standard/app';
import type { Wallets } from '@wallet-standard/app';
import type { Wallet, WalletAccount } from '@wallet-standard/base';
import type { StandardConnectFeature, StandardDisconnectFeature, StandardEventsFeature } from '@wallet-standard/features';
import type { TransactionWallet } from '../solana/transactions';
import type { WalletConnection, WalletSnapshot } from '../../application/wallet';

type CompatibleWallet = Wallet & { features: StandardConnectFeature & StandardDisconnectFeature & StandardEventsFeature };
function hasMethod(value: unknown, method: string): boolean {
  return typeof value === 'object' && value !== null && 'version' in value && value.version === '1.0.0'
    && method in value && typeof (value as Record<string, unknown>)[method] === 'function';
}
function compatible(wallet: Wallet, chain = 'solana:devnet'): wallet is CompatibleWallet {
  return wallet.chains.includes(chain as `${string}:${string}`) && hasMethod(wallet.features['standard:connect'], 'connect')
    && hasMethod(wallet.features['standard:disconnect'], 'disconnect') && hasMethod(wallet.features['standard:events'], 'on');
}
async function accountFor(wallet: Wallet, accounts: readonly WalletAccount[], chain: string) {
  const { PublicKey } = await import('@solana/web3.js');
  const account = accounts.find((entry) => entry.chains.includes(chain as `${string}:${string}`));
  if (!account || account.publicKey.length !== 32 || new PublicKey(account.publicKey).toBase58() !== account.address) {
    throw new Error('La wallet no compartió una cuenta compatible con la red configurada.');
  }
  return { address: account.address, name: wallet.name, canSign: signingFeature(wallet) !== null && account.features.includes('solana:signTransaction') };
}

interface SignFeature {
  readonly version: '1.0.0';
  readonly supportedTransactionVersions: readonly ('legacy' | number)[];
  signTransaction(...inputs: readonly { account: WalletAccount; transaction: Uint8Array; chain: `${string}:${string}` }[]): Promise<readonly { signedTransaction: Uint8Array }[]>;
}
function signingFeature(wallet: Wallet): SignFeature | null {
  const value = wallet.features['solana:signTransaction'];
  if (!hasMethod(value, 'signTransaction') || !value || typeof value !== 'object'
    || !('supportedTransactionVersions' in value) || !Array.isArray(value.supportedTransactionVersions)
    || !value.supportedTransactionVersions.includes('legacy')) return null;
  return value as SignFeature;
}

export class StandardWalletConnection implements WalletConnection {
  private state: WalletSnapshot = { choices: [], status: 'disconnected', account: null, error: null };
  private listeners = new Set<() => void>();
  private wallets = new Map<string, CompatibleWallet>();
  private ids = new WeakMap<Wallet, string>();
  private sequence = 0;
  private request = 0;
  private accountChange = 0;
  private selected: CompatibleWallet | null = null;
  private offAccount: (() => void) | undefined;
  private offRegistry: (() => void)[];

  constructor(private readonly registry: Wallets = getWallets(), private readonly chain: `${string}:${string}` = 'solana:devnet') {
    this.refresh();
    this.offRegistry = [registry.on('register', () => this.refresh()), registry.on('unregister', () => this.refresh())];
  }
  getSnapshot = (): WalletSnapshot => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<WalletSnapshot>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  private refresh() {
    this.wallets.clear();
    for (const wallet of this.registry.get().filter((wallet) => compatible(wallet, this.chain))) {
      let id = this.ids.get(wallet);
      if (!id) { id = `wallet-${++this.sequence}`; this.ids.set(wallet, id); }
      this.wallets.set(id, wallet);
    }
    if (this.selected && ![...this.wallets.values()].includes(this.selected)) this.clear();
    this.update({ choices: [...this.wallets].map(([id, wallet]) => ({ id, name: wallet.name })) });
  }
  private clear() {
    this.request++; this.accountChange++;
    this.offAccount?.(); this.offAccount = undefined; this.selected = null;
    this.update({ account: null, status: 'disconnected' });
  }
  async connect(id: string): Promise<void> {
    if (this.state.status === 'connecting' || this.state.status === 'disconnecting') return;
    const wallet = this.wallets.get(id);
    if (!wallet) { this.update({ error: 'La wallet ya no está disponible. Recarga e inténtalo de nuevo.' }); return; }
    this.clear();
    const request = ++this.request;
    this.selected = wallet;
    this.update({ status: 'connecting', error: null });
    try {
      const result = await wallet.features['standard:connect'].connect();
      if (request !== this.request) return;
      const account = await accountFor(wallet, result.accounts, this.chain);
      if (request !== this.request) return;
      this.offAccount = wallet.features['standard:events'].on('change', (change) => {
        if (request !== this.request) return;
        const revision = ++this.accountChange;
        this.update({ account: null, status: 'connecting', error: null });
        const updateAccount = async () => {
          if (!compatible(wallet, this.chain)) throw new Error('La wallet dejó de admitir la red configurada.');
          return accountFor(wallet, change.accounts ?? wallet.accounts, this.chain);
        };
        void updateAccount().then((next) => {
          if (request === this.request && revision === this.accountChange) this.update({ account: next, status: 'connected', error: null });
        }).catch(() => {
          if (request !== this.request || revision !== this.accountChange) return;
          this.clear(); this.update({ error: 'La cuenta cambió o se desconectó. Conecta una cuenta compatible con la red configurada.' });
        });
      });
      this.update({ status: 'connected', account });
    } catch {
      if (request !== this.request) return;
      this.clear();
      this.update({ error: 'No se pudo conectar. Revisa la solicitud en tu wallet y vuelve a intentarlo.' });
    }
  }
  async disconnect(): Promise<void> {
    const wallet = this.selected;
    this.clear();
    const request = this.request;
    this.update({ status: 'disconnecting', error: null });
    try { await wallet?.features['standard:disconnect'].disconnect(); }
    catch { if (request === this.request) this.update({ error: 'Sesión local cerrada. Revisa la desconexión y los permisos desde tu wallet.' }); }
    finally { if (request === this.request) this.update({ status: 'disconnected' }); }
  }
  async transactionWallet(): Promise<TransactionWallet | null> {
    const selected = this.selected;
    const identity = this.state.account;
    const request = this.request;
    if (!selected || !identity || this.state.status !== 'connected') return null;
    const feature = signingFeature(selected);
    const account = selected.accounts.find((entry) => entry.address === identity.address && entry.chains.includes(this.chain));
    if (!feature || !account || !account.features.includes('solana:signTransaction')) return null;
    const { PublicKey, Transaction } = await import('@solana/web3.js');
    if (request !== this.request || this.state.account?.address !== identity.address) return null;
    return {
      publicKey: new PublicKey(identity.address),
      signTransaction: async (transaction) => {
        if (request !== this.request || this.state.account?.address !== identity.address) throw new Error('La cuenta cambió antes de firmar.');
        const output = await feature.signTransaction({ account, transaction: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }), chain: this.chain });
        if (request !== this.request || this.state.account?.address !== identity.address || output.length !== 1) throw new Error('La cuenta cambió durante la firma.');
        const result = output[0];
        if (!result || !(result.signedTransaction instanceof Uint8Array)) throw new Error('Firma inválida.');
        return Transaction.from(result.signedTransaction);
      },
    };
  }
  dispose() { this.clear(); this.offRegistry.forEach((off) => off()); this.listeners.clear(); }
}
