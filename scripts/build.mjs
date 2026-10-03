import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(projectRoot, 'dist');
const assets = ['index.html', 'styles.css', 'src'];

for (const asset of assets) {
  await stat(path.join(projectRoot, asset));
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const asset of assets) {
  await cp(path.join(projectRoot, asset), path.join(output, asset), { recursive: true });
}

console.log(`Demo preparada en ${output}`);
