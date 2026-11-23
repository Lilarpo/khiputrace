export interface WalletChoice { readonly id: string; readonly name: string }
export interface WalletIdentity { readonly address: string; readonly name: string; readonly canSign?: boolean }
export interface WalletSnapshot {
  readonly choices: readonly WalletChoice[];
  readonly status: 'disconnected' | 'connecting' | 'connected' | 'disconnecting';
  readonly account: WalletIdentity | null;
  readonly error: string | null;
}

export interface WalletConnection {
  getSnapshot(): WalletSnapshot;
  subscribe(listener: () => void): () => void;
  connect(id: string): Promise<void>;
  disconnect(): Promise<void>;
}
