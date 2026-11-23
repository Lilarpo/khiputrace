import type { Program } from '@anchor-lang/core';
import type { ApplicationDependencies } from '../../application/contracts';
import type { Khiputrace } from './generated/khiputrace';

export interface AnchorAdapterContext {
  readonly program: Program<Khiputrace>;
}

export type AnchorRepositoryPorts = ApplicationDependencies;
