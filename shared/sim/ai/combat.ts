import type {ActorView,Observation} from '../match';import type {GameMap} from '../../content';import type {Point} from '../navigation';import {walkable,rayClear,distance} from './geometry';
/** Constant-velocity interception from consecutive visible observations, with bounded extrapolation. */
export function interceptAim(self:Point,target:Point&{vx:number;vy:number},speed:number):number{
 const x=target.x-self.x,y=target.y-self.y,a=target.vx**2+target.vy**2-speed**2,b=2*(x*target.vx+y*target.vy),c=x*x+y*y;
 let t=Math.sqrt(c)/speed;
 if(Math.abs(a)>1e-8){const d=b*b-4*a*c;if(d>=0){const roots=[(-b-Math.sqrt(d))/(2*a),(-b+Math.sqrt(d))/(2*a)].filter(t=>t>0);if(roots.length)t=Math.min(...roots);}}
 t=Math.max(0,Math.min(.8,t));return Math.atan2(y+target.vy*t,x+target.vx*t);
}
export interface Attention{noticed:Record<number,number>;self?:Point&{tick:number;vx:number;vy:number}}
export function dodgeProjectile(o:Observation,self:ActorView,map:GameMap,attention:Attention,reaction:number):Point|undefined{
 const prior=attention.self,dt=prior?(o.tick-prior.tick)/30:0;
 let ownVX=0,ownVY=0;
 if(prior&&dt===0){ownVX=prior.vx;ownVY=prior.vy;}else if(prior&&dt>0&&dt<=.5&&distance(prior,self)<=220*dt+4){ownVX=(self.x-prior.x)/dt;ownVY=(self.y-prior.y)/dt;}
 attention.self={x:self.x,y:self.y,tick:o.tick,vx:ownVX,vy:ownVY};
 const hostile=o.shells.filter(s=>s.hostile&&distance(self,s)<500),ids=new Set(hostile.map(s=>s.id));
 for(const key of Object.keys(attention.noticed))if(!ids.has(Number(key)))delete attention.noticed[Number(key)];
 let best:{time:number;goal:Point}|undefined;
 for(const s of hostile.slice(0,32)){
  attention.noticed[s.id]??=o.tick;if(o.tick-attention.noticed[s.id]<reaction)continue;
  const vx=Math.cos(s.angle)*s.speed-ownVX,vy=Math.sin(s.angle)*s.speed-ownVY,dx=self.x-s.x,dy=self.y-s.y,t=(dx*vx+dy*vy)/(vx*vx+vy*vy);
  if(t<0||t>.65||Math.hypot(dx-vx*t,dy-vy*t)>32||!rayClear(map,s,self))continue;
  const options=[1,-1].map(sign=>({x:self.x-Math.sin(s.angle)*80*sign,y:self.y+Math.cos(s.angle)*80*sign})).filter(p=>walkable(map,p)&&rayClear(map,self,p));
  options.sort((a,b)=>distance(b,s)-distance(a,s));if(options.length&&(!best||t<best.time))best={time:t,goal:options[0]};
 }
 return best?.goal;
}
