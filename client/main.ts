import {combatHUD,SECTORS} from './combat-hud';
import {createBattlefield,createTankTextures,TERRAIN_COLORS} from './art';
import {Controls,readSettings,saveSettings,keyLabel,type Settings} from './settings';
import {mountSettings} from './ui';
import {setupOffline} from './offline';
import {LESSONS,TutorialProgress} from './tutorial';
import {relaySmallMap} from '../shared/content/relay-yard';
import type { Observation, ActorView } from '../shared/sim/match';
import {audioData,musicWav,wavData} from './audio';
import type { CombatEvent } from '../shared/sim/combat';
import {PoseBuffer,EventInbox} from './presentation';
import type { CombatView } from '../shared/sim/combat';
import Phaser from 'phaser';
import { currentHandshake, versionsMatch, type WorkerResponse } from '../shared/protocol';
import { trainingMap as rangeMap, validateMap } from '../shared/content';
import { neutralInput, speedCap, terrainAt, type Tank } from '../shared/sim';
import './style.css';
let settings=readSettings();const controls=new Controls(settings.bindings);
const tutorialMode=new URLSearchParams(location.search).has('tutorial');if(tutorialMode)document.body.classList.add('training');let tutorialProgress=new TutorialProgress();
function showLesson():void{if(!tutorialMode)return;document.querySelector<HTMLElement>('#tutorial-panel')!.hidden=false;const lesson=LESSONS[tutorialProgress.index];document.querySelector('#lesson-title')!.textContent=lesson?`${tutorialProgress.index+1}/${LESSONS.length} · ${lesson[0]}`:'Training complete';document.querySelector('#lesson-text')!.textContent=lesson?.[1]??'You are ready for a solo match. Return to solo when ready.';}
const rangeMode = new URLSearchParams(location.search).has('range');
const trainingMap=rangeMode?rangeMap:relaySmallMap;validateMap(trainingMap);
let solo: Observation | undefined;
let soloActors: ActorView[] = [];
let lastSoloTick = -1, targetKey = '';
const matchStatus = document.querySelector<HTMLElement>('#match-status')!;
const pauseButton = document.querySelector<HTMLButtonElement>('#pause')!;
if(!rangeMode)document.querySelector('#mode-label')!.textContent='Relay Yard · team deathmatch · solo 2 vs 2';
if(rangeMode) { document.querySelector('#mode-label')!.after(document.querySelector('#fullscreen')!);document.querySelector('#mode-label')!.after(document.querySelector('#settings')!);document.querySelector<HTMLElement>('#return-solo')!.hidden=false; document.querySelector<HTMLElement>('#match-panel')!.hidden = true; document.querySelector('#mode-label')!.textContent='Cannon laboratory · range'; }
function pause(value:boolean):void { worker.postMessage({type:'neutralize'}); worker.postMessage({type:'pause',value}); gameScene?.clearKeys(); if(!value)document.querySelector<HTMLCanvasElement>('canvas')?.focus(); }
pauseButton.onclick=()=>pause(!solo?.paused);
const scoreboard=document.querySelector<HTMLElement>('#scoreboard')!;
const showScoreboard=(show:boolean)=>{scoreboard.hidden=!show;if(show&&solo)scoreboard.textContent=`Blue ${solo.scores[0]} — ${solo.scores[1]} Red · First to ${solo.killTarget} kills · ${Math.ceil(solo.secondsLeft)}s${solo.sudden?' · SUDDEN DEATH':''}\n${solo.allies.map(a=>(a.id===0?'You':'Wingman')+': '+(a.hp>0?'HP '+a.hp:'Respawn '+(a.respawn/30).toFixed(1)+'s')).join(' · ')}\nEnemy live status is concealed.`;};
document.querySelector<HTMLButtonElement>('#scoreboard-button')!.onclick=()=>showScoreboard(scoreboard.hidden);
document.querySelector<HTMLButtonElement>('#fullscreen')!.onclick=()=>{const field=document.querySelector<HTMLElement>('#game')!;if(document.fullscreenElement)void document.exitFullscreen();else void field.requestFullscreen?.().catch(()=>{workerStatus.textContent='Fullscreen unavailable in this browser.';});};
document.addEventListener('fullscreenchange',()=>gameScene?.scale.refresh());
const restart=()=>{showScoreboard(false);if(tutorialMode){tutorialProgress=new TutorialProgress();showLesson();}worker.postMessage({type:'reset',difficulty:settings.difficulty});gameScene?.clearKeys();document.querySelector<HTMLCanvasElement>('canvas')?.focus();};
document.querySelector<HTMLButtonElement>('#restart')!.onclick=restart;
document.querySelector<HTMLButtonElement>('#play-again')!.onclick=restart;document.querySelector<HTMLButtonElement>('#restart-tutorial')!.onclick=restart;showLesson();

