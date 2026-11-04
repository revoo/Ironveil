import Phaser from 'phaser';
import { Client } from 'colyseus.js';
import { currentHandshake, versionsMatch, type WorkerResponse } from '../shared/protocol';
import { trainingMap, validateMap } from '../shared/content';
import { neutralInput, speedCap, terrainAt, type Tank } from '../shared/sim';
import './style.css';
validateMap(trainingMap);
const workerStatus = document.querySelector('#worker-status')!;
const driveStatus = document.querySelector<HTMLElement>('#drive-status')!;
const worker = new Worker(new URL('./solo-worker/worker.ts', import.meta.url), { type: 'module' });
let state: Tank | undefined;
let gameScene: Playground | undefined;
worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
  const m = event.data;
  if (m.type === 'advanced') { workerStatus.textContent = `Worker simulation: tick ${m.tick} (${m.elapsedSeconds.toFixed(2)} s)`; worker.postMessage({ type: 'start' }); }
  else if (m.type === 'state') { state = m.tank; driveStatus.dataset.x = String(state.x); driveStatus.dataset.y = String(state.y); driveStatus.dataset.speed = String(state.speed); driveStatus.textContent = `Position ${Math.round(state.x)}, ${Math.round(state.y)} · speed ${Math.round(state.speed)} px/s`; }
  else workerStatus.textContent = `Worker error: ${m.message}`;
};
worker.onerror = () => { workerStatus.textContent = 'Worker failed to start. Reload to retry.'; };
worker.postMessage({ type: 'advance', ticks: 30 });
class Playground extends Phaser.Scene {
  private hull!: Phaser.GameObjects.Graphics;
  private turret!: Phaser.GameObjects.Graphics;
  private cursor!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Text;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private activeInput = true;
  constructor() { super('playground'); }
  create(): void {
    gameScene = this;
    const colors = { grass: 0x263a30, road: 0x696453, mud: 0x594a37, brush: 0x40593a };
    const ground = this.add.graphics();
    trainingMap.terrain.forEach((tile, i) => {
      const x = (i % trainingMap.width) * trainingMap.tileSize, y = Math.floor(i / trainingMap.width) * trainingMap.tileSize;
      ground.fillStyle(colors[tile]).fillRect(x, y, 32, 32);
      ground.lineStyle(1, 0xffffff, 0.035).strokeRect(x, y, 32, 32);
    });
    for (const wall of trainingMap.walls) ground.fillStyle(0x879080).fillRect(wall.x, wall.y, wall.width, wall.height).lineStyle(2, 0xb5c3ac).strokeRect(wall.x, wall.y, wall.width, wall.height);
    this.hull = this.add.graphics(); this.turret = this.add.graphics(); this.cursor = this.add.graphics();
    this.hud = this.add.text(18, 16, '', { fontFamily: 'monospace', fontSize: '14px', color: '#edf4df', backgroundColor: '#101b17cc', padding: { x: 8, y: 6 } }).setScrollFactor(0);
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,SHIFT') as Record<string, Phaser.Input.Keyboard.Key>;
    this.cameras.main.setBounds(0, 0, trainingMap.width * 32, trainingMap.height * 32).centerOn(160, 272);
  }
  neutralize(): void { this.activeInput = false; worker.postMessage({ type: 'input', input: { ...neutralInput(), aim: state?.turret ?? 0 } }); this.input.keyboard?.resetKeys(); }
  reactivate(): void { this.activeInput = true; }
  update(_time: number, delta: number): void {
    if (!state) return;
    const pointer = this.input.activePointer;
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const aim = Math.atan2(world.y - state.y, world.x - state.x);
    const x = Number(this.keys.D.isDown) - Number(this.keys.A.isDown), y = Number(this.keys.S.isDown) - Number(this.keys.W.isDown);
    worker.postMessage({ type: 'input', input: { x: this.activeInput ? x : 0, y: this.activeInput ? y : 0, aim, silent: this.activeInput && this.keys.SHIFT.isDown } });
    this.hull.clear().fillStyle(0x253322).fillRoundedRect(-24, -24, 48, 48, 5).fillStyle(0x9dad7c).fillRoundedRect(-24, -20, 48, 40, 5).lineStyle(2, 0xd5e0bc).strokeRoundedRect(-24, -20, 48, 40, 5);
    this.hull.setPosition(state.x, state.y).setRotation(state.hull);
    this.turret.clear().fillStyle(0xd0dcae).fillRoundedRect(0, -4, 34, 8, 3).fillCircle(0, 0, 12).lineStyle(2, 0x273a2c).strokeCircle(0, 0, 12);
    this.turret.setPosition(state.x, state.y).setRotation(state.turret);
    this.cursor.clear().lineStyle(2, 0xffffff, 0.85).strokeCircle(world.x, world.y, 8).lineBetween(world.x - 13, world.y, world.x + 13, world.y).lineBetween(world.x, world.y - 13, world.x, world.y + 13);
    const leadX = Phaser.Math.Clamp(pointer.x - 480, -240, 240) / 3, leadY = Phaser.Math.Clamp(pointer.y - 270, -240, 240) / 3;
    const cam = this.cameras.main, blend = 1 - Math.exp(-Math.min(delta, 100) / 180);
    cam.centerOn(Phaser.Math.Linear(cam.midPoint.x, state.x + leadX, blend), Phaser.Math.Linear(cam.midPoint.y, state.y + leadY, blend));
    const quiet = this.keys.SHIFT.isDown && state.speed <= speedCap(trainingMap, state.x, state.y, true) + 0.1;
    this.hud.setText(`WASD  DRIVE     MOUSE  AIM     SHIFT  QUIET\nSpeed ${Math.round(state.speed)} px/s  ${quiet ? 'QUIET CAP ACTIVE' : ''}\nTerrain: ${terrainAt(trainingMap, state.x, state.y)}  |  Walls block movement`);
  }
}
new Phaser.Game({ type: Phaser.AUTO, parent: 'game', width: 960, height: 540, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: Playground, backgroundColor: '#263a30' });
window.addEventListener('blur', () => gameScene?.neutralize());
window.addEventListener('focus', () => gameScene?.reactivate());
document.addEventListener('visibilitychange', () => { if (document.hidden) gameScene?.neutralize(); else gameScene?.reactivate(); });
const serverStatus = document.querySelector('#server-status')!;
const endpoint = import.meta.env.VITE_SERVER_URL ?? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.hostname}:2567`;
new Client(endpoint).joinOrCreate('foundation', currentHandshake()).then(room => {
  room.onMessage('welcome', (message: unknown) => { serverStatus.textContent = versionsMatch(message) ? 'Development server connected · versions match' : 'Server version mismatch'; if (!versionsMatch(message)) void room.leave(); });
  room.onLeave(() => { serverStatus.textContent = 'Development server disconnected. Reload to reconnect.'; });
}).catch(() => { serverStatus.textContent = 'Development server unavailable or incompatible. Start it and reload.'; });
