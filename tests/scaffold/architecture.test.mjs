import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectSource } from '../../scripts/check-architecture.mjs';

test('acepta contratos internos y adaptadores externos en Infrastructure', () => {
  assert.deepEqual(inspectSource('application/contracts.ts', "import type { Audit } from '../domain/entities';"), []);
  assert.deepEqual(inspectSource('infrastructure/anchor/client.ts', "import { Program } from '@anchor-lang/core';"), []);
});

test('rechaza dependencias externas y hacia adaptadores en capas internas', () => {
  for (const source of [
    "import { useState } from 'react';",
    "export * from '../infrastructure/client';",
    "const client = import('../infrastructure/client');",
    "type Client = import('../infrastructure/client').Client;",
  ]) assert.ok(inspectSource('domain/entity.ts', source).length > 0);
  assert.ok(inspectSource('presentation/App.tsx', "import { client } from '../infrastructure/client';").length > 0);
});

test('rechaza any explícito y dependencias calculadas', () => {
  assert.ok(inspectSource('domain/entity.ts', 'type Entity = any;').length > 0);
  assert.ok(inspectSource('application/case.ts', 'import(moduleName);').length > 0);
});

test('Presentation rechaza SDKs blockchain en imports, exports y tipos', () => {
  for (const sdk of ['@anchor-lang/core', '@coral-xyz/anchor', '@solana/web3.js', '@wallet-standard/app']) {
    for (const source of [
      `import { Client } from '${sdk}';`,
      `export * from '${sdk}';`,
      `const client = import('${sdk}');`,
      `type Client = import('${sdk}').Client;`,
      `const client = require('${sdk}');`,
    ]) assert.equal(inspectSource('presentation/component.tsx', source).length, 1);
  }
  assert.deepEqual(inspectSource('presentation/component.tsx', "import { useState } from 'react';"), []);
  assert.deepEqual(inspectSource('infrastructure/client.ts', "import { PublicKey } from '@solana/web3.js';"), []);
});
