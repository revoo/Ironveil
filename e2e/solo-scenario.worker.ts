import {SoloMatch} from '../shared/sim/match';
import {relaySmallMap as trainingMap} from '../shared/content/relay-yard';
self.onmessage=()=>{const match=new SoloMatch(trainingMap,17);const history:unknown[]=[];for(let i=0;i<14400&&match.result===null;i++){match.step();if(i<300)history.push(match.actors.map(a=>[a.x,a.y,a.hull,a.turret,a.hp]));}self.postMessage({tick:match.tick,scores:match.scores,result:match.result,history});};
