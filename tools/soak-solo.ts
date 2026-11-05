import {performance} from 'node:perf_hooks';import {SoloMatch} from '../shared/sim/match';import {relaySmallMap} from '../shared/content/relay-yard';import type {Difficulty} from '../shared/content/difficulty';
const ticks=216000; // Two simulation hours per preset; this is not two hours of wall time.
for(const difficulty of ['easy','normal','hard'] as Difficulty[]){
 const times:number[]=[],start=performance.now();let restarts=0,maxTracks=0,maxShells=0,maxFeedback=0;const m=new SoloMatch(relaySmallMap,71,difficulty);
 for(let i=0;i<ticks;i++){
  if(m.result!==null){m.restart();restarts++;}
  const before=performance.now();m.step();times.push(performance.now()-before);
  maxTracks=Math.max(maxTracks,m.tracks.length);maxShells=Math.max(maxShells,m.shells.length);maxFeedback=Math.max(maxFeedback,m.view(0,0,false).feedback.length);
  if(m.tracks.length>640||m.shells.length>64||m.events.length>64||m.smokes.length>4)throw new Error('Unbounded world storage');
  for(const a of m.actors)if(![a.x,a.y,a.vx??0,a.vy??0,a.hp].every(Number.isFinite)||a.hp<0||a.hp>100||a.x<20||a.y<20||a.x>1580||a.y>940)throw new Error('Invalid actor state');
 }
 times.sort((a,b)=>a-b);const percentile=(p:number)=>Number(times[Math.floor((times.length-1)*p)].toFixed(3));console.log(JSON.stringify({difficulty,simulationHours:2,ticks,restarts,maxTracks,maxShells,maxFeedback,stepMs:{p50:percentile(.5),p95:percentile(.95),p99:percentile(.99)},wallMs:Math.round(performance.now()-start)}));
}
