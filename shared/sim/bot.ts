import {SKILL,type Difficulty} from '../content/difficulty';
import type {Observation,ActorView} from './match';
import type {GameMap} from '../content';
import {neutralInput,type DriveInput} from './index';
import {findPath,type Point} from './navigation';
import type {WeaponAction} from './combat';
import {newMemory,updateMemory,type Memory,type Clue} from './ai/memory';
import {personality,assignRole,choosePosition,type Personality,type Role} from './ai/positions';
import {Fact as F,planActions,chooseIntention,type ActionSpec} from './ai/planner';
import {interceptAim,dodgeProjectile,type Attention} from './ai/combat';
import {distance,rayClear,angleDelta,walkable} from './ai/geometry';
import {groundSight} from './perception';
export interface BotState {
 seed:number;traits:Personality;memory:Memory;attention:Attention;
 drive:DriveInput;actions:WeaponAction[];smoke?:boolean;
 mode?:'navigate'|'attack'|'investigate'|'reposition';
 role:Role;roleUntil:number;roleTarget?:number;
 plan:string[];planIndex:number;intention?:{key:string;until:number};
 path:Point[];goal?:Point;planned:number;threatPoint?:Point;targetAtPlan?:Point;
 searchIndex?:number;searchUntil?:number;visitedEvidence:string[];
 investigateUntil?:number;investigateGoal?:Point;clueKey?:string;scanUntil?:number;
 targetId?:number;acquired?:number;aimBias:number;lastShot:number;retreatAgainAt:number;lastHP:number;
 lastPosition?:Point;progressAt:number;lastMoved:number;stuck:number;dodgeUntil:number;dodgeGoal?:Point;
}
export function newBotState(seed:number,identitySeed=seed):BotState{return{seed,traits:personality(identitySeed),memory:newMemory(),attention:{noticed:{}},drive:neutralInput(),actions:[],role:'engage',roleUntil:0,plan:[],planIndex:0,path:[],planned:-100,visitedEvidence:[],aimBias:0,lastShot:-100,retreatAgainAt:0,lastHP:100,progressAt:0,lastMoved:0,stuck:0,dodgeUntil:0};}
const random=(s:BotState)=>{s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/0xffffffff;};
function targetFor(o:Observation,self:ActorView,s:BotState):ActorView|undefined{
 const scored=o.enemies.map(e=>({e,score:1-distance(self,e)/900+(100-e.hp)/400+(e.weapon==='charging'?.08:0)})).sort((a,b)=>b.score-a.score||a.e.id-b.e.id);
 const current=scored.find(c=>c.e.id===s.targetId);return current&&scored[0].score-current.score<.18?current.e:scored[0]?.e;
}
function patrolGoal(o:Observation,self:ActorView,s:BotState):Point{
 s.searchIndex??=(s.seed+self.id)%o.searchAreas.length;
 let goal=o.searchAreas[s.searchIndex];
 if(distance(self,goal)<64||(s.searchUntil??0)<=o.tick){s.searchIndex=(s.searchIndex+1)%o.searchAreas.length;s.searchUntil=o.tick+600;goal=o.searchAreas[s.searchIndex];}
 return{...goal};
}
function makePlan(o:Observation,self:ActorView,enemy:ActorView|undefined,map:GameMap,s:BotState,key:string,clue:Clue|undefined):void{
 const threat=enemy??s.threatPoint;
 const kind=key.split(':')[0];let goal:Point=patrolGoal(o,self,s);s.path=[];
 if((kind==='attack'||kind==='flank'||kind==='relocate'||kind==='survive')&&threat){
  const p=choosePosition(map,self,threat,o.allies,s.role,kind==='survive'?'retreat':kind==='relocate'?'relocate':'attack',s.traits,o.enemies.length?o.enemies:[threat]);
  if(p){goal=p;s.path=p.path;}
 }else if(kind==='investigate'&&clue){goal={x:clue.x,y:clue.y};s.clueKey=clue.key;s.investigateUntil=clue.expires;s.investigateGoal=goal;}
 s.goal=goal;s.planned=o.tick;s.targetAtPlan=enemy?{x:enemy.x,y:enemy.y}:undefined;s.scanUntil=undefined;
 const range=enemy?distance(self,enemy):0,covered=enemy?!groundSight(map,o.smokes,enemy,self):true;
 let facts=(enemy||threat?F.Contact:0)|(self.weapon==='ready'||self.weapon==='charging'?F.Ready:0)|(self.smokeIn===0?F.SmokeReady:0)|(covered?F.Covered:0)|(o.smokes.some(c=>distance(self,c)<=100)?F.Screened:0);
 if(self.weapon==='charging'&&self.charge>=(enemy&&enemy.hp<=22?.05:range>280?.6:.15))facts=(facts|F.Charged)&~F.Ready;
 if(enemy&&rayClear(map,self,enemy)&&range<=440&&s.role==='engage')facts|=F.Angle;
 const actions:ActionSpec[]=[
  {name:'take-angle',require:F.Contact,add:F.Angle,remove:F.Covered,cost:distance(self,goal)/120+.2},
  {name:'charge',require:F.Ready|F.Angle,add:F.Charged,remove:F.Ready,cost:range>280?.65:1.1},
  {name:'charge-in-cover',require:F.Ready|F.Covered|F.Contact,add:F.Charged,remove:F.Ready,cost:.25+Math.max(0,s.path.length*map.tileSize-96)/120},
  {name:'fire',require:F.Charged|F.Angle,add:F.Pressure,remove:F.Charged,cost:.2},
  {name:'tap',require:F.Ready|F.Angle,add:F.Pressure,remove:F.Ready,cost:enemy&&enemy.hp<=22?.15:range<260?.65:1.7},
  {name:'reload',require:0,forbid:F.Ready|F.Charged,add:F.Ready,cost:self.remainingTicks/30+.1},
  {name:'move-cover',require:F.Contact,add:F.Safe,cost:distance(self,goal)/100+2},
  {name:'smoke',require:F.SmokeReady|F.Contact,add:F.Screened,remove:F.SmokeReady,cost:.4},
  {name:'withdraw',require:F.Screened,add:F.Safe,cost:distance(self,goal)/160+.3},
  {name:'relocate',require:0,add:F.AtGoal,cost:1},
  {name:'move-to-clue',require:0,add:F.AtGoal,cost:1},
  {name:'scan',require:F.AtGoal,add:F.Checked,cost:.3},
  {name:'patrol',require:0,add:F.AtGoal,cost:1}
 ];
 let available=actions,desired:number=F.Pressure;
 if(kind==='survive'){desired=F.Safe;available=actions.filter(a=>['move-cover','smoke','withdraw'].includes(a.name));}
 else if(kind==='relocate'){desired=F.AtGoal;available=actions.filter(a=>a.name==='relocate');}
 else if(kind==='investigate'){desired=F.Checked;available=actions.filter(a=>['move-to-clue','scan'].includes(a.name));}
 else if(kind==='search'){desired=F.AtGoal;available=actions.filter(a=>a.name==='patrol');}
 else available=actions.filter(a=>['take-angle','charge','charge-in-cover','fire','tap','reload'].includes(a.name));
 s.plan=planActions(facts,desired,available);s.planIndex=0;
 if(!s.path.length)s.path=findPath(map,self,goal);
}
/** Small executor: advance only after observations verify the action's real prerequisites/completion. */
function execute(o:Observation,self:ActorView,enemy:ActorView|undefined,map:GameMap,s:BotState,reaction:number,aim:number):void{
 let moving=false;
 const readyToShoot=!!enemy&&o.tick-(s.acquired??o.tick)>=reaction&&rayClear(map,self,enemy)&&Math.abs(angleDelta(aim,self.turret))<.13;
 const chargeTarget=enemy?(enemy.hp<=22?.05:distance(self,enemy)>280?.6:.15):.6;
 for(let i=0;i<3&&s.planIndex<s.plan.length;i++){
  const action=s.plan[s.planIndex],arrived=!!s.goal&&distance(self,s.goal)<40;
  if(action==='smoke'){s.smoke=self.smokeIn===0;s.planIndex++;continue;}
  if(['take-angle','move-cover','withdraw','relocate','patrol','move-to-clue'].includes(action)){
   const angleReady=action==='take-angle'&&enemy&&s.role==='engage'&&distance(self,enemy)<=440&&rayClear(map,self,enemy);
   if(arrived||angleReady){s.planIndex++;continue;}moving=true;break;
  }
  if(action==='scan'){
   s.scanUntil??=o.tick+15;
   if(o.tick>=s.scanUntil){if(s.clueKey)s.visitedEvidence.push(s.clueKey);s.visitedEvidence=s.visitedEvidence.slice(-64);s.planIndex++;continue;}
   break;
  }
  if(action==='reload'){if(self.weapon==='ready'||self.weapon==='charging'){s.planIndex++;continue;}break;}
  if(action==='charge'||action==='charge-in-cover'){
   if(self.weapon==='charging'&&self.charge>=chargeTarget){s.planIndex++;continue;}
   if(self.weapon==='ready'&&enemy&&o.tick-(s.acquired??o.tick)>=reaction&&(action==='charge-in-cover'||readyToShoot))s.actions.push('press');
   break;
  }
  if(action==='fire'||action==='tap'){
   if(action==='fire'&&self.weapon!=='charging'){s.planIndex=s.plan.length;break;}
   if(readyToShoot){
    if(self.weapon==='charging'){s.actions.push('release');s.lastShot=o.tick;s.planIndex++;}
    else if(self.weapon==='ready'){s.actions.push('press','release');s.lastShot=o.tick;s.planIndex++;}
   }
   break;
  }
 }
 if(moving&&enemy&&readyToShoot&&self.weapon==='ready'&&(enemy.hp<=22||distance(self,enemy)<150)){
  s.actions.push('press','release');s.lastShot=o.tick;
 }
 if(self.weapon==='charging'&&readyToShoot&&self.charge>=chargeTarget&&s.intention?.key!=='survive'&&!s.actions.includes('release')){s.actions.push('release');s.lastShot=o.tick;}
 if(self.weapon==='charging'&&(!enemy||s.smoke||(self.remainingTicks<6&&!readyToShoot)))s.actions=['cancel'];
 while(s.path.length&&distance(self,s.path[0])<18)s.path.shift();
 const waypoint=moving?s.path[0]:undefined;
 s.drive={x:waypoint?waypoint.x-self.x:0,y:waypoint?waypoint.y-self.y:0,aim,silent:s.mode==='investigate'&&!!s.goal&&distance(self,s.goal)<160};
}
/** Inputs are authorized observations and static geometry only; no full-world convenience closure. */
export function botIntent(o:Observation,id:number,map:GameMap,s:BotState,difficulty:Difficulty='normal'):void{
 const self=o.allies.find(a=>a.id===id),skill=SKILL[difficulty];s.actions=[];s.smoke=false;
 if(!self||self.hp<=0){s.drive=neutralInput();return;}
 updateMemory(o,id,map,s.memory,skill.memoryTicks);
 const enemy=targetFor(o,self,s),previousTarget=s.targetId;
 if(enemy){
  if(previousTarget!==enemy.id){s.acquired=o.tick;s.aimBias=random(s)-.5;}
  s.targetId=enemy.id;s.threatPoint={x:enemy.x,y:enemy.y};
  if(o.tick>=s.roleUntil||s.roleTarget!==enemy.id||(s.role==='flank'&&self.hp>35&&o.allies.some(a=>a.id!==id&&a.hp>0&&a.hp<=35))||!o.allies.some(a=>a.id!==id&&a.hp>0)){s.role=assignRole(o,id,enemy);s.roleUntil=o.tick+90;s.roleTarget=enemy.id;}
 }else{s.targetId=undefined;s.acquired=undefined;}
 s.aimBias=s.aimBias*.86+(random(s)-.5)*.04;
 const motion=enemy?s.memory.contacts.find(c=>c.id===enemy.id):undefined;
 let aim=enemy?interceptAim(self,{x:enemy.x,y:enemy.y,vx:motion?.vx??0,vy:motion?.vy??0},400+350*(distance(self,enemy)>280?.6:0))+s.aimBias*skill.aimError:self.turret;
 if(enemy){const projected={x:self.x+Math.cos(aim)*distance(self,enemy),y:self.y+Math.sin(aim)*distance(self,enemy)};if(!rayClear(map,self,projected))aim=Math.atan2(enemy.y-self.y,enemy.x-self.x)+s.aimBias*skill.aimError;}
 const dodge=dodgeProjectile(o,self,map,s.attention,skill.reactionTicks);
 if(dodge){s.dodgeGoal=dodge;s.dodgeUntil=o.tick+15;}
 const covered=enemy?!groundSight(map,o.smokes,enemy,self):false;
 const retreating=s.intention?.key==='survive'&&s.intention.until>o.tick&&s.planIndex<s.plan.length;
 const relocating=s.intention?.key==='relocate'&&s.intention.until>o.tick&&s.planIndex<s.plan.length;
 const clues=s.memory.clues.filter(c=>!s.visitedEvidence.includes(c.key)&&c.expires>o.tick).sort((a,b)=>(b.confidence-distance(self,b)/2000)-(a.confidence-distance(self,a)/2000));
 const freshDamage=self.hp<s.lastHP;s.lastHP=self.hp;
 const options=[{key:'search',score:.2}];
 if(enemy){options.push({key:s.role==='flank'?'flank':'attack',score:.7+s.traits.aggression*.2+(enemy.hp<=22?.25:0)});if(self.hp<=35&&!covered&&(o.tick>=s.retreatAgainAt||freshDamage))options.push({key:'survive',score:2+s.traits.caution});if(o.tick-s.lastShot<35)options.push({key:'relocate',score:.65+s.traits.caution*.7-s.traits.aggression*.15+(o.tick-s.lastMoved>90?.4:0)});}
 else for(const clue of clues.filter((c,i)=>i<4||s.intention?.key==='investigate:'+c.key))options.push({key:'investigate:'+clue.key,score:.5+clue.confidence*.3-distance(self,clue)/4000});
 if(retreating)options.push({key:'survive',score:2});if(relocating)options.push({key:'relocate',score:1.2});
 if(enemy&&o.tick-s.lastMoved>90)options.push({key:'relocate',score:1.8});
 const chosen=chooseIntention(options,s.intention,o.tick,!!dodge||previousTarget!==s.targetId),changed=chosen.key!==s.intention?.key;
 s.mode=chosen.key==='survive'||chosen.key==='relocate'?'reposition':chosen.key.startsWith('investigate')?'investigate':chosen.key==='search'?'navigate':'attack';
 const goalArrived=!!s.goal&&distance(self,s.goal)<40;
 if(changed||s.planIndex>=s.plan.length||previousTarget!==s.targetId||o.tick-s.planned>=90||(chosen.key==='search'&&goalArrived)){
  if(changed){s.intention={key:chosen.key,until:o.tick+45+Math.round(s.traits.cooperation*30)};if(chosen.key==='survive')s.retreatAgainAt=o.tick+120+Math.round(s.traits.caution*90);}
  makePlan(o,self,enemy,map,s,chosen.key,clues.find(c=>'investigate:'+c.key===chosen.key));
 }
 if(s.plan.slice(s.planIndex).some(a=>['take-angle','move-cover','withdraw','relocate','patrol','move-to-clue'].includes(a))&&!s.path.length&&s.goal&&distance(self,s.goal)>60){
  // Unreachable actions are invalidated rather than holding the bot at a bad goal forever.
  if(s.clueKey&&!s.visitedEvidence.includes(s.clueKey))s.visitedEvidence=[...s.visitedEvidence,s.clueKey].slice(-64);
  for(let i=0;i<o.searchAreas.length;i++){const goal=o.searchAreas[(i+(s.searchIndex??0))%o.searchAreas.length],path=findPath(map,self,goal);if(path.length){s.path=path;s.goal={...goal};s.plan=['patrol'];s.planIndex=0;s.mode='navigate';break;}}
 }
 execute(o,self,enemy,map,s,skill.reactionTicks,aim);
 if(s.scanUntil&&s.scanUntil>o.tick)s.drive.aim=self.turret+Math.sin((s.scanUntil-o.tick)/15*Math.PI)*.35;
 if(s.dodgeGoal&&s.dodgeUntil>o.tick&&walkable(map,s.dodgeGoal)&&rayClear(map,self,s.dodgeGoal)){
  s.mode='reposition';s.drive={x:s.dodgeGoal.x-self.x,y:s.dodgeGoal.y-self.y,aim,silent:false};if(self.weapon==='charging')s.actions=['cancel'];
 }
 if(o.tick-s.progressAt>=30){
  if(!s.lastPosition||distance(self,s.lastPosition)>8)s.lastMoved=o.tick;
  s.stuck=s.lastPosition&&Math.hypot(s.drive.x,s.drive.y)>0&&distance(self,s.lastPosition)<8?s.stuck+1:0;s.lastPosition={x:self.x,y:self.y};s.progressAt=o.tick;
  if(s.stuck>=2){s.searchIndex=((s.searchIndex??0)+1)%o.searchAreas.length;s.planIndex=s.plan.length;s.intention=undefined;s.planned=-100;s.stuck=0;}
 }
}
