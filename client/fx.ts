import type {CombatEvent} from '../shared/sim/combat';
export interface FxOptions{lowEffects?:boolean;reducedMotion?:boolean}
export interface Particle{x:number;y:number;ox:number;oy:number;vx:number;vy:number;age:number;life:number;size:number;kind:'smoke'|'fire'|'spark'|'debris';spin:number}
export interface Flash{kind:CombatEvent['kind'];x:number;y:number;radius:number;age:number;life:number}
export interface Wreck{x:number;y:number;age:number;life:number;seed:number}
/** Presentation-only state. Inputs must already have passed the observation boundary. */
export class BattleFx{
 particles:Particle[]=[];lights:Flash[]=[];wrecks:Wreck[]=[];
 time=0;private lastEvent=0;private emberClock=0;
 constructor(private options:FxOptions={}){}
 configure(options:FxOptions):void{this.options=options;if(options.reducedMotion){this.particles=[];this.lights=[];}this.trim();}
 private trim():void{this.particles=this.particles.slice(-(this.options.lowEffects?110:420));this.lights=this.lights.slice(-20);this.wrecks=this.wrecks.slice(-12);}
 private burst(x:number,y:number,count:number,seed:number,kind:Particle['kind'],angle?:number):void{
  if(this.options.reducedMotion)return;
  let state=seed>>>0;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  count=Math.ceil(count*(this.options.lowEffects ? .3 : 1));
  for(let i=0;i<count;i++){
   const direction=angle===undefined?random()*Math.PI*2:angle+(random()-.5)*1.2,speed=(kind==='spark'?100:kind==='debris'?65:kind==='fire'?28:18)*(0.3+random());
   this.particles.push({x,y,ox:x,oy:y,vx:Math.cos(direction)*speed,vy:Math.sin(direction)*speed,age:0,life:kind==='spark'?.18+random()*.4:kind==='fire'?.25+random()*.45:kind==='debris'?.6+random()*.6:1+random()*1.5,size:kind==='smoke'?8+random()*12:kind==='fire'?7+random()*9:1+random()*2,kind,spin:random()*Math.PI*2});
  }
 }
 emit(event:CombatEvent):void{
  if(event.id<=this.lastEvent)return;this.lastEvent=event.id;
  const {x,y,id,kind}=event,q=Math.max(0,Math.min(1,event.charge));
  if(kind==='destruction'){this.wrecks.push({x,y,age:0,life:9,seed:id});this.burst(x,y,30,id,'fire');this.burst(x,y,24,id+1,'smoke');this.burst(x,y,30,id+2,'spark');this.burst(x,y,12,id+3,'debris');}
  else if(kind==='shot'){this.burst(x,y,5+q*9,id,'fire',event.angle);this.burst(x,y,5+q*7,id+1,'smoke',event.angle);this.burst(x,y,4+q*10,id+2,'spark',event.angle);}
  else if(kind==='impact'){this.burst(x,y,15+q*12,id,'spark');this.burst(x,y,8,id+1,'smoke');this.burst(x,y,7,id+2,'debris');this.burst(x,y,4+q*5,id+3,'fire');}
  else this.burst(x,y,14,id,'smoke');
  if(kind!=='vent'&&!this.options.reducedMotion)this.lights.push({kind,x,y,age:0,life:kind==='destruction'?.65:kind==='shot'?.16:.24,radius:kind==='destruction'?160:kind==='shot'?55+q*65:65+q*35});
  this.trim();
 }
 trail(x:number,y:number,angle:number,damaged:boolean,seed:number):void{const start=this.particles.length;this.burst(x,y,damaged?2:1,seed,'smoke',angle+Math.PI);for(let i=start;i<this.particles.length;i++){this.particles[i].size*=damaged? .8 : .45;this.particles[i].life*=damaged?1:.5;}this.trim();}
 step(seconds:number,paused=false):void{
  if(paused||!Number.isFinite(seconds)||seconds<=0)return;
  this.time+=seconds;
  for(const p of this.particles){p.age+=seconds;const t=p.age,d=(1-Math.exp(-3*t))/3;p.x=p.ox+p.vx*d+(p.kind==='smoke'?t*7:0);p.y=p.oy+p.vy*d-(p.kind==='smoke'?t*12:p.kind==='fire'?t*9:0);}
  this.particles=this.particles.filter(p=>p.age<p.life);for(const l of this.lights)l.age+=seconds;this.lights=this.lights.filter(l=>l.age<l.life);for(const w of this.wrecks)w.age+=seconds;this.wrecks=this.wrecks.filter(w=>w.age<w.life);
  this.emberClock+=seconds;if(this.emberClock>=.09){this.emberClock=0;for(const w of this.wrecks){this.burst(w.x,w.y,3,w.seed+Math.floor(w.age*20),'fire');this.burst(w.x,w.y,2,w.seed+Math.floor(w.age*30),'smoke');if(w.age<4)this.burst(w.x,w.y,1,w.seed+Math.floor(w.age*40),'spark');}}
  this.trim();
 }
 reset():void{this.particles=[];this.lights=[];this.wrecks=[];this.lastEvent=0;this.time=0;this.emberClock=0;}
}
/** Decorative puffs never expand the 100px gameplay smoke footprint. */
export function smokePuffs(seed:number,time:number,reduced=false):{x:number;y:number;radius:number}[]{
 const t=reduced?0:time;
 return Array.from({length:15},(_,i)=>{const a=i*2.39996+seed*.71+t*.07,r=i===0?0:36+(i%3)*9,radius=i===0?51:28+5*Math.sin(i+seed+t*.55);return{x:Math.cos(a)*r,y:Math.sin(a)*r,radius};});
}

export function shockwave(flash:Flash):{radius:number;alpha:number}|undefined{if(flash.kind==='shot')return;const f=Math.max(0,Math.min(1,flash.age/flash.life));return{radius:5+flash.radius*.65*Math.sqrt(f),alpha:(1-f)**2*.35};}
