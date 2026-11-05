import { readFileSync } from 'node:fs';
export interface Asset {
    path: string;
    hash: string;
}
export function serviceWorkerSource(assets: Asset[], version: string): string { return `const VERSION=${JSON.stringify(version)};const ASSETS=${JSON.stringify(assets)};\n` + readFileSync(new URL('../client/service-worker.template.js', import.meta.url), 'utf8'); }
