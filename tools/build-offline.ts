import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { serviceWorkerSource, type Asset } from './offline';
const root = 'dist';
function files(dir: string): string[] { return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]); }
const assets: Asset[] = files(root).filter(path => !path.endsWith('/sw.js')).sort().map(path => ({ path: '/' + relative(root, path).replaceAll('\\', '/'), hash: createHash('sha256').update(readFileSync(path)).digest('hex') }));
const version = createHash('sha256').update(JSON.stringify(assets)).update(readFileSync('client/service-worker.template.js')).digest('hex').slice(0, 16);
writeFileSync(join(root, 'sw.js'), serviceWorkerSource(assets, version));
console.log(`Offline shell ${version}: ${assets.length} verified assets`);
