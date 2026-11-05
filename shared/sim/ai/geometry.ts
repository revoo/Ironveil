import type {GameMap} from '../../content';import type {Point} from '../navigation';import {segmentBox} from '../combat';
export const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
export const angleDelta=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function walkable(map:GameMap,p:Point,r=24):boolean{return p.x>=r&&p.y>=r&&p.x<=map.width*map.tileSize-r&&p.y<=map.height*map.tileSize-r&&!map.walls.some(w=>p.x>w.x-r&&p.x<w.x+w.width+r&&p.y>w.y-r&&p.y<w.y+w.height+r);}
export function rayClear(map:GameMap,a:Point,b:Point):boolean{return !map.walls.some(w=>segmentBox(a.x,a.y,b.x-a.x,b.y-a.y,w)!==undefined);}
export function exits(map:GameMap,p:Point):number{return [[32,0],[-32,0],[0,32],[0,-32]].filter(([x,y])=>walkable(map,{x:p.x+x,y:p.y+y})).length;}
