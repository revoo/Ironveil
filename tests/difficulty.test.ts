import {expect,it} from 'vitest';
import {SKILL} from '../shared/content/difficulty';
import {SoloMatch} from '../shared/sim/match';import {trainingMap} from '../shared/content';
it('changes reactions, aim uncertainty and memory rather than tank statistics',()=>{
 expect(SKILL.easy.reactionTicks).toBeGreaterThan(SKILL.normal.reactionTicks);expect(SKILL.hard.reactionTicks).toBeLessThan(SKILL.normal.reactionTicks);
 expect(SKILL.easy.aimError).toBeGreaterThan(SKILL.hard.aimError);expect(SKILL.easy.memoryTicks).toBeLessThan(SKILL.hard.memoryTicks);
 const a=new SoloMatch(trainingMap,1,'easy'),b=new SoloMatch(trainingMap,1,'hard');expect(a.actors.map(a=>a.hp)).toEqual(b.actors.map(a=>a.hp));expect(a.view(0).difficulty).toBe('easy');expect(b.view(0).difficulty).toBe('hard');
});

it('hard reacts sooner than easy to the same authorized opponent',async()=>{
 const {botIntent,newBotState}=await import('../shared/sim/bot');const m=new SoloMatch(trainingMap);Object.assign(m.actors[1],{x:300,y:600,turret:0});Object.assign(m.actors[2],{x:500,y:600});
 const easy=newBotState(1),hard=newBotState(1);botIntent(m.view(0),1,trainingMap,easy,'easy');botIntent(m.view(0),1,trainingMap,hard,'hard');m.tick=5;botIntent(m.view(0),1,trainingMap,easy,'easy');botIntent(m.view(0),1,trainingMap,hard,'hard');expect(easy.actions).not.toContain('press');expect(hard.actions).toContain('press');
});
