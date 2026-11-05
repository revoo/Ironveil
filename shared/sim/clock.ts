import {TUNING} from '../content';
const STEP_MS=1000/TUNING.tickRate;
/** Host scheduling only: fixed 30 Hz, bounded catch-up, no paused-time debt. */
export class FixedClock {
 private debt=0;
 constructor(private last=0){}
 advance(now:number,paused=false):number{
  const elapsed=Math.max(0,now-this.last);this.last=now;
  if(paused){this.debt=0;return 0;}
  this.debt+=elapsed;const available=Math.floor((this.debt+1e-7)/STEP_MS),steps=Math.min(4,available);
  this.debt=available>4?0:Math.max(0,this.debt-steps*STEP_MS);return steps;
 }
}
