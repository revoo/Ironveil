import type {Observation} from '../match';import type {GameMap} from '../../content';import type {Point} from '../navigation';import {tankSight} from '../perception';import {distance,walkable,rayClear} from './geometry';
export interface Contact extends Point{id:number;vx:number;vy:number;seen:number;confidence:number;visible:boolean;hypotheses:Point[]}
export interface Clue extends Point{key:string;expires:number;confidence:number}
export interface Memory{contacts:Contact[];clues:Clue[];seenEvidence:string[]}
export function newMemory():Memory{return{contacts:[],clues:[],seenEvidence:[]};}
/** All memory is derived from authorized snapshots. Hypotheses never query live hidden actors. */
export function updateMemory(o:Observation,id:number,map:GameMap,m:Memory,ttl:number):void{
 const self=o.allies.find(a=>a.id===id);if(!self)return;
 const previousVisible=new Set(m.contacts.filter(c=>c.visible).map(c=>c.id));for(const c of m.contacts)c.visible=false;
 for(const e of o.enemies){
  let c=m.contacts.find(c=>c.id===e.id);const dt=c?(o.tick-c.seen)/30:0;
  const observed=!!c&&previousVisible.has(c.id)&&dt>0&&dt<=1/3&&distance(c,e)<210*dt+8;
  const vx=observed?c!.vx*.5+(e.x-c!.x)/dt*.5:0,vy=observed?c!.vy*.5+(e.y-c!.y)/dt*.5:0;
  if(!c){c={id:e.id,x:e.x,y:e.y,vx:0,vy:0,seen:o.tick,confidence:1,visible:true,hypotheses:[]};m.contacts.push(c);}
  Object.assign(c,{x:e.x,y:e.y,vx,vy,seen:o.tick,visible:true,confidence:1,hypotheses:[]});
 }
 for(const s of o.sightings){
  const seen=s.expires-90,old=m.contacts.find(c=>c.id===s.id);if(o.tick-seen>ttl||old?.visible||(old&&old.seen>=seen))continue;
  if(old)Object.assign(old,{x:s.x,y:s.y,vx:0,vy:0,seen});
  else m.contacts.push({id:s.id,x:s.x,y:s.y,vx:0,vy:0,seen,visible:false,confidence:1,hypotheses:[]});
 }
 m.contacts=m.contacts.filter(c=>c.visible||o.tick-c.seen<=ttl).slice(-4);
 m.clues=m.clues.filter(c=>c.expires>o.tick&&!c.key.startsWith('contact:'));
 for(const c of m.contacts){
  if(c.visible)continue;
  const age=Math.max(0,o.tick-c.seen),radius=Math.min(180,age/30*180);c.confidence=Math.max(0,1-age/(ttl+1));
  const points=[{x:c.x,y:c.y},...Array.from({length:8},(_,i)=>({x:c.x+Math.cos(i*Math.PI/4)*radius,y:c.y+Math.sin(i*Math.PI/4)*radius}))];
  c.hypotheses=points.filter((p,i)=>walkable(map,p)&&rayClear(map,c,p)&&!points.slice(0,i).some(q=>distance(p,q)<8)&&!o.allies.some(a=>a.hp>0&&tankSight(map,o.smokes,a,{...p,revealUntil:0},o.tick)));
  c.hypotheses.forEach((p,i)=>m.clues.push({...p,key:`contact:${c.id}:${c.seen}:${i}`,expires:c.seen+ttl+1,confidence:c.confidence*.8}));
 }
 const remember=(key:string)=>{m.seenEvidence.push(key);m.seenEvidence=m.seenEvidence.slice(-128);};
 for(const t of o.tracks.filter(t=>t.stage<2&&distance(self,t)<280)){
  const key='track:'+t.id;if(m.seenEvidence.includes(key))continue;remember(key);
  for(const [i,sign] of [1,-1].entries()){
   const p={x:t.x+Math.cos(t.axis)*80*sign,y:t.y+Math.sin(t.axis)*80*sign};
   if(walkable(map,p)&&rayClear(map,t,p))m.clues.push({...p,key:key+(i?':other':''),expires:Math.min(t.expires,o.tick+75),confidence:.4-t.stage*.1});
  }
 }
 for(const s of o.sounds){
  const key='sound:'+s.id;if(m.seenEvidence.includes(key))continue;remember(key);
  for(let i=-1;i<=1;i++){const angle=s.sector*Math.PI/4+i*Math.PI/8,r=s.band==='near'?100:190,p={x:self.x+Math.cos(angle)*r,y:self.y+Math.sin(angle)*r};if(walkable(map,p))m.clues.push({...p,key:key+':'+i,expires:o.tick+45,confidence:.3});}
 }
 m.clues=m.clues.sort((a,b)=>b.confidence-a.confidence||a.key.localeCompare(b.key)).slice(0,24);
}
