import { trainingMap, validateMap } from '../shared/content';
import { SOLO_LAYOUT } from '../shared/content/solo-layout';
import { findPath } from '../shared/sim/navigation';
validateMap(trainingMap);
const ids=new Set<string>();
for(const site of SOLO_LAYOUT.sites){if(ids.has(site.id))throw new Error('Duplicate relay ID');ids.add(site.id);}
for(const team of SOLO_LAYOUT.spawns)for(const spawn of team)for(const site of SOLO_LAYOUT.sites){if(findPath(trainingMap,spawn,site).length===0)throw new Error(`Unreachable relay ${site.id} from spawn ${spawn.x},${spawn.y}`);}
console.log(`Valid map and solo routes: ${trainingMap.id}`);
