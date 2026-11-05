/** Original deterministic placeholder effects, generated as mono 16-bit PCM. */
export function toneWav(kind:'tap'|'full'|'impact'|'destruction'|'vent'|'engine'|'charge'|'smoke'):Uint8Array {
 const settings={tap:[0.12,180],full:[0.3,95],impact:[0.1,280],destruction:[0.4,65],vent:[0.25,400],engine:[0.1,65],charge:[0.2,400],smoke:[0.2,130]} as const;
 const [duration,frequency]=settings[kind], rate=22050, samples=Math.ceil(duration*rate);
 const bytes=pcmWav(samples,rate),v=new DataView(bytes.buffer);
 let seed=12345;
 for(let i=0;i<samples;i++) { const t=i/rate,p=i/(samples-1); seed=(Math.imul(seed,1664525)+1013904223)>>>0; const noise=seed/0xffffffff*2-1;
  const envelope=Math.min(1,t*800)*Math.exp(-7*p)*(1-p);
  const wave=Math.sin(2*Math.PI*frequency*(t-t*t/(duration*3)));
  v.setInt16(44+i*2,Math.round((wave*0.65+noise*0.35)*envelope*16000),true);
 }
 return bytes;
}
export function wavData(bytes:Uint8Array):string{let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return 'data:audio/wav;base64,'+btoa(text);}
export function audioData(kind:Parameters<typeof toneWav>[0]):string{return wavData(toneWav(kind));}

function pcmWav(samples:number,rate:number):Uint8Array{
 const bytes=new Uint8Array(44+samples*2), v=new DataView(bytes.buffer);
 const text=(offset:number,value:string)=>{for(let i=0;i<value.length;i++) bytes[offset+i]=value.charCodeAt(i);};
 text(0,'RIFF');v.setUint32(4,bytes.length-8,true);text(8,'WAVE');text(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,samples*2,true);
 return bytes;
}
/** Original restrained 16-second ambient score; no positional or gameplay information. */
export function musicWav():Uint8Array{
 const rate=22050,samples=16*rate,bytes=pcmWav(samples,rate),v=new DataView(bytes.buffer),notes=[82.4069,97.9989,123.4708,110];
 for(let i=0;i<samples;i++){
  const t=i/rate,p=i/(samples-1),section=Math.floor(t/4),phase=(t%4)/4,base=notes[section];
  const pad=(Math.sin(2*Math.PI*base*t)*.45+Math.sin(2*Math.PI*base*1.5*t)*.2+Math.sin(2*Math.PI*base*2*t)*.1)*Math.sin(Math.PI*phase)**2;
  const pulse=Math.sin(2*Math.PI*41.20345*t)*Math.exp(-((t*2)%1)*7)*.15;
  v.setInt16(44+i*2,Math.round((pad+pulse)*Math.sin(Math.PI*p)**2*10000),true);
 }
 return bytes;
}
