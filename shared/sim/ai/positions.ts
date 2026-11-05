import type {ActorView,Observation} from '../match';import type {GameMap} from '../../content';import {findPath,type Point} from '../navigation';import {distance,walkable,rayClear,exits,angleDelta} from './geometry';
export type Role='engage'|'flank';export type Purpose='attack'|'retreat'|'relocate';
export interface Personality{aggression:number;caution:number;cooperation:number;side:number}
export interface TacticalPosition extends Point{score:number;path:Point[];cover:boolean;escape:number}
export function personality(seed:number):Personality{
 const archetype=((seed%3)+3)%3;seed=Math.imul(seed^(seed>>>16),0x7feb352d);seed=Math.imul(seed^(seed>>>15),0x846ca68b);seed^=seed>>>16;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/0xffffffff;};
 return{aggression:.3+archetype*.2+random()*.09,caution:.75-archetype*.17+random()*.08,cooperation:.55+random()*.4,side:random()<.5?-1:1};
}
/** Both bots derive complementary roles from the same authorized team facts. */
export function assignRole(o:Observation,id:number,target:Point):Role{
 const eligible=o.allies.filter(a=>a.hp>0&&distance(a,target)<550).sort((a,b)=>Number(a.hp<=35)-Number(b.hp<=35)||distance(a,target)-distance(b,target)||a.id-b.id);
 return eligible.length>1&&eligible[0].id!==id?'flank':'engage';
}
/** Up to 80 sampled positions, five path queries. No hidden danger field or runtime world access. */
export function choosePosition(map:GameMap,self:ActorView,target:Point,allies:ActorView[],role:Role,purpose:Purpose,traits:Personality,threats:Point[]=[target]):TacticalPosition|undefined{
 const partner=allies.filter(a=>a.id!==self.id&&a.hp>0).sort((a,b)=>distance(a,target)-distance(b,target))[0];
 const base=Math.atan2(self.y-target.y,self.x-target.x),desired=role==='flank'&&partner?Math.atan2(partner.y-target.y,partner.x-target.x)+traits.side*1.6:base;
 const points:Point[]=[];
 const center=purpose==='attack'?target:self;
 for(const r of purpose==='attack'?[160,224,288]:[96,160,224])for(let i=0;i<12;i++)points.push({x:center.x+Math.cos(i*Math.PI/6)*r,y:center.y+Math.sin(i*Math.PI/6)*r});
 for(const w of map.walls)for(const x of [w.x-40,w.x+w.width+40])for(const y of [w.y-40,w.y+w.height+40])if(distance({x,y},self)<480)points.push({x,y});
 const unique=new Set<string>(),ranked:TacticalPosition[]=[];
 for(const point of points.slice(0,80)){
  const p={x:(Math.floor(point.x/map.tileSize)+.5)*map.tileSize,y:(Math.floor(point.y/map.tileSize)+.5)*map.tileSize},key=p.x+','+p.y;
  if(unique.has(key)||!walkable(map,p)||distance(p,self)<45)continue;unique.add(key);
  const escape=exits(map,p);if(escape<2)continue;
  const cover=threats.every(t=>!rayClear(map,t,p)),clearShot=rayClear(map,target,p),range=distance(p,target),travel=distance(p,self)/320;
  if(purpose==='attack'&&(!clearShot||range>440||range<100))continue;
  const spacing=partner?Math.max(0,110-distance(partner,p))/60:0;
  let score=escape*.18-spacing*traits.cooperation;
  if(purpose==='attack')score+=3+Math.cos(angleDelta(Math.atan2(p.y-target.y,p.x-target.x),desired))*3-Math.abs(range-(190+80*traits.caution))/150-travel*.65;
  else score+=(cover?8*traits.caution+3:0)+range/220-travel*.8+(purpose==='relocate'?Math.abs(angleDelta(Math.atan2(p.y-target.y,p.x-target.x),base))*.8:0);
  ranked.push({...p,score,path:[],cover,escape});
 }
 ranked.sort((a,b)=>b.score-a.score||a.x-b.x||a.y-b.y);if(!ranked.length)return undefined;
 const risk=new Float32Array(map.terrain.length);
 for(let i=0;i<risk.length;i++){
  const p={x:(i%map.width+.5)*map.tileSize,y:(Math.floor(i/map.width)+.5)*map.tileSize};
  for(const threat of threats){const range=distance(p,threat);if(range<500&&rayClear(map,threat,p))risk[i]+=(1-range/700)*(purpose==='attack'?.35:1.6)*traits.caution;}
 }
 let best:TacticalPosition|undefined;
 for(const candidate of ranked.slice(0,5)){
  const cost=(p:Point)=>risk[Math.floor(p.y/map.tileSize)*map.width+Math.floor(p.x/map.tileSize)]??0;
  const path=findPath(map,self,candidate,cost);if(!path.length)continue;
  const routeRisk=path.reduce((sum,p)=>sum+cost(p),0);const score=candidate.score-path.length*.018-routeRisk*.025;
  if(!best||score>best.score)best={...candidate,path,score};
 }
 return best;
}
