/** Original deterministic placeholder effects, generated as mono 16-bit PCM. */
export function toneWav(kind:'tap'|'full'|'impact'|'destruction'|'vent'):Uint8Array {
 const settings={tap:[0.12,180],full:[0.3,95],impact:[0.1,280],destruction:[0.4,65],vent:[0.25,400]} as const;
 const [duration,frequency]=settings[kind], rate=22050, samples=Math.ceil(duration*rate);
 const bytes=new Uint8Array(44+samples*2), v=new DataView(bytes.buffer);
 const text=(offset:number,value:string)=>{for(let i=0;i<value.length;i++) bytes[offset+i]=value.charCodeAt(i);};
 text(0,'RIFF');v.setUint32(4,bytes.length-8,true);text(8,'WAVE');text(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,samples*2,true);
 let seed=12345;
 for(let i=0;i<samples;i++) { const t=i/rate,p=i/(samples-1); seed=(Math.imul(seed,1664525)+1013904223)>>>0; const noise=seed/0xffffffff*2-1;
  const envelope=Math.min(1,t*800)*Math.exp(-7*p)*(1-p);
  const wave=Math.sin(2*Math.PI*frequency*(t-t*t/(duration*3)));
  v.setInt16(44+i*2,Math.round((wave*0.65+noise*0.35)*envelope*16000),true);
 }
 return bytes;
}
export function audioData(kind:Parameters<typeof toneWav>[0]):string { return 'data:audio/wav;base64,'+btoa(Array.from(toneWav(kind),byte=>String.fromCharCode(byte)).join('')); }
