import Phaser from 'phaser';
import {BattleFx,smokePuffs,shockwave,type FxOptions} from './fx';
import type {CombatEvent} from '../shared/sim/combat';
import type {Smoke} from '../shared/sim/perception';
export interface FxUnit{id:number;x:number;y:number;hull:number;turret:number;hp:number;speed:number;charge:number}
export interface FxFrame{seconds:number;paused:boolean;units:FxUnit[];smokes:Smoke[];shells:{x:number;y:number;charge:number}[];visible:(x:number,y:number)=>boolean;options:FxOptions}
/** Pooled sprites and small graphics batches; no dynamic texture allocation per frame. */
export class FxRenderer{
 readonly model=new BattleFx();
 private surfaceLights:Phaser.GameObjects.Light[]=[];private lightCount=0;private lightLimit=8;
 private images:Phaser.GameObjects.Image[]=[];private used=0;private trailClock=0;
 private shadows:Phaser.GameObjects.Graphics;private ground:Phaser.GameObjects.Graphics;private streaks:Phaser.GameObjects.Graphics;
 constructor(private scene:Phaser.Scene){
  if(scene.game.renderer.type===Phaser.WEBGL){scene.lights.enable().setAmbientColor(0xcbd5bd);for(let i=0;i<8;i++)this.surfaceLights.push(scene.lights.addLight(0,0,1,0xffbd72,0).setVisible(false));}
  this.textures();this.shadows=scene.add.graphics().setDepth(1.5);this.ground=scene.add.graphics().setDepth(3.1);this.streaks=scene.add.graphics().setDepth(5.6);
  scene.add.image(480,270,'fx-vignette').setDisplaySize(960,540).setScrollFactor(0).setDepth(6.1).setAlpha(.65);
 }
 private textures():void{
  const make=(key:string,size:number,draw:(c:CanvasRenderingContext2D)=>void)=>{if(this.scene.textures.exists(key))return;const texture=this.scene.textures.createCanvas(key,size,size)!;draw(texture.context);texture.refresh();};
  make('fx-glow',128,c=>{const g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,248,205,.9)');g.addColorStop(.15,'rgba(255,197,95,.55)');g.addColorStop(.5,'rgba(255,105,30,.15)');g.addColorStop(1,'rgba(255,65,10,0)');c.fillStyle=g;c.fillRect(0,0,128,128);});
  make('fx-fire',64,c=>{const g=c.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'#fff9d9');g.addColorStop(.15,'#ffe097');g.addColorStop(.4,'rgba(255,139,35,.9)');g.addColorStop(.7,'rgba(189,45,10,.35)');g.addColorStop(1,'rgba(95,15,0,0)');c.fillStyle=g;c.fillRect(0,0,64,64);});
  make('fx-smoke',128,c=>{const pixels=c.createImageData(128,128);for(let y=0;y<128;y++)for(let x=0;x<128;x++){const r=Math.hypot(x-64,y-64)/64,n=.78+.12*Math.sin(x*.18+Math.sin(y*.12)*3)+.1*Math.cos(y*.21+x*.09),i=(y*128+x)*4;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=255;pixels.data[i+3]=Math.round(255*Math.max(0,1-r*r)**1.7*n);}c.putImageData(pixels,0,0);});
  make('fx-vignette',256,c=>{const g=c.createRadialGradient(128,128,45,128,128,180);g.addColorStop(0,'rgba(4,13,14,0)');g.addColorStop(.7,'rgba(4,13,14,.12)');g.addColorStop(1,'rgba(4,13,14,.65)');c.fillStyle=g;c.fillRect(0,0,256,256);});
 }
 private image(key:string,x:number,y:number,width:number,height:number,alpha:number,depth:number,add=false,tint=0xffffff,rotation=0):void{
  if(this.used>=720)return;
  let image=this.images[this.used++];if(!image){image=this.scene.add.image(0,0,key);this.images.push(image);}
  image.setTexture(key).setVisible(true).setPosition(x,y).setDisplaySize(width,height).setAlpha(Math.max(0,Math.min(1,alpha))).setTint(tint).setRotation(rotation).setDepth(depth).setBlendMode(add?Phaser.BlendModes.ADD:Phaser.BlendModes.NORMAL);
 }
 private light(x:number,y:number,radius:number,intensity:number):void{const l=this.lightCount<this.lightLimit?this.surfaceLights[this.lightCount++]:undefined;if(l)l.setPosition(x,y).setRadius(radius).setIntensity(intensity).setVisible(true);}
 emit(event:CombatEvent):void{this.model.emit(event);}
 reset():void{this.model.reset();this.surfaceLights.forEach(l=>l.setVisible(false));this.trailClock=0;this.images.forEach(i=>i.setVisible(false));this.shadows.clear();this.ground.clear();this.streaks.clear();}
 render(frame:FxFrame):{particles:number;lights:number;wrecks:number;smokes:number}{
  const {options,visible}=frame;this.model.configure(options);this.model.step(frame.seconds,frame.paused);const t=this.model.time;this.used=0;this.lightCount=0;this.lightLimit=options.lowEffects?4:8;this.surfaceLights.forEach(l=>l.setVisible(false));this.shadows.clear();this.ground.clear();this.streaks.clear();
  // Reserve actual surface lights for short flashes before ongoing wreck/charge lighting.
  for(const l of this.model.lights)if(visible(l.x,l.y))this.light(l.x,l.y,l.radius*1.5,(1-l.age/l.life)**2*2.8);
  this.trailClock+=frame.paused?0:frame.seconds;const exhaust=this.trailClock>=.12;if(exhaust)this.trailClock=0;
  for(const u of frame.units){
   if(u.hp<=0)continue;
   this.shadows.fillStyle(0x06100e,.25).fillEllipse(u.x+6,u.y+9,53,37).fillStyle(0x07110d,.22).fillEllipse(u.x+3,u.y+5,47,34);
   if(exhaust&&(u.speed>20||u.hp<40)){const d=u.hp<40?4:24;this.model.trail(u.x-Math.cos(u.hull)*d,u.y-Math.sin(u.hull)*d,u.hull,u.hp<40,u.id+Math.floor(t*40));}
   if(u.charge>0&&!options.reducedMotion){const x=u.x+Math.cos(u.turret)*34,y=u.y+Math.sin(u.turret)*34,r=20+u.charge*30;this.light(x,y,85,.35*u.charge);this.image('fx-glow',x,y,r*2,r*2,.12+u.charge*.22,5.5,true);this.image('fx-fire',x,y,4+u.charge*8,4+u.charge*8,.25+u.charge*.4,5.6,true);}
  }
  let wrecks=0,lights=0,particles=0;
  for(const w of this.model.wrecks){
   if(!visible(w.x,w.y))continue;wrecks++;const fade=Math.min(1,(w.life-w.age)/2),fire=Math.max(0,1-w.age/9),a=w.seed*2.399;
   this.ground.fillStyle(0x111714,.6*fade).fillEllipse(w.x,w.y,78,58).lineStyle(3,0x292a20,.7*fade).strokeEllipse(w.x,w.y,45,32);
   const points=[[-23,-13],[19,-14],[25,4],[15,16],[-22,12]].map(([x,y])=>({x:w.x+x*Math.cos(a)-y*Math.sin(a),y:w.y+x*Math.sin(a)+y*Math.cos(a)}));
   this.ground.fillStyle(0x242b26,fade).fillPoints(points,true).lineStyle(2,0x555545,fade).strokePoints(points,true).fillStyle(0x101a16,fade).fillCircle(w.x,w.y,12);
   if(!options.reducedMotion){const flicker=options.lowEffects?1:.88+.12*Math.sin(t*11+w.seed);this.image('fx-glow',w.x,w.y,150,130,.48*fire*flicker,5.5,true);lights++;this.light(w.x,w.y,160,1.5*fire*flicker);for(let i=0;i<3;i++){const pulse=options.lowEffects?1:.85+.15*Math.sin(t*13+i*3+w.seed);this.image('fx-fire',w.x+Math.cos(i*2.4+w.seed)*11,w.y+Math.sin(i*2.4+w.seed)*9-3,23*pulse,35*pulse,.85*fire,5.4,true,0xffffff,i*.4);}}
   else this.ground.fillStyle(0x9f6135,.6*fade).fillCircle(w.x,w.y,8);
  }
  for(const p of this.model.particles){
   if(!visible(p.ox,p.oy)||!visible(p.x,p.y))continue;particles++;const f=p.age/p.life,fade=Math.sin(Math.min(1,f*6)*Math.PI/2)*(1-f);
   if(p.kind==='spark'){this.streaks.lineStyle(Math.max(.6,p.size*(1-f)),0xffc479,fade).lineBetween(p.x-p.vx*.035,p.y-p.vy*.035,p.x,p.y);}
   else if(p.kind==='debris'){const r=p.spin+p.age*6,dx=Math.cos(r)*p.size,dy=Math.sin(r)*p.size;this.streaks.lineStyle(p.size,0x6b6950,1-f).lineBetween(p.x-dx,p.y-dy,p.x+dx,p.y+dy);}
   else {const smoke=p.kind==='smoke',size=p.size*(smoke?1+f*2:1+f*.4);this.image(smoke?'fx-smoke':'fx-fire',p.x,p.y,size*2,size*2,fade*(smoke ? .46 : .55),smoke?5.35:5.4,!smoke,smoke?0x687169:0xffffff,p.spin+p.age*.2);}
  }
  for(const l of this.model.lights){if(!visible(l.x,l.y))continue;lights++;const f=l.age/l.life,ring=shockwave(l);if(ring)this.streaks.lineStyle(1.5,0xe0caa0,ring.alpha).strokeCircle(l.x,l.y,ring.radius);this.image('fx-glow',l.x,l.y,l.radius*2,l.radius*1.7,(1-f)**2*.95,5.5,true);}
  // Clouds come only from authorized smoke observations; silhouettes are removed by the simulation.
  for(const cloud of frame.smokes){
   this.ground.fillStyle(0x16231e,.28).fillEllipse(cloud.x+5,cloud.y+8,198,186);
   const puffs=smokePuffs(cloud.id,t,options.reducedMotion);this.image('fx-smoke',cloud.x,cloud.y,200,200,.95,5.45,false,0x79887f);
   for(let i=0;i<puffs.length;i++){if(options.lowEffects&&i%2)continue;const p=puffs[i];this.image('fx-smoke',cloud.x+p.x,cloud.y+p.y,p.radius*2,p.radius*2,.7,5.45,false,i%3===0?0xc4cbb8:i%3===1?0x8d9b90:0x697d76,i*.5);}
   // Fine perimeter marks communicate the exact gameplay footprint without a solid disk edge.
   this.streaks.lineStyle(1,0xc4d0ba,.25);for(let i=0;i<24;i++){const a=i*Math.PI/12;this.streaks.lineBetween(cloud.x+Math.cos(a)*99,cloud.y+Math.sin(a)*99,cloud.x+Math.cos(a+.045)*99,cloud.y+Math.sin(a+.045)*99);}
  }
  if(!options.reducedMotion)for(const s of frame.shells){const r=12+s.charge*14;this.image('fx-glow',s.x,s.y,r*2,r*2,.45,5.55,true);}
  for(let i=this.used;i<this.images.length;i++)this.images[i].setVisible(false);
  return{particles,lights,wrecks,smokes:frame.smokes.length};
 }
}
