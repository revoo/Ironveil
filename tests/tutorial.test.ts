import {expect,it} from 'vitest';import {TutorialProgress} from '../client/tutorial';import {SoloMatch} from '../shared/sim/match';import {trainingMap} from '../shared/content';
it('does not advance merely from time passing, and teaches drive then deliberate aiming',()=>{
 const p=new TutorialProgress(),o=new SoloMatch(trainingMap).view(0);p.observe(o);o.tick+=300;expect(p.observe(o)).toBe(false);
 o.allies[0].x+=70;o.allies[0].hull=1;expect(p.observe(o)).toBe(true);expect(p.index).toBe(1);p.observe(o);o.allies[0].turret=1;expect(p.observe(o)).toBe(false);p.aimMoved();expect(p.observe(o)).toBe(true);
});
it('requires both cancellation and a charged shot in the cannon lesson',()=>{
 const p=new TutorialProgress();p.index=3;const o=new SoloMatch(trainingMap).view(0);o.events=[{id:1,kind:'shot',x:200,y:200,charge:1}];expect(p.observe(o)).toBe(false);o.events=[];o.allies[0].weapon='cancel recovery';p.observe(o);o.events=[{id:2,kind:'shot',x:200,y:200,charge:1}];o.enemies=[{...o.allies[0],id:2,team:1,hp:45}];expect(p.observe(o)).toBe(true);
});

it('requires evidence and real state facts for the remaining stealth/objective lessons',()=>{
 const o=new SoloMatch(trainingMap).view(0);const p=new TutorialProgress();p.index=4;expect(p.observe(o)).toBe(false);o.tracks=[{id:'stamp',x:200,y:200,axis:0,expires:360,stage:0}];expect(p.observe(o)).toBe(true);
 p.observe(o);Object.assign(o.allies[0],{x:360,y:220,speed:0});expect(p.observe(o)).toBe(true);
 p.observe(o);o.allies[0].x+=30;o.allies[0].quiet=true;expect(p.observe(o)).toBe(true);
 p.observe(o);o.allies[0].smokeIn=540;o.allies[0].x+=120;expect(p.observe(o)).toBe(true);
 expect(p.observe(o)).toBe(false);o.scores=[1,0];expect(p.observe(o)).toBe(true);expect(p.index).toBe(9);
});

it('tap training waits for confirmed target damage instead of advancing on a miss',()=>{const p=new TutorialProgress();p.index=2;const o=new SoloMatch(trainingMap).view(0);o.events=[{id:1,kind:'shot',x:200,y:200,charge:0}];expect(p.observe(o)).toBe(false);o.enemies=[{...o.allies[0],id:2,team:1,hp:78}];o.events=[];expect(p.observe(o)).toBe(true);});
