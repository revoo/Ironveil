import type Phaser from 'phaser';
import type {GameMap} from '../shared/content';
export interface Dressing {kind:'pine'|'grass'|'stone';x:number;y:number;radius:number;variant:number}
/** Static map-only decoration: no actor state or tactical evidence enters this plan. */
export function buildDressing(map:GameMap):Dressing[]{
 const result:Dressing[]=[];
 map.terrain.forEach((terrain,i)=>{
  const x=(i%map.width+.5)*map.tileSize,y=(Math.floor(i/map.width)+.5)*map.tileSize;
  if(map.walls.some(w=>x>w.x&&x<w.x+w.width&&y>w.y&&y<w.y+w.height))return;
  const hash=Math.imul(i+17,2654435761)>>>0;
  if(terrain==='brush')result.push({kind:'pine',x,y,radius:15,variant:hash%3});
  else if(terrain==='grass'&&hash%3===0)result.push({kind:'grass',x,y,radius:8,variant:hash%3});
  else if(terrain==='road'&&hash%7===0)result.push({kind:'stone',x,y,radius:3,variant:hash%3});
 });
 return result;
}
export const TERRAIN_COLORS={grass:0x304537,road:0x807560,mud:0x70533c,brush:0x385b3a};
/** Bake static art once; foliage stays below units and inside brush tiles. */
export function createBattlefield(scene:Phaser.Scene,map:GameMap):void{
 const g=scene.add.graphics();
 map.terrain.forEach((terrain,i)=>{
  const x=i%map.width*map.tileSize,y=Math.floor(i/map.width)*map.tileSize,h=Math.imul(i+1,1103515245)>>>0;
  g.fillStyle(TERRAIN_COLORS[terrain]).fillRect(x,y,map.tileSize,map.tileSize);
  g.fillStyle(terrain==='mud'?0x986b46:terrain==='road'?0xada080:0x819063,.14);
  for(let j=0;j<4;j++)g.fillEllipse(x+((h>>>(j*5))%26)+3,y+((h>>>(j*3+2))%26)+3,terrain==='mud'?9:3,2);
  if(terrain==='brush')g.fillStyle(0x152e23,.25).fillCircle(x+16,y+16,15);
 });
 for(const p of buildDressing(map)){
  if(p.kind==='grass'){
   g.lineStyle(1,0x92a16c,.36).lineBetween(p.x-4,p.y+4,p.x-6,p.y-3).lineBetween(p.x,p.y+4,p.x+1,p.y-5).lineBetween(p.x+3,p.y+3,p.x+6,p.y-1);
  }else if(p.kind==='stone')g.fillStyle(0x534e40,.5).fillEllipse(p.x,p.y,5,3);
  else{
   // Top-down foliage rosettes, contained in the authored brush footprint.
   const shades=[0x4b7040,0x527949,0x456d43],rotation=p.variant*.37;
   const crown=(outer:number,inner:number)=>Array.from({length:12},(_,i)=>{const angle=i*Math.PI/6+rotation,r=i%2?inner:outer;return{x:p.x+Math.cos(angle)*r,y:p.y+Math.sin(angle)*r};});
   g.fillStyle(0x1b392a).fillPoints(crown(15,11),true);
   g.fillStyle(shades[p.variant]).fillPoints(crown(13,9),true);
   g.fillStyle(0x78955d,.55).fillCircle(p.x-3,p.y-4,5).fillCircle(p.x+5,p.y-2,4).fillCircle(p.x-4,p.y+4,4);
   g.fillStyle(0x304d30,.7).fillCircle(p.x+1,p.y+2,4);

  }
 }
 for(const w of map.walls){
  g.fillStyle(0x303d38).fillRect(w.x,w.y,w.width,w.height);
  g.fillStyle(0x747d70).fillRect(w.x+2,w.y+2,w.width-4,w.height-4);
  g.lineStyle(2,0xa3aa93).lineBetween(w.x+2,w.y+2,w.x+w.width-2,w.y+2).lineBetween(w.x+2,w.y+2,w.x+2,w.y+w.height-2);
  for(let y=w.y+12;y<w.y+w.height-4;y+=16)g.lineStyle(1,0x434e46,.7).lineBetween(w.x+5,y,w.x+w.width-5,y);
  g.lineStyle(2,0x242f29).strokeRect(w.x,w.y,w.width,w.height);
 }
 g.generateTexture('battlefield',map.width*map.tileSize,map.height*map.tileSize);g.destroy();scene.add.image(0,0,'battlefield').setOrigin(0);
}
export type TankSkin='player'|'ally'|'enemy';
export function createTankTextures(scene:Phaser.Scene):void{
 for(const skin of ['player','ally','enemy'] as const){
  const colors={player:[0xa6ba82,0xdbe7b6],ally:[0x70a9bd,0xc4e2df],enemy:[0xbb7657,0xf2c69b]}[skin];
  const g=scene.add.graphics();
  g.fillStyle(0x111e1b).fillRoundedRect(8,8,48,12,3).fillRoundedRect(8,44,48,12,3);
  for(let x=11;x<56;x+=7)g.lineStyle(2,0x536055).lineBetween(x,10,x,18).lineBetween(x,46,x,54);
  g.fillStyle(0x243a2d).fillRoundedRect(10,17,45,30,4);
  g.fillStyle(colors[0]).fillPoints([{x:11,y:19},{x:48,y:19},{x:56,y:25},{x:56,y:39},{x:48,y:45},{x:11,y:45}],true);
  g.lineStyle(2,colors[1],.75).lineBetween(15,21,47,21).lineBetween(53,26,53,38);
  g.fillStyle(0x344333).fillRect(15,24,10,16);for(let y=26;y<40;y+=4)g.lineStyle(1,0x879077).lineBetween(16,y,23,y);
  g.fillStyle(colors[1]).fillCircle(50,25,2).fillCircle(50,39,2);
  g.generateTexture('hull-'+skin,64,64);g.clear();
  g.fillStyle(0x18291e).fillRoundedRect(21,21,24,24,5).fillRect(34,28,34,10);
  g.fillStyle(colors[0]).fillRoundedRect(21,20,24,23,5).fillRect(37,28,30,7);
  g.fillStyle(colors[1]).fillRect(43,28,22,2).fillCircle(31,29,7);
  g.fillStyle(0x243c30).fillCircle(31,29,4).fillRect(65,27,5,9);
  g.lineStyle(2,0xf2efce);
  if(skin==='enemy')g.strokeTriangle(31,33,26,40,36,40);
  else if(skin==='ally')g.lineBetween(27,36,35,36).lineBetween(31,32,31,40);
  else g.strokeCircle(31,36,4);
  g.generateTexture('turret-'+skin,96,64);g.destroy();
 }
}
