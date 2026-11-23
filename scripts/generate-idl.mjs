import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { convertIdlToCamelCase } from '@anchor-lang/core/dist/cjs/idl.js';

const root = fileURLToPath(new URL('../', import.meta.url));
function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { cwd: root, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run('cargo', ['build', '-p', 'khiputrace-idl', '--locked', '-j', '2']);
// El builder oficial puede instalar un toolchain si recibe esta variable.
const environment = { ...process.env };
delete environment.RUSTUP_TOOLCHAIN;
run(`${root}/target/debug/khiputrace-idl`, [], environment);
const idl = JSON.parse(readFileSync(`${root}/target/idl/khiputrace.json`, 'utf8'));
const camel = convertIdlToCamelCase(idl);
const destination = `${root}/frontend/src/infrastructure/anchor/generated`;
mkdirSync(destination, { recursive: true });
const artifacts = {
  'khiputrace.json': `${JSON.stringify(idl, null, 2)}\n`,
  'khiputrace.ts': '// Generado desde Rust mediante anchor-lang-idl. No editar manualmente.\n'
    + `export type Khiputrace = ${JSON.stringify(camel, null, 2)};\n\n`
    + `export const IDL: Khiputrace = ${JSON.stringify(camel, null, 2)};\n`,
};
for (const [filename, contents] of Object.entries(artifacts)) {
  const path = `${destination}/${filename}`;
  if (process.argv.includes('--check')) {
    if (readFileSync(path, 'utf8') !== contents) throw new Error(`Artefacto IDL desactualizado: ${filename}`);
  } else writeFileSync(path, contents);
}
console.log('IDL y tipos comprobados desde el programa Rust; sin despliegue.');
