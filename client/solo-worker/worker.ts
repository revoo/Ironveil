import { CombatSandbox, type WeaponAction } from '../../shared/sim/combat';
import { Simulation, driveTank, neutralInput, type DriveInput } from '../../shared/sim';
import { trainingMap, TUNING } from '../../shared/content';
import type { WorkerRequest, WorkerResponse } from '../../shared/protocol';
const sim = new Simulation();
const tank = { ...sim.tank };
const combat = new CombatSandbox();
let actions: WeaponAction[] = [];
let freshAt = performance.now();
let input = neutralInput();
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  if (request?.type === 'weapon' && ['press', 'release', 'cancel'].includes(request.action)) { if (actions.length < 16) actions.push(request.action);
  } else if (request?.type === 'neutralize') { input = neutralInput(); actions = []; combat.cancel();
  } else if (request?.type === 'input') {
    freshAt = performance.now();
    const v = request.input;
    if (v && [v.x, v.y, v.aim].every(Number.isFinite) && typeof v.silent === 'boolean') input = { x: Math.max(-1, Math.min(1, v.x)), y: Math.max(-1, Math.min(1, v.y)), aim: v.aim, silent: v.silent } satisfies DriveInput;
  } else if (request?.type === 'advance' && Number.isInteger(request.ticks) && request.ticks >= 0 && request.ticks <= 300) {
    for (let i = 0; i < request.ticks; i++) sim.step();
    const response: WorkerResponse = { type: 'advanced', tick: sim.tick, elapsedSeconds: sim.elapsedSeconds };
    self.postMessage(response);
  } else if (request?.type === 'start') {
    // Start once. Background tabs are neutralized by the client.
    if (!started) { started = true; setInterval(() => { if (performance.now() - freshAt > 500) { input = neutralInput(); actions = []; combat.cancel(); } driveTank(tank, input, trainingMap, combat.mobility); combat.step(tank, trainingMap, actions); actions = []; sim.step(); self.postMessage({ type: 'state', tick: sim.tick, tank: { ...tank }, combat: combat.view() } satisfies WorkerResponse); }, 1000 / TUNING.tickRate); }
  } else self.postMessage({ type: 'error', message: 'Invalid worker request' } satisfies WorkerResponse);
};
let started = false;