const workerStatus = document.querySelector('#worker-status')!;
const driveStatus = document.querySelector<HTMLElement>('#drive-status')!;
const worker = new Worker(new URL('./solo-worker/worker.ts', import.meta.url), { type: 'module' });
const eventInbox=new EventInbox<CombatEvent>();
let tankPoses = new PoseBuffer();
const targetPoses = new Map<number, PoseBuffer>();
let recoilUntil = 0, recoilStrength = 0, hitUntil = 0, hurtUntil = 0;
const shellPoses = new Map<number, PoseBuffer>();
let state: Tank | undefined;
let combat: CombatView | undefined;
let weaponSequence = 0;
function weapon(action: 'press'|'release'|'cancel'):void { worker.postMessage({type:'weapon', seq:++weaponSequence, action}); }
let gameScene: Playground | undefined;
const settingsOpen=mountSettings(()=>settings,s=>{settings=s;controls.bindings=s.bindings;controls.clear();worker.postMessage({type:'neutralize'});document.documentElement.style.fontSize=16*s.textScale+'px';gameScene?.applySettings();},()=>pause(true),()=>{if(rangeMode)worker.postMessage({type:'pause',value:false});document.querySelector<HTMLCanvasElement>('canvas')?.focus();});
document.documentElement.style.fontSize=16*settings.textScale+'px';
function dispatch(action:string):void{
 if(action==='scoreboard'||action==='scoreboard-close'){showScoreboard(action==='scoreboard');return;}
 if(action==='press'||action==='release'||action==='cancel')weapon(action);
 else if(action==='smoke'&&!rangeMode)worker.postMessage({type:'smoke',seq:++weaponSequence});
 else if(action==='pause')document.querySelector<HTMLButtonElement>('#settings')!.click();
 else if(action==='restart')restart();
 else if(action==='mute'&&gameScene){settings.muted=!gameScene.sound.mute;gameScene.sound.mute=settings.muted;saveSettings(settings);}
}
window.addEventListener('keydown',event=>{if(event.code==='Tab'&&settings.bindings.scoreboard==='Tab'&&(event.target as HTMLElement)?.tagName!=='CANVAS')return;if(settingsOpen()||/^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/.test((event.target as HTMLElement)?.tagName??''))return;const actions=controls.down(event.code,event.repeat);if(Object.values(settings.bindings).includes(event.code))event.preventDefault();actions.forEach(dispatch);});
window.addEventListener('keyup',event=>{if(settingsOpen())return;controls.up(event.code).forEach(dispatch);});
let mouseClient:{x:number;y:number}|undefined;
window.addEventListener('pointermove',event=>{mouseClient={x:event.clientX,y:event.clientY};if(tutorialMode)tutorialProgress.aimMoved();});
let lastWorkerAt=performance.now();
let workerFailed=false;
const failWorker=()=>{if(workerFailed)return;workerFailed=true;controls.clear();worker.terminate?.();document.querySelector<HTMLElement>('#session-error')!.hidden=false;workerStatus.textContent='Local simulation unavailable. Reload to recover.';};
document.querySelector<HTMLButtonElement>('#reload-game')!.onclick=()=>location.reload();
setInterval(()=>{if(!document.hidden&&performance.now()-lastWorkerAt>4000)failWorker();},1000);

worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
  lastWorkerAt=performance.now();let m = event.data;
  if(m.type === 'match') {
    solo=m.observation;if(!scoreboard.hidden)showScoreboard(true);
    if(tutorialMode&&m.tutorialStep===tutorialProgress.index&&tutorialProgress.observe(solo)){showLesson();controls.clear();worker.postMessage({type:'neutralize'});gameScene?.clearKeys();if(tutorialProgress.index<LESSONS.length)worker.postMessage({type:'lesson',index:tutorialProgress.index});else pause(true);}

    const me=solo.allies.find(a=>a.id===0)!;
    const feedback=combatHUD(solo);
    const cueText=[feedback.confirmation,...feedback.damageSectors.map(s=>'INCOMING '+SECTORS[s])].filter(Boolean).join(' · '),cueLine=document.querySelector('#combat-feedback')!;
    if(cueLine.textContent!==cueText)cueLine.textContent=cueText;
    if(solo.tick < lastSoloTick) { eventInbox.clear();tankPoses=new PoseBuffer();targetPoses.clear();shellPoses.clear(); }
    lastSoloTick=solo.tick;
    soloActors=[...solo.allies.filter(a=>a.id!==0),...solo.enemies];
    const key=soloActors.map(a=>a.id).join(','); if(key!==targetKey){targetPoses.clear();targetKey=key;}
    matchStatus.dataset.difficulty=solo.difficulty;matchStatus.dataset.smokes=String(solo.smokes.length);matchStatus.dataset.smokeCooldown=String(me.smokeIn);matchStatus.dataset.tracks=String(solo.tracks.length);matchStatus.dataset.sightings=String(solo.sightings.length);
    matchStatus.dataset.tick=String(solo.tick); matchStatus.dataset.paused=String(solo.paused);matchStatus.dataset.allies=String(solo.allies.length);matchStatus.dataset.total='4';matchStatus.dataset.score=solo.scores.join(':');
    const result=solo.result===null?'':solo.result==='draw'?'DRAW':solo.result===0?'VICTORY':'DEFEAT';
    matchStatus.textContent=`${result || (solo.paused?'PAUSED':'TEAM DEATHMATCH')} · ${solo.difficulty.toUpperCase()} · Blue ${solo.scores[0]} — ${solo.scores[1]} Red · ${Math.ceil(solo.secondsLeft)}s ${solo.sudden?'SUDDEN DEATH':''} · First to ${solo.killTarget} kills`;
    if(tutorialMode)matchStatus.textContent=`GUIDED TRAINING · ${Math.min(tutorialProgress.index+1,LESSONS.length)}/${LESSONS.length} ${solo.paused?'· PAUSED':''}`;
    pauseButton.textContent=solo.paused?'Resume':'Pause'; pauseButton.disabled=solo.result!==null;
    document.querySelector<HTMLElement>('#results')!.hidden=solo.result===null;
    document.querySelector('#result-title')!.textContent=result;document.querySelector('#result-summary')!.textContent=`Final score: Blue ${solo.scores[0]} — ${solo.scores[1]} Red. Each enemy destroyed earns one team kill.`;
    m={type:'state',tick:solo.tick,tank:me,combat:{hp:me.hp,incomingFire:false,weapon:me.weapon,charge:me.charge,remainingTicks:me.remainingTicks,hits:0,shells:solo.shells,events:solo.events,targets:soloActors.map(a=>({...a,reset:a.respawn}))}};
  }
  if (m.type === 'advanced') { workerStatus.textContent = `Worker simulation: tick ${m.tick} (${m.elapsedSeconds.toFixed(2)} s)`; worker.postMessage({ type: 'start', mode:rangeMode?'range':tutorialMode?'tutorial':'solo',difficulty:settings.difficulty }); }
  else if (m.type === 'state') { state = m.tank;
    if (m.combat.weapon === 'reloading' && combat?.weapon !== 'reloading') { recoilUntil = performance.now() + 160; recoilStrength = 3 + 7 * (combat?.charge ?? 0); }
    if (m.combat.hits > (combat?.hits ?? 0)) hitUntil = performance.now() + 180;
    if (m.combat.hp < (combat?.hp ?? 100)) hurtUntil = performance.now() + 200;
    eventInbox.push(m.combat.events);combat = m.combat;driveStatus.dataset.charge=String(combat.charge);driveStatus.dataset.barrel=String(state.turret);
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
worker.onerror=failWorker;worker.onmessageerror=failWorker;
worker.postMessage({ type: 'advance', ticks: 30 });
class Playground extends Phaser.Scene {
  private music?:Phaser.Sound.WebAudioSound;
  private hull!: Phaser.GameObjects.Image;
  private turret!: Phaser.GameObjects.Image;
  private cursor!: Phaser.GameObjects.Graphics;
  private battle!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Text;
  private fog!:Phaser.GameObjects.Graphics;
  private smokeFx!:Phaser.GameObjects.Graphics;
  private soundFx!:Phaser.GameObjects.Graphics;
  private soundLabels:Phaser.GameObjects.Text[]=[];private lastSound=0;private lastFogTick=-10;private nextHum=0;private nextEngine=0;private previousSmoke=0;
  private mini!: Phaser.GameObjects.Graphics;
  private instruments!:Phaser.GameObjects.Graphics;
  private confirmation!:Phaser.GameObjects.Text;
  private help!:Phaser.GameObjects.Text;
  private unitSprites = new Map<number,{hull:Phaser.GameObjects.Image;turret:Phaser.GameObjects.Image}>();
  private activeInput = true;
  clearKeys():void{showScoreboard(false);controls.clear();this.input.keyboard?.resetKeys();}
  private lastEffect = 0;
  private effects: {event: CombatEvent; until:number}[] = [];
  preload():void {this.load.audio('music',wavData(musicWav())); for(const kind of ['tap','full','impact','destruction','vent','engine','charge','smoke'] as const) this.load.audio(kind,audioData(kind)); }
  constructor() { super('playground'); }
  create(): void {
    gameScene = this;this.music=this.sound.add('music',{loop:true,volume:settings.musicVolume}) as Phaser.Sound.WebAudioSound;
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{if(p.rightButtonDown()&&this.activeInput&&!settingsOpen())weapon('cancel');});
    this.input.keyboard!.addKey('T').on('down',()=>{if(rangeMode&&this.activeInput&&!settingsOpen()&&!Object.values(settings.bindings).includes('KeyT'))worker.postMessage({type:'range-fire'});});
    const colors = TERRAIN_COLORS;
    createBattlefield(this,trainingMap);createTankTextures(this);
    for(const l of trainingMap.landmarks??[])this.add.text(l.x,l.y,l.name.toUpperCase(),{fontFamily:'monospace',fontSize:'15px',color:'#b8c6a8'}).setOrigin(.5);
    this.hull = this.add.image(0,0,'hull-player'); this.turret = this.add.image(0,0,'turret-player').setOrigin(1/3,.5); this.cursor = this.add.graphics(); this.battle = this.add.graphics();
    this.battle.setDepth(3);this.hull.setDepth(5);this.turret.setDepth(5);this.cursor.setDepth(6);
    this.fog=this.add.graphics().setDepth(2);this.smokeFx=this.add.graphics().setDepth(4);this.soundFx=this.add.graphics().setScrollFactor(0).setDepth(7);
    for(let sector=0;sector<8;sector++)this.soundLabels.push(this.add.text(0,0,'',{fontFamily:'monospace',fontSize:'12px',color:'#f1d09c',backgroundColor:'#101b17',padding:{x:4,y:2}}).setOrigin(.5).setScrollFactor(0).setDepth(7));
    const miniGround=this.add.graphics();for(let i=0;i<trainingMap.terrain.length;i++)miniGround.fillStyle(colors[trainingMap.terrain[i]]).fillRect(i%trainingMap.width*3.2,Math.floor(i/trainingMap.width)*3.2,3.2,3.2);miniGround.generateTexture('mini-ground',160,96);miniGround.destroy();this.add.image(780,16,'mini-ground').setOrigin(0).setScrollFactor(0).setDepth(6.5);
    for(const l of trainingMap.landmarks??[])this.add.text(780+l.x/10,16+l.y/10+6,l.name==='Radio Tower'?'RADIO':l.name==='Broken Bridge'?'BRIDGE':'DEPOT',{fontFamily:'monospace',fontSize:'9px',color:'#d8ddc4',backgroundColor:'#101b17'}).setOrigin(.5).setScrollFactor(0).setDepth(8);
    this.mini=this.add.graphics().setScrollFactor(0).setDepth(7);
    this.hud = this.add.text(18, 16, '', { fontFamily: 'monospace', fontSize: '14px', color: '#edf4df', backgroundColor: '#101b17cc', padding: { x: 8, y: 6 } }).setScrollFactor(0).setDepth(7);
    this.instruments=this.add.graphics().setScrollFactor(0).setDepth(8);
    this.confirmation=this.add.text(480,405,'',{fontFamily:'monospace',fontSize:'18px',color:'#ffebaf',backgroundColor:'#101b17cc',padding:{x:8,y:5}}).setOrigin(.5).setScrollFactor(0).setDepth(8);
    this.help=this.add.text(18,525,'',{fontFamily:'monospace',fontSize:'12px',color:'#c3d2bb',backgroundColor:'#101b17cc',padding:{x:6,y:4}}).setOrigin(0,1).setScrollFactor(0).setDepth(7);
    this.applySettings();const canvas=this.game.canvas;canvas.addEventListener('webglcontextlost',()=>{this.music?.pause();pause(true);document.querySelector<HTMLElement>('#session-error')!.hidden=false;document.querySelector('#session-error p')!.textContent='Graphics context lost. Reload to restore the battlefield and start a fresh match.';});canvas.addEventListener('pointerdown',()=>canvas.focus());canvas.tabIndex=0;canvas.setAttribute('aria-label','Tank battlefield; keyboard controls available in Settings');
    this.cameras.main.setBounds(0, 0, trainingMap.width * 32, trainingMap.height * 32).centerOn(160, 272);
  }
  private playFX(key:string,config:Phaser.Types.Sound.SoundConfig):void{this.sound.play(key,{...config,volume:(config.volume??1)*settings.volume});}
  applySettings():void{this.sound.volume=1;this.music?.setVolume(settings.musicVolume);this.sound.mute=settings.muted;if(this.hud)this.hud.setFontSize(14*settings.textScale).setWordWrapWidth(720);for(const label of this.soundLabels)label.setFontSize(12*settings.textScale);this.confirmation?.setFontSize(18*settings.textScale);this.help?.setFontSize(12*settings.textScale).setWordWrapWidth(900);}
  neutralize(): void { showScoreboard(false);controls.clear();this.activeInput = false; worker.postMessage({ type: 'neutralize' }); worker.postMessage({ type: 'input', input: { ...neutralInput(), aim: state?.turret ?? 0 } }); this.input.keyboard?.resetKeys(); }
  reactivate(): void { this.activeInput = true; }
  update(_time: number, delta: number): void {
    if(this.music&&!this.sound.locked){if(document.hidden||solo?.paused){if(this.music.isPlaying)this.music.pause();}else if(this.music.isPaused)this.music.resume();else if(!this.music.isPlaying)this.music.play();}
    driveStatus.dataset.audioReady = String(!this.sound.locked); driveStatus.dataset.muted = String(this.sound.mute);
    if (!state) return;
    const rendered = tankPoses.sample(performance.now()) ?? state;
    const pointer = this.input.activePointer;
    // DOM lesson/settings layout can move the canvas between Phaser's periodic bounds checks.
    this.scale.updateBounds();
    const pointerX=mouseClient?this.scale.transformX(mouseClient.x+window.scrollX):pointer.x;
    const pointerY=mouseClient?this.scale.transformY(mouseClient.y+window.scrollY):pointer.y;
    const world = this.cameras.main.getWorldPoint(pointerX,pointerY);
    const aim = Math.atan2(world.y - state.y, world.x - state.x);
    const drive=controls.drive(aim);
    worker.postMessage({type:'input',input:this.activeInput&&!settingsOpen()?drive:{...neutralInput(),aim}});
    this.hull.setPosition(rendered.x, rendered.y).setRotation(rendered.hull);
    const recoil = settings.reducedMotion?0:Math.max(0, (recoilUntil - performance.now()) / 160) * recoilStrength;
    this.hull.setAlpha(combat?.hp === 0 ? 0.25 : 1); this.turret.setAlpha(combat?.hp === 0 ? 0.25 : 1);
    this.turret.setPosition(rendered.x-Math.cos(rendered.turret)*recoil,rendered.y-Math.sin(rendered.turret)*recoil).setRotation(rendered.turret);
    this.cursor.clear().lineStyle(2, 0xffffff, 0.85).strokeCircle(world.x, world.y, 8).lineBetween(world.x - 13, world.y, world.x + 13, world.y).lineBetween(world.x, world.y - 13, world.x, world.y + 13);
    const leadX=settings.reducedMotion?0:Phaser.Math.Clamp(pointerX-480,-240,240)/3,leadY=settings.reducedMotion?0:Phaser.Math.Clamp(pointerY-270,-240,240)/3;
    const cam = this.cameras.main, blend = settings.reducedMotion?1:1 - Math.exp(-Math.min(delta, 100) / 180);
    cam.centerOn(Phaser.Math.Linear(cam.midPoint.x, rendered.x + leadX, blend), Phaser.Math.Linear(cam.midPoint.y, rendered.y + leadY, blend));
    const now = performance.now();
    for(const event of eventInbox.drain()) {
      if(event.id <= this.lastEffect) continue;
      this.lastEffect = event.id;
      if(this.effects.length >= (settings.lowEffects?16:64)) this.effects.shift();
      this.effects.push({event,until:now+(event.kind === 'destruction' ? 450 : 220)});
      if(!this.sound.locked) this.playFX(event.kind === 'shot' ? (event.charge >= 0.5 ? 'full' : 'tap') : event.kind, {volume:event.kind === 'shot' ? 0.25+0.15*event.charge : 0.15});
    }
    this.effects = this.effects.filter(effect=>effect.until > now);
    this.battle.clear();
    for(const effect of this.effects) {
      const event=effect.event, fade=Math.min(1,(effect.until-now)/220);
      const radius=settings.reducedMotion?12:event.kind === 'destruction' ? 22+(1-fade)*20 : 4+(1-fade)*(12+event.charge*10);
      this.battle.lineStyle(event.kind === 'destruction' ? 4 : 2,event.kind === 'vent' ? 0xa2b4ac : 0xffd99b,fade).strokeCircle(event.x,event.y,radius);
    }
    if(solo) {
      if(solo.tick<this.lastFogTick||solo.tick-this.lastFogTick>=3||solo.paused){this.lastFogTick=solo.tick;const visible=new Set(solo.ground);this.fog.clear().fillStyle(0x08110d,0.56);for(let i=0;i<trainingMap.terrain.length;i++)if(!visible.has(i))this.fog.fillRect(i%trainingMap.width*32,Math.floor(i/trainingMap.width)*32,32,32);}
      this.smokeFx.clear();for(const cloud of solo.smokes)this.smokeFx.fillStyle(0xa8b2a8,0.92).fillCircle(cloud.x,cloud.y,100).lineStyle(2,0xd2d7c8,0.8).strokeCircle(cloud.x,cloud.y,100);
      for(const stamp of solo.tracks){const dx=Math.cos(stamp.axis)*9,dy=Math.sin(stamp.axis)*9,ox=Math.sin(stamp.axis)*6,oy=-Math.cos(stamp.axis)*6;this.battle.lineStyle(3,0x1b251b,[0.75,0.5,0.25][stamp.stage]).lineBetween(stamp.x-dx+ox,stamp.y-dy+oy,stamp.x+dx+ox,stamp.y+dy+oy).lineBetween(stamp.x-dx-ox,stamp.y-dy-oy,stamp.x+dx-ox,stamp.y+dy-oy);}
      for(const sight of solo.sightings){const alpha=Math.max(0,(sight.expires-solo.tick)/90)*0.5;this.battle.lineStyle(2,0xc4b7a0,alpha).lineBetween(sight.x-10,sight.y-10,sight.x+10,sight.y+10).lineBetween(sight.x+10,sight.y-10,sight.x-10,sight.y+10);}
      this.soundFx.clear();this.soundLabels.forEach(l=>l.setVisible(false));
      for(const cue of solo.sounds){const angle=cue.sector*Math.PI/4,x=480+Math.cos(angle)*400,y=270+Math.sin(angle)*210;const label=this.soundLabels[cue.sector];label.setPosition(x,y).setText(cue.kind.toUpperCase()+' '+cue.band.toUpperCase()).setAlpha(cue.band==='near'?1:0.65).setVisible(true);this.soundFx.lineStyle(cue.band==='near'?4:2,0xe3bc81,0.8).strokeCircle(x,y,24);
       if(cue.id>this.lastSound){this.lastSound=cue.id;if(!this.sound.locked)this.playFX(cue.kind==='shot'?'tap':cue.kind,{volume:cue.band==='near'?0.1:0.045,pan:Math.cos(angle)*0.8});}
      }
      const me=solo.allies[0];if(me.smokeIn>this.previousSmoke+1&&!this.sound.locked)this.playFX('smoke',{volume:0.2});this.previousSmoke=me.smokeIn;
      if(!solo.paused&&solo.result===null&&me.hp>0&&me.speed>8&&!me.quiet&&now>this.nextEngine){this.nextEngine=now+260;if(!this.sound.locked)this.playFX('engine',{volume:0.025});}
      if(!solo.paused&&solo.result===null&&combat?.weapon==='charging'&&now>this.nextHum){this.nextHum=now+220;if(!this.sound.locked)this.playFX('charge',{volume:0.035+combat.charge*0.035,rate:0.8+combat.charge*0.7});}
      const mini=this.mini;mini.clear().lineStyle(1,0x697566).strokeRect(780,16,160,96);
      for(const wall of trainingMap.walls)mini.fillStyle(0x879080).fillRect(780+wall.x/10,16+wall.y/10,wall.width/10,wall.height/10);
      for(const sight of solo.sightings){const x=780+sight.x/10,y=16+sight.y/10;mini.lineStyle(1,0xc4b7a0,0.5).lineBetween(x-3,y-3,x+3,y+3).lineBetween(x+3,y-3,x-3,y+3);}
      for(const a of [...solo.allies,...solo.enemies])if(a.hp>0){mini.fillStyle(a.team===0?0x87c9e8:0xf49f89);const x=780+a.x/10,y=16+a.y/10;if(a.team===0)mini.fillCircle(x,y,a.id===0?3:2);else mini.fillTriangle(x,y-3,x-3,y+2,x+3,y+2);}
    }
    if (combat) {
      // Destroy absent/dead contacts, so no stale sprite survives an authorized hide.
      const liveIds=new Set(soloActors.filter(a=>a.hp>0).map(a=>a.id));
      for(const [id,sprite] of this.unitSprites)if(!liveIds.has(id)){sprite.hull.destroy();sprite.turret.destroy();this.unitSprites.delete(id);}
      for (const [index, targetState] of combat.targets.entries()) {
        const target = { ...targetState, ...targetPoses.get(index)?.sample(performance.now()) };
        if (target.hp <= 0) continue;
        const actor=soloActors[index], pose=targetPoses.get(index)?.sample(now);
        const color=actor?.team===0?0x87c9e8:0xb87360;
        if(actor){
          let sprite=this.unitSprites.get(actor.id);
          if(!sprite){const skin=actor.team===0?'ally':'enemy';sprite={hull:this.add.image(0,0,'hull-'+skin).setDepth(5),turret:this.add.image(0,0,'turret-'+skin).setOrigin(1/3,.5).setDepth(5.1)};this.unitSprites.set(actor.id,sprite);}
          sprite.hull.setPosition(target.x,target.y).setRotation(pose?.hull??actor.hull);
          sprite.turret.setPosition(target.x,target.y).setRotation(pose?.turret??actor.turret);
          if(actor.protection>0)this.battle.lineStyle(2,0xffffff).strokeCircle(target.x,target.y,29);
        }
        else this.battle.fillStyle(color).fillRoundedRect(target.x - 20, target.y - 24, 40, 48, 4).lineStyle(2, 0xffd9a8).strokeCircle(target.x, target.y, 12);
        this.battle.fillStyle(0x151c17).fillRect(target.x - 22, target.y - 34, 44, 5).fillStyle(0xf2bf78).fillRect(target.x - 22, target.y - 34, 44 * target.hp / 100, 5);
      }
      driveStatus.dataset.enemySprites=String([...this.unitSprites.keys()].filter(id=>soloActors.find(a=>a.id===id)?.team===1).length);
      driveStatus.dataset.allySprites=String([...this.unitSprites.keys()].filter(id=>soloActors.find(a=>a.id===id)?.team===0).length);
      for (const shell of combat.shells) { const pose = shellPoses.get(shell.id)?.sample(performance.now()) ?? shell; this.battle.lineStyle(1+shell.charge*2,shell.hostile?0xff9177:0xffedab,.6).lineBetween(pose.x-Math.cos(shell.angle)*(5+shell.charge*12),pose.y-Math.sin(shell.angle)*(5+shell.charge*12),pose.x,pose.y).fillStyle(shell.hostile ? 0xff9177 : 0xffedab).fillCircle(pose.x, pose.y, 2 + shell.charge * 2); }
      if (performance.now() < hitUntil) this.battle.lineStyle(3,0xffffff).strokeCircle(world.x,world.y,16);
      if (performance.now() < hurtUntil) this.battle.lineStyle(4,0xff9177).strokeCircle(rendered.x,rendered.y,38);
      if (combat.incomingFire) this.battle.lineStyle(2,0xff9177).strokeCircle(420,272,16);
      if (performance.now() < recoilUntil - 100) this.battle.fillStyle(0xffedab).fillCircle(rendered.x + Math.cos(rendered.turret)*36,rendered.y+Math.sin(rendered.turret)*36,3+recoilStrength*0.4);
      if (combat.weapon === 'charging') this.battle.lineStyle(3, 0xffde84).strokeCircle(rendered.x, rendered.y, 28 + combat.charge * 6);
    }
    const quiet = drive.silent && state.speed <= speedCap(trainingMap, state.x, state.y, true) + 0.1;
    if(solo){
      const me=solo.allies[0],readout=combatHUD(solo),fx=this.instruments;fx.clear();
      const health=me.hp===0?`DESTROYED · RESPAWN ${(me.respawn/30).toFixed(1)}s`:`HP ${me.hp}${me.protection>0?' · PROTECTED '+(me.protection/30).toFixed(1)+'s':''}`;
      this.hud.setText(`${health}\n${readout.weapon}\n${keyLabel(settings.bindings.smoke)} SMOKE ${me.smokeIn>0?(me.smokeIn/30).toFixed(1)+'s':'READY'}${me.quiet?' · QUIET':''}${me.revealed?' · FIRING REVEAL':''}`);
      const y=24+this.hud.height;
      fx.fillStyle(0x101b17,.95).fillRect(18,y,240,12).fillStyle(0x85c99a).fillRect(21,y+3,100*me.hp/100,6).fillStyle(me.charge>=1?0xffb26b:0xf2d384).fillRect(130,y+3,120*me.charge,6);
      fx.lineStyle(1,0x879b7e).strokeRect(21,y+3,100,6).strokeRect(130,y+3,120,6);
      this.confirmation.setText(readout.confirmation).setVisible(Boolean(readout.confirmation));
      if(readout.confirmation){const color=readout.confirmation==='ENEMY DESTROYED'?0xffd88b:0xffffff;fx.lineStyle(2,color);for(const [x,y] of [[-1,-1],[1,1],[-1,1],[1,-1]])fx.lineBetween(pointerX+x*10,pointerY+y*10,pointerX+x*16,pointerY+y*16);}
      for(const sector of readout.damageSectors){const angle=sector*Math.PI/4,dx=Math.cos(angle),dy=Math.sin(angle),x=480+dx*420,y=270+dy*215;
        fx.fillStyle(0xff947d).fillTriangle(x-dx*13,y-dy*13,x+dx*9-dy*10,y+dy*9+dx*10,x+dx*9+dy*10,y+dy*9-dx*10);
      }
      this.help.setText(`${[settings.bindings.up,settings.bindings.left,settings.bindings.down,settings.bindings.right].map(keyLabel).join('/')} MOVE · ${keyLabel(settings.bindings.fire)} FIRE · RMB/${keyLabel(settings.bindings.cancel)} CANCEL · ${keyLabel(settings.bindings.quiet)} QUIET · ${keyLabel(settings.bindings.pause)} SETTINGS · ${keyLabel(settings.bindings.scoreboard)} SCORES`);
      return;
    }
    this.hud.setText(`WASD  DRIVE     MOUSE  AIM     SHIFT  QUIET\nSpeed ${Math.round(state.speed)} px/s  ${quiet ? 'QUIET CAP ACTIVE' : ''}\nTerrain: ${terrainAt(trainingMap, state.x, state.y)}  |  Walls block movement\nSPACE HOLD/RELEASE FIRE · RMB CANCEL\nM SOUND ${this.sound.mute ? "OFF" : "ON"} · HP ${combat?.hp ?? 100} ${combat?.hp === 0 ? "DESTROYED — R TO RESET" : ""} · R RESET · T TRAINING FIRE ${combat?.incomingFire ? "ON" : "OFF"}\n${combat?.weapon === "charging" && combat.charge >= 1 ? "FULL — RELEASE BEFORE VENT" : combat?.weapon ?? "ready"} ${Math.round((combat?.charge ?? 0) * 100)}% · ${( (combat?.remainingTicks ?? 0) / 30).toFixed(2)}s · Hits ${combat?.hits ?? 0}`);
  }
}
new Phaser.Game({ type: Phaser.AUTO, parent: 'game', width: 960, height: 540, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: Playground, backgroundColor: '#263a30' });
window.addEventListener('blur', () => gameScene?.neutralize());
window.addEventListener('focus', () => gameScene?.reactivate());
document.addEventListener('visibilitychange', () => { lastWorkerAt=performance.now();if (document.hidden) { gameScene?.neutralize(); if(!rangeMode)pause(true); } else gameScene?.reactivate(); });
const serverStatus = document.querySelector('#server-status')!;
const endpoint = import.meta.env.VITE_SERVER_URL ?? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.hostname}:2567`;
if(!rangeMode||!import.meta.env.DEV||!new URLSearchParams(location.search).has('diagnostics'))serverStatus.textContent='Solo runs entirely on this device.';
else void import('colyseus.js').then(({Client})=>new Client(endpoint).joinOrCreate('foundation',currentHandshake())).then(room=>{
 room.onMessage('welcome',(message:unknown)=>{serverStatus.textContent=versionsMatch(message)?'Development server connected · versions match':'Server version mismatch';if(!versionsMatch(message))void room.leave();});room.onLeave(()=>{serverStatus.textContent='Development server disconnected. Reload to reconnect.';});
}).catch(()=>{serverStatus.textContent='Development server unavailable or incompatible. Start it and reload.';});
setupOffline();
