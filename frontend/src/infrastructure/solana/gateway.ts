import type {
  AccountInfo, BlockhashWithExpiryBlockHeight, BlockheightBasedTransactionConfirmationStrategy,
  Commitment, GetProgramAccountsFilter, PublicKey, RpcResponseAndContext, SendOptions, SignatureResult,
} from '@solana/web3.js';
import type { Buffer } from 'buffer';

export interface ChainGateway {
  getGenesisHash(): Promise<string>;
  getAccountInfo(address: PublicKey, commitment?: Commitment): Promise<AccountInfo<Buffer> | null>;
  getProgramAccounts(programId: PublicKey, config: {
    commitment: Commitment; filters: GetProgramAccountsFilter[];
  }): Promise<readonly { pubkey: PublicKey; account: AccountInfo<Buffer> }[]>;
  getLatestBlockhash(commitment?: Commitment): Promise<BlockhashWithExpiryBlockHeight>;
  sendRawTransaction(raw: Uint8Array, options?: SendOptions): Promise<string>;
  confirmTransaction(strategy: BlockheightBasedTransactionConfirmationStrategy, commitment?: Commitment):
    Promise<RpcResponseAndContext<SignatureResult>>;
}
