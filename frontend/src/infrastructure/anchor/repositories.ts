import { BN } from '@anchor-lang/core';
import type { Program } from '@anchor-lang/core';
import { SystemProgram } from '@solana/web3.js';
import type { PublicKey, TransactionInstruction } from '@solana/web3.js';
import type {
  AuditReader, AuditWriter, CreateAuditInput, CreateFindingInput, FindingIdentity,
  FindingReader, FindingWriter, ResolveFindingInput, UpdateFindingInput,
} from '../../domain/ports';
import { accountAddress, auditPda, encodeId, findingPda } from '../solana/pdas';
import type { TransactionSender, TransactionWallet } from '../solana/transactions';
import { AccountReader } from './accounts';
import { requireAccount } from './mappers';
import { repositoryCall } from './errors';
import type { Khiputrace } from './generated/khiputrace';

function integer(id: bigint): BN {
  encodeId(id);
  return new BN(id.toString(10));
}

function severity(value: CreateFindingInput['severity']) {
  switch (value) {
    case 'low': return { low: {} };
    case 'medium': return { medium: {} };
    case 'high': return { high: {} };
    case 'critical': return { critical: {} };
  }
}

export class AnchorRepositories implements AuditReader, AuditWriter, FindingReader, FindingWriter {
  constructor(
    private readonly program: Program<Khiputrace>,
    private readonly reader: AccountReader,
    private readonly sender: TransactionSender,
  ) {}

  private async write(build: (wallet: TransactionWallet) => Promise<TransactionInstruction>) {
    return repositoryCall(async () => {
      const wallet = this.sender.wallet();
      const instruction = await build(wallet);
      return this.sender.send(instruction, wallet);
    });
  }

  getAudit(address: string) {
    return repositoryCall(async () => {
      await this.reader.session.assertReady();
      return this.reader.getAudit(accountAddress(address));
    });
  }

  listAudits(authority: string) {
    return repositoryCall(async () => {
      await this.reader.session.assertReady();
      const key = accountAddress(authority);
      const entries = await this.list('audit', 174, key);
      const audits = entries.map(({ pubkey, account }) => this.reader.audit(pubkey, account));
      for (const audit of audits) requireAccount(audit.authority === key.toBase58(), 'El RPC devolvió una autoridad diferente.');
      return audits.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    });
  }

  getFinding(identity: FindingIdentity) {
    return repositoryCall(async () => {
      await this.reader.session.assertReady();
      const auditAddress = accountAddress(identity.audit);
      const address = findingPda(this.program.programId, auditAddress, identity.id)[0];
      const info = await this.reader.session.rpc.getAccountInfo(address, 'confirmed');
      if (info === null) return null;
      const audit = await this.reader.getAudit(auditAddress);
      requireAccount(audit !== null, 'La auditoría del hallazgo no existe.');
      return this.reader.finding(address, info, audit);
    });
  }

  listFindings(auditAddress: string) {
    return repositoryCall(async () => {
      await this.reader.session.assertReady();
      const key = accountAddress(auditAddress);
      const audit = await this.reader.getAudit(key);
      if (audit === null) return [];
      const entries = await this.list('finding', 1184, key);
      return entries.map(({ pubkey, account }) => this.reader.finding(pubkey, account, audit))
        .sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    });
  }

  private list(name: 'audit' | 'finding', size: number, parent: PublicKey) {
    // owner implícito del RPC más validación explícita del mapper; no confiar en filtros remotos.
    const discriminator = this.program.coder.accounts.memcmp(name) as { offset: number; bytes: string };
    return this.reader.session.rpc.getProgramAccounts(this.program.programId, {
      commitment: 'confirmed', filters: [
        { dataSize: size }, { memcmp: discriminator }, { memcmp: { offset: 9, bytes: parent.toBase58() } },
      ],
    });
  }

  createAudit(input: CreateAuditInput) {
    return this.write((wallet) => this.program.methods.createAudit(integer(input.id), input.title)
      .accountsStrict({ authority: wallet.publicKey,
        audit: auditPda(this.program.programId, wallet.publicKey, input.id)[0], systemProgram: SystemProgram.programId })
      .instruction());
  }

  createFinding(input: CreateFindingInput) {
    return this.write((wallet) => {
      const audit = accountAddress(input.audit);
      return this.program.methods.createFinding(integer(input.expectedNextId), input.title, input.description, severity(input.severity))
        .accountsStrict({ authority: wallet.publicKey, audit,
          finding: findingPda(this.program.programId, audit, input.expectedNextId)[0], systemProgram: SystemProgram.programId })
        .instruction();
    });
  }

  updateFinding(input: UpdateFindingInput) {
    return this.write((wallet) => this.program.methods.updateFinding(input.title, input.description, severity(input.severity))
      .accountsStrict(this.accounts(input, wallet)).instruction());
  }

  resolveFinding(input: ResolveFindingInput) {
    return this.write((wallet) => this.program.methods.resolveFinding(input.correctiveAction)
      .accountsStrict(this.accounts(input, wallet)).instruction());
  }

  closeFinding(identity: FindingIdentity) {
    return this.write((wallet) => this.program.methods.closeFinding()
      .accountsStrict(this.accounts(identity, wallet)).instruction());
  }

  private accounts(identity: FindingIdentity, wallet: TransactionWallet) {
    const audit = accountAddress(identity.audit);
    return { authority: wallet.publicKey, audit, finding: findingPda(this.program.programId, audit, identity.id)[0] };
  }
}

