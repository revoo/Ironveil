import { defineConfig } from '@playwright/test';
const reuse=process.env.PLAYWRIGHT_REUSE_SERVER==='1';
export default defineConfig({
 testDir:'./e2e',timeout:20_000,use:{baseURL:'http://127.0.0.1:5173',headless:true},
 webServer:[
  {command:'npm run dev:client',url:'http://127.0.0.1:5173',reuseExistingServer:reuse,timeout:30_000},
  {command:'npm run dev:server',url:'http://127.0.0.1:2567',reuseExistingServer:reuse,timeout:30_000},
  {command:process.env.CI?'npm run preview':'npm run build && npm run preview',url:'http://127.0.0.1:4173',reuseExistingServer:false,timeout:60_000},
 ],
});
