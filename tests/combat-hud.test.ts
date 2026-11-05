import {expect,it} from 'vitest';
import {combatHUD} from '../client/combat-hud';
import {SoloMatch} from '../shared/sim/match';
import {trainingMap} from '../shared/content';
it('distinguishes charging, full-charge vent danger and reload recovery',()=>{
 const o=new SoloMatch(trainingMap).view(0),me=o.allies[0];me.weapon='charging';me.charge=.5;me.remainingTicks=67;
 expect(combatHUD(o).weapon).toContain('CHARGING 50%');me.charge=1;me.remainingTicks=30;expect(combatHUD(o).weapon).toContain('RELEASE · VENT IN 1.0s');
 me.weapon='reloading';me.charge=0;me.remainingTicks=15;expect(combatHUD(o).weapon).toContain('RELOADING 0.5s');
});
it('uses only unexpired confirmed cues and keeps incoming directions separate from outgoing confirmations',()=>{
 const o=new SoloMatch(trainingMap).view(0);o.tick=10;o.feedback=[{id:1,kind:'hit',expires:30},{id:2,kind:'damage',sector:4,expires:30},{id:3,kind:'damage',sector:4,expires:30}];
 expect(combatHUD(o)).toMatchObject({confirmation:'HIT CONFIRMED',damageSectors:[4]});o.feedback.push({id:4,kind:'kill',expires:30});expect(combatHUD(o).confirmation).toBe('ENEMY DESTROYED');
 o.tick=30;expect(combatHUD(o)).toMatchObject({confirmation:'',damageSectors:[]});
});
