export interface RecoilPose{x:number;y:number;barrel:number}
class Spring{
 position=0;velocity=0;
 constructor(private omega:number,private damping:number,private limit:number){}
 impulse(amount:number):void{this.velocity=Math.max(-2600,Math.min(2600,this.velocity+amount));}
 step(t:number):void{
  if(t<=0)return;
  // Exact damped-oscillator evolution: stable through long frames, independent of render rate.
  const decay=this.damping*this.omega,w=this.omega*Math.sqrt(1-this.damping**2),a=this.position,b=(this.velocity+decay*a)/w,e=Math.exp(-decay*t),c=Math.cos(w*t),s=Math.sin(w*t);
  this.position=e*(a*c+b*s);this.velocity=e*((b*w-decay*a)*c+(-a*w-decay*b)*s);
  if(Math.abs(this.position)>this.limit){this.position=Math.sign(this.position)*this.limit;if(this.position*this.velocity>0)this.velocity=0;}
  if(Math.abs(this.position)<.0001&&Math.abs(this.velocity)<.001)this.reset();
 }
 reset():void{this.position=0;this.velocity=0;}
}
/** Cosmetic gun slide and world-space body response. Never changes a simulation tank or camera. */
export class RecoilRig{
 private barrel=new Spring(28,.72,16);private x=new Spring(18,.8,5);private y=new Spring(18,.8,5);
 kick(charge:number,angle:number):void{
  if(!Number.isFinite(charge)||!Number.isFinite(angle))return;
  const gain=.2+.8*Math.max(0,Math.min(1,charge))**1.4;
  this.barrel.impulse(650*gain);this.x.impulse(-Math.cos(angle)*120*gain);this.y.impulse(-Math.sin(angle)*120*gain);
 }
 step(seconds:number,suppressed=false):RecoilPose{
  if(suppressed)this.reset();
  const dt=Number.isFinite(seconds)?Math.max(0,seconds):0;this.barrel.step(dt);this.x.step(dt);this.y.step(dt);
  const scale=Math.min(1,5/Math.max(.0001,Math.hypot(this.x.position,this.y.position)));
  return{x:this.x.position*scale,y:this.y.position*scale,barrel:this.barrel.position};
 }
 reset():void{this.barrel.reset();this.x.reset();this.y.reset();}
}
