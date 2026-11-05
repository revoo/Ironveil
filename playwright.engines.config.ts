import {defineConfig,type Project} from '@playwright/test';import base from './playwright.config';
const projects:Project[]=[{name:'chromium',use:{browserName:'chromium' as const}},{name:'webkit',use:{browserName:'webkit' as const}}];
if(process.env.IRONVEIL_FIREFOX==='1')projects.push({name:'firefox',use:{browserName:'firefox'}});
export default defineConfig({...base,testMatch:'engine-smoke.spec.ts',workers:2,globalTimeout:120000,projects});
