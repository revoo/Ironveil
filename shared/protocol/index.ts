import type {Difficulty} from '../content/difficulty';
import type {Observation} from '../sim/match';
import type { CombatView, WeaponAction } from '../sim/combat';
import type { DriveInput, Tank } from '../sim';
export const PROTOCOL_VERSION = 7;
export const CONTENT_VERSION = 9;
export type Handshake = { protocolVersion: number; contentVersion: number };
export const currentHandshake = (): Handshake => ({ protocolVersion: PROTOCOL_VERSION, contentVersion: CONTENT_VERSION });
export function versionsMatch(value: unknown): value is Handshake {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.protocolVersion === PROTOCOL_VERSION && v.contentVersion === CONTENT_VERSION;
}
export type WorkerRequest = {type:'lesson';index:number} | {type:'smoke';seq:number} | {type:'pause';value:boolean} | { type: 'reset';difficulty?:Difficulty } | { type: 'range-fire' } | { type: 'weapon'; seq: number; action: WeaponAction } | { type: 'neutralize' } | { type: 'advance'; ticks: number } | { type: 'start'; mode?:'solo'|'range'|'tutorial';difficulty?:Difficulty } | { type: 'input'; input: DriveInput };
export type WorkerResponse = {type:'match'; observation:Observation;tutorialStep?:number} | { type: 'state'; tick: number; tank: Tank; combat: CombatView } | { type: 'advanced'; tick: number; elapsedSeconds: number } | { type: 'error'; message: string };
