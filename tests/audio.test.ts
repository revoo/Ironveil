import { expect, it } from 'vitest';
import { toneWav } from '../client/audio';
it('creates a valid finite PCM wave with a quiet tail for each sound',()=>{
 for(const kind of ['tap','full','impact','destruction','vent','engine','charge','smoke'] as const) {
  const bytes=toneWav(kind); const view=new DataView(bytes.buffer);
  expect(new TextDecoder().decode(bytes.slice(0,4))).toBe('RIFF'); expect(new TextDecoder().decode(bytes.slice(8,12))).toBe('WAVE');
  expect(view.getUint32(24,true)).toBe(22050); expect(view.getUint32(40,true)).toBe(bytes.length-44);
  expect(bytes.length).toBeGreaterThan(1000); expect(Math.abs(view.getInt16(bytes.length-2,true))).toBeLessThan(100);
 }
 expect(toneWav('full').length).toBeGreaterThan(toneWav('tap').length);
});

it('provides a deterministic, bounded seamless ambient music loop without clipping',async()=>{
 const {musicWav}=await import('../client/audio');const b=musicWav();expect(b.length).toBeGreaterThan(100000);expect(b.length).toBeLessThan(1000000);expect(musicWav()).toEqual(b);
 const v=new DataView(b.buffer);expect(v.getUint32(24,true)).toBe(22050);expect(v.getUint32(40,true)).toBe(b.length-44);
 let max=0;for(let i=44;i<b.length;i+=2)max=Math.max(max,Math.abs(v.getInt16(i,true)));expect(max).toBeGreaterThan(100);expect(max).toBeLessThan(16000);expect(Math.abs(v.getInt16(44,true))).toBeLessThan(100);expect(Math.abs(v.getInt16(b.length-2,true))).toBeLessThan(100);
});
