const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const html=path.resolve(process.env.PEP_HTML||path.join(__dirname,'dist/DDS_PEP_2026.html'));
const qa=path.resolve(process.env.PEP_QA||path.join(__dirname,'qa'));fs.mkdirSync(qa,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PEP_CHROME?{executablePath:process.env.PEP_CHROME}:{channel:'chrome'})});
 try{
 const page=await browser.newPage({viewport:{width:1360,height:1000},acceptDownloads:true});const errors=[],results=[];
 page.on('pageerror',e=>errors.push(e.message));const ok=n=>{results.push(n);console.log('PASS '+n);};
 await page.goto('file://'+html);await page.waitForFunction(()=>window.PEP_APP);
 const raw=JSON.parse(fs.readFileSync(path.join(__dirname,'compatibility/fixtures/0.4.0-vu-principles.json'))).draft;
 const input=path.join(qa,'old-vu-draft.json');fs.writeFileSync(input,JSON.stringify(raw));
 await page.locator('#file-input').setInputFiles(input);
 await page.waitForFunction(()=>PEP_APP.getState().student.number==='TEST-NOT-A-STUDENT');
 const summary=page.locator('#import-summary');assert((await summary.innerText()).includes('126 EC previously → 120 EC after import.'));assert((await summary.innerText()).includes('Principles of Drug Targets'));assert((await summary.innerText()).includes('Removed / replaced'));assert.equal(await page.evaluate(()=>document.activeElement.id),'import-summary');ok('Opening an older draft focuses the named course changes and precise old/new EC totals');
 await page.screenshot({path:path.join(qa,'import-change-desktop.png')});
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#save-draft').click()]);const savedPath=path.join(qa,'resaved-draft.json');await download.saveAs(savedPath);const saved=JSON.parse(fs.readFileSync(savedPath));assert(saved.courseSnapshot);assert.equal(saved.formVersion,require('./catalogue.json').appVersion);assert(!saved.importReport);assert.equal(JSON.parse(fs.readFileSync(input)).principles.required.length,1);ok('Saving creates an updated snapshot without modifying the original draft');
 await page.locator('#file-input').setInputFiles(savedPath);await page.waitForFunction(()=>PEP_APP.getState().importReport.source==='saved');assert((await summary.innerText()).includes('courses and EC unchanged'));ok('Reopening the updated draft confirms unchanged courses and EC');
 const moved=JSON.parse(fs.readFileSync(path.join(__dirname,'compatibility/fixtures/0.5.0-additional-constrained.json'))).draft;await page.evaluate(s=>PEP_APP.load(s),moved);assert((await summary.innerText()).includes('126 EC previously → 126 EC after import.'));assert((await summary.innerText()).includes('Constrained electives'));assert((await summary.innerText()).includes('General electives'));ok('Category moves are visible even when the total stays the same');
 saved.courseSnapshot.rows[0].name='<img src=x onerror=alert(1)>';await page.evaluate(s=>PEP_APP.load(s),saved);assert.equal(await summary.locator('img').count(),0);assert((await summary.innerText()).includes('<img src=x onerror=alert(1)>'));ok('Untrusted snapshot labels are displayed as text, never executable markup');
 const unknown={...raw,ruleVersion:'unknown'};await page.evaluate(s=>PEP_APP.load(s),unknown);assert((await summary.innerText()).includes('previous total unavailable'));ok('Unknown historical totals are explained instead of guessed');
 await page.setViewportSize({width:390,height:844});await page.evaluate(s=>PEP_APP.load(s),raw);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(qa,'import-change-mobile.png'),fullPage:true});ok('Import comparison fits a narrow mobile screen');
 assert.deepEqual(errors,[]);ok('No browser script errors');
 fs.writeFileSync(path.join(__dirname,'compatibility-browser-test-results.json'),JSON.stringify({count:results.length,results,date:new Date().toISOString()},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
