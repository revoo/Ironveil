import {SoloMatch} from '../shared/sim/match';import {relaySmallMap} from '../shared/content/relay-yard';import type {BotState} from '../shared/sim/bot';import {performance} from 'node:perf_hooks';
// Headless inspection only. This data is never sent in observations or exposed by a web endpoint.
const count=Number(process.argv[2]??10),totals:Record<string,number>={},timings:number[]=[];let shots=0,vents=0,plans=0,maxIdle=0;
for(let seed=1;seed<=count;seed++){
 const m=new SoloMatch(relaySmallMap,seed),previousPlan=[-100,-100,-100,-100],last=m.actors.map(a=>({x:a.x,y:a.y})),idle=[0,0,0,0];
 for(let i=0;i<14400&&m.result===null;i++){
  const before=performance.now();m.step();timings.push(performance.now()-before);
  shots+=m.events.filter(e=>e.kind==='shot').length;vents+=m.events.filter(e=>e.kind==='vent').length;
  const states=(m as unknown as {botStates:BotState[]}).botStates;
  for(let id=1;id<4;id++){
   const s=states[id],a=m.actors[id];if(s.planned!==previousPlan[id]){previousPlan[id]=s.planned;plans++;totals['plan:'+s.plan.join('→')]=(totals['plan:'+s.plan.join('→')]??0)+1;}
   totals['role:'+s.role]=(totals['role:'+s.role]??0)+1;totals['mode:'+s.mode]=(totals['mode:'+s.mode]??0)+1;
   idle[id]=a.hp>0&&Math.hypot(a.x-last[id].x,a.y-last[id].y)<.1?idle[id]+1:0;maxIdle=Math.max(maxIdle,idle[id]);last[id]={x:a.x,y:a.y};
   if(s.memory.contacts.length>4||s.memory.clues.length>24||Object.keys(s.attention.noticed).length>32)throw new Error('Unbounded AI state');
  }
 }
}
timings.sort((a,b)=>a-b);console.log(JSON.stringify({matches:count,shots,vents,plans,maxIdleSeconds:maxIdle/30,p95Ms:timings[Math.floor(timings.length*.95)],p99Ms:timings[Math.floor(timings.length*.99)],totals},null,2));
