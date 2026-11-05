import {FixedClock} from '../../shared/sim/clock';
import {configureLesson} from '../../shared/sim/tutorial';
import {relaySmallMap} from '../../shared/content/relay-yard';
import { SoloMatch } from '../../shared/sim/match';
import { WeaponInbox } from '../../shared/sim/input';
import { CombatSandbox } from '../../shared/sim/combat';
import { Simulation, driveTank, neutralInput, type DriveInput } from '../../shared/sim';
import { trainingMap, TUNING } from '../../shared/content';
import type { WorkerRequest, WorkerResponse } from '../../shared/protocol';
const sim = new Simulation();
const tank = { ...sim.tank };
const combat = new CombatSandbox();
const inbox = new WeaponInbox();
let freshAt = performance.now();
let input = neutralInput();
let match: SoloMatch | undefined;
let rangePaused=false;
let tutorial=false,lessonIndex=0;
let pendingSmoke=false,lastSmokeSeq=0;
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  if(request?.type==='lesson'&&tutorial&&match&&Number.isInteger(request.index)&&(request.index===0||request.index===lessonIndex+1)&&request.index<9){lessonIndex=request.index;configureLesson(match,lessonIndex);if(rangePaused)match.setPaused(true);input=neutralInput();inbox.clear();pendingSmoke=false;
  } else if(request?.type==='smoke'){if(Number.isSafeInteger(request.seq)&&request.seq>lastSmokeSeq){lastSmokeSeq=request.seq;if(match&&!match.paused)pendingSmoke=true;}
  } else if (request?.type === 'pause') { rangePaused=request.value;match?.setPaused(request.value); inbox.clear(); pendingSmoke=false;input=neutralInput();
  } else if (request?.type === 'reset') { if(match&&request.difficulty&&['easy','normal','hard'].includes(request.difficulty))match.difficulty=request.difficulty;match?.restart();if(tutorial&&match){lessonIndex=0;configureLesson(match,0);}rangePaused=false; combat.reset(); Object.assign(tank, sim.tank, {vx:0,vy:0}); input = neutralInput(); pendingSmoke=false;inbox.clear();
  } else if (request?.type === 'range-fire') { combat.incomingFire = !combat.incomingFire;
  } else if (request?.type === 'weapon' && ['press', 'release', 'cancel'].includes(request.action)) { inbox.push(request.seq, request.action);
  } else if (request?.type === 'neutralize') { input = neutralInput(); pendingSmoke=false;inbox.clear(); combat.cancel(); match?.neutralize();
  } else if (request?.type === 'input') {
    freshAt = performance.now();
    const v = request.input;
    if (v && [v.x, v.y, v.aim].every(Number.isFinite) && typeof v.silent === 'boolean') input = { x: Math.max(-1, Math.min(1, v.x)), y: Math.max(-1, Math.min(1, v.y)), aim: v.aim, silent: v.silent } satisfies DriveInput;
  } else if (request?.type === 'advance' && Number.isInteger(request.ticks) && request.ticks >= 0 && request.ticks <= 300) {
    for (let i = 0; i < request.ticks; i++) sim.step();
    const response: WorkerResponse = { type: 'advanced', tick: sim.tick, elapsedSeconds: sim.elapsedSeconds };
    self.postMessage(response);
  } else if (request?.type === 'start') {
    if (!started && request.mode !== 'range') {match = new SoloMatch(relaySmallMap,1,['easy','normal','hard'].includes(request.difficulty??'')?request.difficulty:'normal');tutorial=request.mode==='tutorial';if(tutorial)configureLesson(match,0);if(rangePaused)match.setPaused(true);}
    // The host adapter schedules ticks; all outcomes live in shared simulation.
    if (!started) {
      started=true;const clock=new FixedClock(performance.now());
      setInterval(()=>{const paused=match?.paused??rangePaused,steps=clock.advance(performance.now(),paused);if(paused)tickWorld();else for(let i=0;i<steps;i++)tickWorld();},1000/TUNING.tickRate);
    }
  } else self.postMessage({ type: 'error', message: 'Invalid worker request' } satisfies WorkerResponse);
};
let started = false;

function tickWorld():void{
 if(performance.now()-freshAt>500){input=neutralInput();pendingSmoke=false;inbox.clear();combat.cancel();match?.neutralize();}
 if(match){if(!match.paused)match.step(input,inbox.drain(),pendingSmoke);else inbox.clear();pendingSmoke=false;self.postMessage({type:'match',observation:match.view(0),tutorialStep:tutorial?lessonIndex:undefined} satisfies WorkerResponse);return;}
 if(!rangePaused){const oldTank={x:tank.x,y:tank.y};if(combat.hp>0)driveTank(tank,input,trainingMap,combat.mobility);else tank.speed=0;combat.step(tank,trainingMap,inbox.drain(),oldTank);inbox.clear();sim.step();}
 self.postMessage({type:'state',tick:sim.tick,tank:{...tank},combat:combat.view()} satisfies WorkerResponse);
}
