import type { CombatView, WeaponAction } from '../sim/combat';
import type { DriveInput, Tank } from '../sim';
export const PROTOCOL_VERSION = 1;
export const CONTENT_VERSION = 1;
export type Handshake = { protocolVersion: number; contentVersion: number };
export const currentHandshake = (): Handshake => ({ protocolVersion: PROTOCOL_VERSION, contentVersion: CONTENT_VERSION });
export function versionsMatch(value: unknown): value is Handshake {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.protocolVersion === PROTOCOL_VERSION && v.contentVersion === CONTENT_VERSION;
}
export type WorkerRequest = { type: 'weapon'; action: WeaponAction } | { type: 'neutralize' } | { type: 'advance'; ticks: number } | { type: 'start' } | { type: 'input'; input: DriveInput };
export type WorkerResponse = { type: 'state'; tick: number; tank: Tank; combat: CombatView } | { type: 'advanced'; tick: number; elapsedSeconds: number } | { type: 'error'; message: string };
