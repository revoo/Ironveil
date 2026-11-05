import http from 'node:http';
import {readFile,stat,access} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.wav':'audio/wav','.ico':'image/x-icon'};
/** Static solo delivery only. No sessions, sockets, credentials or game authority. */
export function createSoloServer(directory){
 const root=resolve(directory);
 return http.createServer(async(req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
  let path;try{path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
  const relative=path==='/'?'index.html':path.replace(/^\/+/,''),file=resolve(root,relative);
  if(!file.startsWith(root+sep)){res.writeHead(404);res.end();return;}
  try{
   if(!(await stat(file)).isFile())throw new Error('Not a file');const bytes=await readFile(file);
   res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream','Content-Length':bytes.length,'X-Content-Type-Options':'nosniff','Cache-Control':/^assets\/[^/]+-[\w-]+\.[a-z]+$/.test(relative)?'public, max-age=31536000, immutable':'no-cache'});
   res.end(req.method==='HEAD'?undefined:bytes);
  }catch{res.writeHead(404);res.end();}
 });
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 const option=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1];};
 const root=option('--dir','dist'),port=Number(option('--port',process.env.IRONVEIL_PORT??'4173'));
 if(!Number.isInteger(port)||port<0||port>65535)throw new Error('Invalid port');
 await access(resolve(root,'index.html'));await access(resolve(root,'sw.js'));
 const server=createSoloServer(root);server.listen(port,'127.0.0.1',()=>console.log(`Ironveil solo: http://127.0.0.1:${server.address().port}/`));
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
}
