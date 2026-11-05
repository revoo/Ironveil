import type {Observation} from '../shared/sim/match';
export interface CombatHUD {weapon:string;confirmation:string;damageSectors:number[]}
export const SECTORS=['E','SE','S','SW','W','NW','N','NE'] as const;
export function combatHUD(o:Observation):CombatHUD{
 const me=o.allies[0],seconds=(me.remainingTicks/30).toFixed(1);
 const weapon=me.weapon==='charging'?(me.charge>=1?`RELEASE · VENT IN ${seconds}s`:`CHARGING ${Math.round(me.charge*100)}%`):me.weapon==='ready'?'CANNON READY':`${me.weapon.toUpperCase()} ${seconds}s`;
 const cues=o.feedback.filter(c=>c.expires>o.tick);
 const confirmation=cues.some(c=>c.kind==='kill')?'ENEMY DESTROYED':cues.some(c=>c.kind==='hit')?'HIT CONFIRMED':'';
 const damageSectors=[...new Set(cues.filter(c=>c.kind==='damage'&&c.sector!==undefined).map(c=>c.sector!))];
 return{weapon,confirmation,damageSectors};
}
