import type { Observation, ActorView } from '../shared/sim/match';
import { audioData } from './audio';
import type { CombatEvent } from '../shared/sim/combat';
import { PoseBuffer } from './presentation';
import type { CombatView } from '../shared/sim/combat';
import Phaser from 'phaser';
import { Client } from 'colyseus.js';
import { currentHandshake, versionsMatch, type WorkerResponse } from '../shared/protocol';
import { trainingMap, validateMap } from '../shared/content';
import { neutralInput, speedCap, terrainAt, type Tank } from '../shared/sim';
import './style.css';
validateMap(trainingMap);
const rangeMode = new URLSearchParams(location.search).has('range');
let solo: Observation | undefined;
let soloActors: ActorView[] = [];
let lastSoloTick = -1, targetKey = '';
const matchStatus = document.querySelector<HTMLElement>('#match-status')!;
const pauseButton = document.querySelector<HTMLButtonElement>('#pause')!;
if(rangeMode) { document.querySelector<HTMLElement>('#return-solo')!.hidden=false; document.querySelector<HTMLElement>('#match-panel')!.hidden = true; document.querySelector('#mode-label')!.textContent='Cannon laboratory · range'; }
function pause(value:boolean):void { worker.postMessage({type:'neutralize'}); worker.postMessage({type:'pause',value}); gameScene?.clearKeys(); }
pauseButton.onclick=()=>pause(!solo?.paused);
const restart=()=>{worker.postMessage({type:'reset'});gameScene?.clearKeys();};
document.querySelector<HTMLButtonElement>('#restart')!.onclick=restart;
document.querySelector<HTMLButtonElement>('#play-again')!.onclick=restart;

