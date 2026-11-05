import {chromium} from '@playwright/test';
const url=process.env.IRONVEIL_RELEASE_URL??'http://127.0.0.1:4180/';const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1280,height:960},deviceScaleFactor:2});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.waitForSelector('#drive-status[data-ally-sprites]',{state:'attached'});await page.locator('canvas').click();await page.keyboard.down('d');await page.waitForTimeout(1800);await page.keyboard.up('d');await page.keyboard.down('s');await page.waitForTimeout(800);await page.keyboard.up('s');await page.keyboard.press('q');
 const frames=page.evaluate(()=>new Promise(resolve=>{const a=[];let prior;const frame=now=>{if(prior!==undefined)a.push(now-prior);prior=now;if(a.length<600)requestAnimationFrame(frame);else{a.sort((x,y)=>x-y);resolve({samples:a.length,p50:a[299],p95:a[569],p99:a[593],max:a[599]});}};requestAnimationFrame(frame);}));
 for(let i=0;i<8;i++){await page.keyboard.down('Space');await page.waitForTimeout(i%2?900:80);await page.keyboard.up('Space');await page.waitForTimeout(700);}
 console.log(JSON.stringify({url,browser:browser.version(),viewport:[960,540],deviceScaleFactor:2,framesMs:await frames,errors}));
 if(errors.length)process.exitCode=1;
}finally{await browser.close();}
