export const Fact={Contact:1,Ready:2,Angle:4,Charged:8,Safe:16,SmokeReady:32,Screened:64,Clue:128,AtGoal:256,Checked:512,Pressure:1024,Covered:2048} as const;
export interface ActionSpec{name:string;require:number;forbid?:number;add:number;remove?:number;cost:number}
/** Bounded uniform-cost search over symbolic facts. The executor must verify real completion. */
export function planActions(initial:number,goal:number,actions:ActionSpec[],budget=64):string[]{
 const open=[{facts:initial,cost:0,path:[] as string[]}],best=new Map<number,number>([[initial,0]]);
 for(let expanded=0;open.length&&expanded<budget;expanded++){
  open.sort((a,b)=>b.cost-a.cost);const node=open.pop()!;
  if((node.facts&goal)===goal)return node.path;
  if(node.path.length>=6)continue;
  for(const a of actions){
   if((node.facts&a.require)!==a.require||(node.facts&(a.forbid??0))!==0||!Number.isFinite(a.cost)||a.cost<0)continue;
   const facts=(node.facts&~(a.remove??0))|a.add,cost=node.cost+a.cost;
   if(facts===node.facts||cost>=(best.get(facts)??Infinity))continue;
   best.set(facts,cost);open.push({facts,cost,path:[...node.path,a.name]});
  }
 }
 return [];
}
export interface Choice{key:string;score:number}
export function chooseIntention(options:Choice[],current:{key:string;until:number}|undefined,tick:number,emergency=false):Choice{
 const ordered=[...options].sort((a,b)=>b.score-a.score||a.key.localeCompare(b.key)),best=ordered[0],old=ordered.find(o=>o.key===current?.key);
 if(!emergency&&old&&current!.until>tick&&best.score-old.score<.25)return old;
 return best;
}
