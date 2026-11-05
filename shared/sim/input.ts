import type { WeaponAction } from './combat';
export class WeaponInbox {
 private lastSequence = 0;
 private actions: WeaponAction[]=[];
 push(seq:number, action:WeaponAction):boolean { if (!Number.isSafeInteger(seq) || seq <= this.lastSequence || !['press','release','cancel'].includes(action)) return false; this.lastSequence = seq; if (this.actions.length >= 16) { this.actions = ['cancel']; return false; } this.actions.push(action); return true; }
 drain():WeaponAction[] { const result=this.actions; this.actions=[]; return result; }
 clear():void { this.actions=[]; }
}
