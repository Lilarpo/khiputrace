import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../frontend/src/', import.meta.url));
const allowed = {
  domain: ['domain'],
  application: ['domain', 'application'],
  infrastructure: ['domain', 'application', 'infrastructure'],
  presentation: ['domain', 'application', 'presentation'],
  composition: ['domain', 'application', 'infrastructure', 'composition'],
};

export function inspectSource(relativePath, source) {
  const layer = relativePath.split('/')[0];
  if (!(layer in allowed)) return []; // main.tsx es el arranque de React.
  const errors = [];
  const ast = ts.createSourceFile(relativePath, source, ts.ScriptTarget.Latest, true);
  const inspectModule = (specifier) => {
    if (!specifier.startsWith('.')) {
      if (layer === 'domain' || layer === 'application') errors.push(`${relativePath}: import externo ${specifier}`);
      if (layer === 'presentation' && /^(?:@anchor-lang\/|@coral-xyz\/|@solana\/|@wallet-standard\/)/.test(specifier)) {
        errors.push(`${relativePath}: SDK blockchain reservado a Infrastructure: ${specifier}`);
      }
      return;
    }
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(relativePath), specifier)).split('/')[0];
    if (!allowed[layer].includes(target)) errors.push(`${relativePath}: dependencia prohibida hacia ${target}`);
  };
  const visit = (node) => {
    if (node.kind === ts.SyntaxKind.AnyKeyword) errors.push(`${relativePath}: any explícito`);
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) inspectModule(node.moduleSpecifier.text);
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(ast) === 'require')) {
      const arg = node.arguments[0];
      if (arg && ts.isStringLiteral(arg)) inspectModule(arg.text);
      else errors.push(`${relativePath}: import calculado no verificable`);
    }
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) inspectModule(node.argument.literal.text);
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return errors;
}

function checkTree(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return checkTree(fullPath);
    if (!/\.tsx?$/.test(entry.name)) return [];
    return inspectSource(path.relative(root, fullPath).split(path.sep).join('/'), readFileSync(fullPath, 'utf8'));
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = checkTree(root);
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else console.log('Límites de dependencias frontend: OK.');
}
