import {expect,it} from 'vitest';
import {defaultSettings,parseSettings,Controls} from '../client/settings';
it('recovers defaults from missing or malformed persisted settings and clamps accessibility/audio values',()=>{
 expect(parseSettings('broken')).toEqual(defaultSettings());const s=parseSettings(JSON.stringify({volume:4,textScale:0.1,reducedMotion:true,bindings:{fire:'KeyF'}}));
 expect(s.volume).toBe(1);expect(s.textScale).toBe(1);expect(s.reducedMotion).toBe(true);expect(s.bindings.fire).toBe('KeyF');
});
it('remaps controls, keeps edges, and rejects repeats after clearing held keys',()=>{
 const settings=defaultSettings();settings.bindings.fire='KeyF';const controls=new Controls(settings.bindings);
 expect(controls.down('Space',false)).toEqual([]);expect(controls.down('KeyF',false)).toEqual(['press']);expect(controls.up('KeyF')).toEqual(['release']);
 controls.down('KeyF',false);controls.clear();expect(controls.down('KeyF',true)).toEqual([]);expect(controls.up('KeyF')).toEqual([]);
 controls.down('KeyW',false);controls.down('ShiftLeft',false);expect(controls.drive(1)).toEqual({x:0,y:-1,aim:1,silent:true});
});
it('rejects conflicting bindings rather than leaving a movement key firing the cannon',()=>{
 const s=parseSettings(JSON.stringify({bindings:{fire:'KeyW'}}));expect(s.bindings).toEqual(defaultSettings().bindings);
});

it('does not let the alternate Shift key shadow another action while quiet uses both Shift keys',()=>{const s=parseSettings(JSON.stringify({bindings:{fire:'ShiftRight'}}));expect(s.bindings).toEqual(defaultSettings().bindings);});
