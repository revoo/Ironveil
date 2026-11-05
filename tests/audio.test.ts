import { expect, it } from 'vitest';
import { toneWav } from '../client/audio';
it('creates a valid finite PCM wave with a quiet tail for each sound',()=>{
 for(const kind of ['tap','full','impact','destruction','vent'] as const) {
  const bytes=toneWav(kind); const view=new DataView(bytes.buffer);
  expect(new TextDecoder().decode(bytes.slice(0,4))).toBe('RIFF'); expect(new TextDecoder().decode(bytes.slice(8,12))).toBe('WAVE');
  expect(view.getUint32(24,true)).toBe(22050); expect(view.getUint32(40,true)).toBe(bytes.length-44);
  expect(bytes.length).toBeGreaterThan(1000); expect(Math.abs(view.getInt16(bytes.length-2,true))).toBeLessThan(100);
 }
 expect(toneWav('full').length).toBeGreaterThan(toneWav('tap').length);
});