const workerStatus = document.querySelector('#worker-status')!;
const driveStatus = document.querySelector<HTMLElement>('#drive-status')!;
const worker = new Worker(new URL('./solo-worker/worker.ts', import.meta.url), { type: 'module' });
let tankPoses = new PoseBuffer();
const targetPoses = new Map<number, PoseBuffer>();
let recoilUntil = 0, recoilStrength = 0, hitUntil = 0, hurtUntil = 0;
const shellPoses = new Map<number, PoseBuffer>();
let state: Tank | undefined;
let combat: CombatView | undefined;
let weaponSequence = 0;
function weapon(action: 'press'|'release'|'cancel'):void { worker.postMessage({type:'weapon', seq:++weaponSequence, action}); }
let gameScene: Playground | undefined;
worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
  let m = event.data;
  if(m.type === 'match') {
    solo=m.observation;
    const me=solo.allies.find(a=>a.id===0)!;
    if(solo.tick < lastSoloTick) { tankPoses=new PoseBuffer();targetPoses.clear();shellPoses.clear(); }
    lastSoloTick=solo.tick;
    soloActors=[...solo.allies.filter(a=>a.id!==0),...solo.enemies];
    const key=soloActors.map(a=>a.id).join(','); if(key!==targetKey){targetPoses.clear();targetKey=key;}
    matchStatus.dataset.tick=String(solo.tick); matchStatus.dataset.paused=String(solo.paused);matchStatus.dataset.allies=String(solo.allies.length);matchStatus.dataset.total='4';matchStatus.dataset.score=solo.scores.join(':');
    const result=solo.result===null?'':solo.result==='draw'?'DRAW':solo.result===0?'VICTORY':'DEFEAT';
    matchStatus.textContent=`${result || (solo.paused?'PAUSED':'RELAY CONTROL')} · Blue ${solo.scores[0]} — ${solo.scores[1]} Red · ${Math.ceil(solo.secondsLeft)}s ${solo.sudden?'SUDDEN DEATH':''} · ${solo.rotationIn<=10?'Next relay in '+Math.ceil(solo.rotationIn)+'s':''}`;
    pauseButton.textContent=solo.paused?'Resume':'Pause'; pauseButton.disabled=solo.result!==null;
    document.querySelector<HTMLElement>('#results')!.hidden=solo.result===null;
    document.querySelector('#result-title')!.textContent=result;document.querySelector('#result-summary')!.textContent=`Final score: Blue ${solo.scores[0]} — ${solo.scores[1]} Red. Kills create openings; holding the relay wins.`;
    m={type:'state',tick:solo.tick,tank:me,combat:{hp:me.hp,incomingFire:false,weapon:me.weapon,charge:me.charge,remainingTicks:me.remainingTicks,hits:0,shells:solo.shells,events:solo.events,targets:soloActors.map(a=>({...a,reset:a.respawn}))}};
  }
  if (m.type === 'advanced') { workerStatus.textContent = `Worker simulation: tick ${m.tick} (${m.elapsedSeconds.toFixed(2)} s)`; worker.postMessage({ type: 'start', mode:rangeMode?'range':'solo' }); }
  else if (m.type === 'state') { state = m.tank;
    if (m.combat.weapon === 'reloading' && combat?.weapon !== 'reloading') { recoilUntil = performance.now() + 160; recoilStrength = 3 + 7 * (combat?.charge ?? 0); }
    if (m.combat.hits > (combat?.hits ?? 0)) hitUntil = performance.now() + 180;
    if (m.combat.hp < (combat?.hp ?? 100)) hurtUntil = performance.now() + 200;
    combat = m.combat;
    driveStatus.dataset.hp = String(combat.hp); driveStatus.dataset.incoming = String(combat.incomingFire);
    const now = performance.now();
    tankPoses.push(m.tick, state, now);
    combat.targets.forEach((target, index) => { const poses = targetPoses.get(index) ?? new PoseBuffer(); poses.push(m.tick, {x:target.x,y:target.y,hull:soloActors[index]?.hull??0,turret:soloActors[index]?.turret??0}, now); targetPoses.set(index, poses); });
    const liveShells = new Set(combat.shells.map(shell => shell.id));
    for (const id of shellPoses.keys()) if (!liveShells.has(id)) shellPoses.delete(id);
    for (const shell of combat.shells) { const poses = shellPoses.get(shell.id) ?? new PoseBuffer(); poses.push(m.tick, { x: shell.x, y: shell.y, hull: shell.angle, turret: shell.angle }, now); shellPoses.set(shell.id, poses); }
     driveStatus.dataset.weapon = combat.weapon; driveStatus.dataset.hits = String(combat.hits); driveStatus.dataset.x = String(state.x); driveStatus.dataset.y = String(state.y); driveStatus.dataset.speed = String(state.speed); driveStatus.textContent = `Position ${Math.round(state.x)}, ${Math.round(state.y)} · speed ${Math.round(state.speed)} px/s`; }
  else workerStatus.textContent = `Worker error: ${m.message}`;
};
worker.onerror = () => { workerStatus.textContent = 'Worker failed to start. Reload to retry.'; };
worker.postMessage({ type: 'advance', ticks: 30 });
class Playground extends Phaser.Scene {
  private hull!: Phaser.GameObjects.Graphics;
  private turret!: Phaser.GameObjects.Graphics;
  private cursor!: Phaser.GameObjects.Graphics;
  private battle!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Text;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private mini!: Phaser.GameObjects.Graphics;
  private activeInput = true;
  clearKeys():void{this.input.keyboard?.resetKeys();}
  private lastEffect = 0;
  private effects: {event: CombatEvent; until:number}[] = [];
  preload():void { for(const kind of ['tap','full','impact','destruction','vent'] as const) this.load.audio(kind,audioData(kind)); }
  constructor() { super('playground'); }
  create(): void {
    gameScene = this;
    this.input.keyboard!.addKey('ESC').on('down',()=>{if(!rangeMode)pause(!solo?.paused);});
    this.input.keyboard!.addKey('M').on('down', () => { this.sound.mute = !this.sound.mute; });
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { if (p.rightButtonDown()) weapon('cancel'); });
    this.input.keyboard!.addKey('R').on('down', () => { if (this.activeInput) worker.postMessage({ type: 'reset' }); });
    this.input.keyboard!.addKey('T').on('down', () => { if (rangeMode && this.activeInput) worker.postMessage({ type: 'range-fire' }); });
    const fire = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    fire.on('down', (_key: Phaser.Input.Keyboard.Key, event: KeyboardEvent) => { if (this.activeInput && !event.repeat) weapon('press'); });
    fire.on('up', () => { if (this.activeInput) weapon('release'); });
    const colors = { grass: 0x263a30, road: 0x696453, mud: 0x594a37, brush: 0x40593a };
    const ground = this.add.graphics();
    trainingMap.terrain.forEach((tile, i) => {
      const x = (i % trainingMap.width) * trainingMap.tileSize, y = Math.floor(i / trainingMap.width) * trainingMap.tileSize;
      ground.fillStyle(colors[tile]).fillRect(x, y, 32, 32);
      ground.lineStyle(1, 0xffffff, 0.035).strokeRect(x, y, 32, 32);
    });
    for (const wall of trainingMap.walls) ground.fillStyle(0x879080).fillRect(wall.x, wall.y, wall.width, wall.height).lineStyle(2, 0xb5c3ac).strokeRect(wall.x, wall.y, wall.width, wall.height);
    this.hull = this.add.graphics(); this.turret = this.add.graphics(); this.cursor = this.add.graphics(); this.battle = this.add.graphics();
    this.mini=this.add.graphics().setScrollFactor(0);
    this.hud = this.add.text(18, 16, '', { fontFamily: 'monospace', fontSize: '14px', color: '#edf4df', backgroundColor: '#101b17cc', padding: { x: 8, y: 6 } }).setScrollFactor(0);
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,SHIFT') as Record<string, Phaser.Input.Keyboard.Key>;
    this.cameras.main.setBounds(0, 0, trainingMap.width * 32, trainingMap.height * 32).centerOn(160, 272);
  }
  neutralize(): void { this.activeInput = false; worker.postMessage({ type: 'neutralize' }); worker.postMessage({ type: 'input', input: { ...neutralInput(), aim: state?.turret ?? 0 } }); this.input.keyboard?.resetKeys(); }
  reactivate(): void { this.activeInput = true; }
  update(_time: number, delta: number): void {
    driveStatus.dataset.audioReady = String(!this.sound.locked); driveStatus.dataset.muted = String(this.sound.mute);
    if (!state) return;
    const rendered = tankPoses.sample(performance.now()) ?? state;
    const pointer = this.input.activePointer;
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const aim = Math.atan2(world.y - state.y, world.x - state.x);
    const x = Number(this.keys.D.isDown) - Number(this.keys.A.isDown), y = Number(this.keys.S.isDown) - Number(this.keys.W.isDown);
    worker.postMessage({ type: 'input', input: { x: this.activeInput ? x : 0, y: this.activeInput ? y : 0, aim, silent: this.activeInput && this.keys.SHIFT.isDown } });
    this.hull.clear().fillStyle(0x253322).fillRoundedRect(-24, -24, 48, 48, 5).fillStyle(0x9dad7c).fillRoundedRect(-24, -20, 48, 40, 5).lineStyle(2, 0xd5e0bc).strokeRoundedRect(-24, -20, 48, 40, 5);
    this.hull.setPosition(rendered.x, rendered.y).setRotation(rendered.hull);
    const recoil = Math.max(0, (recoilUntil - performance.now()) / 160) * recoilStrength;
    this.hull.setAlpha(combat?.hp === 0 ? 0.25 : 1); this.turret.setAlpha(combat?.hp === 0 ? 0.25 : 1);
    this.turret.clear().fillStyle(0xd0dcae).fillRoundedRect(-recoil, -4, 34, 8, 3).fillCircle(0, 0, 12).lineStyle(2, 0x273a2c).strokeCircle(0, 0, 12);
    this.turret.setPosition(rendered.x, rendered.y).setRotation(rendered.turret);
    this.cursor.clear().lineStyle(2, 0xffffff, 0.85).strokeCircle(world.x, world.y, 8).lineBetween(world.x - 13, world.y, world.x + 13, world.y).lineBetween(world.x, world.y - 13, world.x, world.y + 13);
    const leadX = Phaser.Math.Clamp(pointer.x - 480, -240, 240) / 3, leadY = Phaser.Math.Clamp(pointer.y - 270, -240, 240) / 3;
    const cam = this.cameras.main, blend = 1 - Math.exp(-Math.min(delta, 100) / 180);
    cam.centerOn(Phaser.Math.Linear(cam.midPoint.x, rendered.x + leadX, blend), Phaser.Math.Linear(cam.midPoint.y, rendered.y + leadY, blend));
    const now = performance.now();
    for(const event of combat?.events ?? []) {
      if(event.id <= this.lastEffect) continue;
      this.lastEffect = event.id;
      if(this.effects.length >= 64) this.effects.shift();
      this.effects.push({event,until:now+(event.kind === 'destruction' ? 450 : 220)});
      if(!this.sound.locked) this.sound.play(event.kind === 'shot' ? (event.charge >= 0.5 ? 'full' : 'tap') : event.kind, {volume:event.kind === 'shot' ? 0.25+0.15*event.charge : 0.15});
    }
    this.effects = this.effects.filter(effect=>effect.until > now);
    this.battle.clear();
    for(const effect of this.effects) {
      const event=effect.event, fade=Math.min(1,(effect.until-now)/220);
      const radius=event.kind === 'destruction' ? 22+(1-fade)*20 : 4+(1-fade)*(12+event.charge*10);
      this.battle.lineStyle(event.kind === 'destruction' ? 4 : 2,event.kind === 'vent' ? 0xa2b4ac : 0xffd99b,fade).strokeCircle(event.x,event.y,radius);
    }
    if(solo) {
      this.battle.lineStyle(3,0xe3d39a).strokeCircle(solo.zone.x,solo.zone.y,90);
      const mini=this.mini;mini.clear().fillStyle(0x101b17,0.9).fillRect(780,16,160,96).lineStyle(1,0x697566).strokeRect(780,16,160,96);
      for(const wall of trainingMap.walls)mini.fillStyle(0x879080).fillRect(780+wall.x/10,16+wall.y/10,wall.width/10,wall.height/10);
      mini.lineStyle(1,0xe3d39a).strokeCircle(780+solo.zone.x/10,16+solo.zone.y/10,9);
      for(const a of [...solo.allies,...solo.enemies])if(a.hp>0){mini.fillStyle(a.team===0?0x87c9e8:0xf49f89);const x=780+a.x/10,y=16+a.y/10;if(a.team===0)mini.fillCircle(x,y,a.id===0?3:2);else mini.fillTriangle(x,y-3,x-3,y+2,x+3,y+2);}
    }
    if (combat) {
      for (const [index, targetState] of combat.targets.entries()) {
        const target = { ...targetState, ...targetPoses.get(index)?.sample(performance.now()) };
        if (target.hp <= 0) continue;
        const actor=soloActors[index], pose=targetPoses.get(index)?.sample(now);
        const color=actor?.team===0?0x87c9e8:0xb87360;
        if(actor){const angle=pose?.hull??actor.hull,cos=Math.cos(angle),sin=Math.sin(angle);const corners=[[-24,-20],[24,-20],[24,20],[-24,20]].map(([x,y])=>({x:target.x+x*cos-y*sin,y:target.y+x*sin+y*cos}));this.battle.fillStyle(color).fillPoints(corners,true); const bearing=pose?.turret??actor.turret;this.battle.lineStyle(7,0xe5dfbf).lineBetween(target.x,target.y,target.x+Math.cos(bearing)*32,target.y+Math.sin(bearing)*32);if(actor.protection>0)this.battle.lineStyle(2,0xffffff).strokeCircle(target.x,target.y,29);if(actor.team===0)this.battle.lineStyle(2,0xffffff).lineBetween(target.x-5,target.y,target.x+5,target.y).lineBetween(target.x,target.y-5,target.x,target.y+5);else this.battle.lineStyle(2,0xffffff).strokeTriangle(target.x,target.y-6,target.x-6,target.y+4,target.x+6,target.y+4);}
        else this.battle.fillStyle(color).fillRoundedRect(target.x - 20, target.y - 24, 40, 48, 4).lineStyle(2, 0xffd9a8).strokeCircle(target.x, target.y, 12);
        this.battle.fillStyle(0x151c17).fillRect(target.x - 22, target.y - 34, 44, 5).fillStyle(0xf2bf78).fillRect(target.x - 22, target.y - 34, 44 * target.hp / 100, 5);
      }
      for (const shell of combat.shells) { const pose = shellPoses.get(shell.id)?.sample(performance.now()) ?? shell; this.battle.fillStyle(shell.hostile ? 0xff9177 : 0xffedab).fillCircle(pose.x, pose.y, 2 + shell.charge * 2); }
      if (performance.now() < hitUntil) this.battle.lineStyle(3,0xffffff).strokeCircle(world.x,world.y,16);
      if (performance.now() < hurtUntil) this.battle.lineStyle(4,0xff9177).strokeCircle(rendered.x,rendered.y,38);
      if (combat.incomingFire) this.battle.lineStyle(2,0xff9177).strokeCircle(420,272,16);
      if (performance.now() < recoilUntil - 100) this.battle.fillStyle(0xffedab).fillCircle(rendered.x + Math.cos(rendered.turret)*36,rendered.y+Math.sin(rendered.turret)*36,3+recoilStrength*0.4);
      if (combat.weapon === 'charging') this.battle.lineStyle(3, 0xffde84).strokeCircle(rendered.x, rendered.y, 28 + combat.charge * 6);
    }
    const quiet = this.keys.SHIFT.isDown && state.speed <= speedCap(trainingMap, state.x, state.y, true) + 0.1;
    if(solo){this.hud.setText(`WASD DRIVE · MOUSE AIM · SPACE FIRE · RMB CANCEL\nHP ${combat?.hp ?? 100} ${combat?.hp===0?'RESPAWN '+((solo.allies[0].respawn)/30).toFixed(1)+'s':''} · SHIFT QUIET · M SOUND · ESC PAUSE\n${combat?.weapon==='charging'&&combat.charge>=1?'FULL — RELEASE BEFORE VENT':combat?.weapon??'ready'} ${Math.round((combat?.charge??0)*100)}% · ${((combat?.remainingTicks??0)/30).toFixed(2)}s\nRELAY ${Math.round(Math.hypot(solo.zone.x-state.x,solo.zone.y-state.y))} px · STAND IN THE RING TO SCORE`);return;}
    this.hud.setText(`WASD  DRIVE     MOUSE  AIM     SHIFT  QUIET\nSpeed ${Math.round(state.speed)} px/s  ${quiet ? 'QUIET CAP ACTIVE' : ''}\nTerrain: ${terrainAt(trainingMap, state.x, state.y)}  |  Walls block movement\nSPACE HOLD/RELEASE FIRE · RMB CANCEL\nM SOUND ${this.sound.mute ? "OFF" : "ON"} · HP ${combat?.hp ?? 100} ${combat?.hp === 0 ? "DESTROYED — R TO RESET" : ""} · R RESET · T TRAINING FIRE ${combat?.incomingFire ? "ON" : "OFF"}\n${combat?.weapon === "charging" && combat.charge >= 1 ? "FULL — RELEASE BEFORE VENT" : combat?.weapon ?? "ready"} ${Math.round((combat?.charge ?? 0) * 100)}% · ${( (combat?.remainingTicks ?? 0) / 30).toFixed(2)}s · Hits ${combat?.hits ?? 0}`);
  }
}
new Phaser.Game({ type: Phaser.AUTO, parent: 'game', width: 960, height: 540, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: Playground, backgroundColor: '#263a30' });
window.addEventListener('blur', () => gameScene?.neutralize());
window.addEventListener('focus', () => gameScene?.reactivate());
document.addEventListener('visibilitychange', () => { if (document.hidden) { gameScene?.neutralize(); if(!rangeMode)pause(true); } else gameScene?.reactivate(); });
const serverStatus = document.querySelector('#server-status')!;
const endpoint = import.meta.env.VITE_SERVER_URL ?? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.hostname}:2567`;
if(!rangeMode)serverStatus.textContent='Solo runs entirely on this device.';
else new Client(endpoint).joinOrCreate('foundation', currentHandshake()).then(room => {
  room.onMessage('welcome', (message: unknown) => { serverStatus.textContent = versionsMatch(message) ? 'Development server connected · versions match' : 'Server version mismatch'; if (!versionsMatch(message)) void room.leave(); });
  room.onLeave(() => { serverStatus.textContent = 'Development server disconnected. Reload to reconnect.'; });
}).catch(() => { serverStatus.textContent = 'Development server unavailable or incompatible. Start it and reload.'; });
