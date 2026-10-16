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
 const raw=JSON.parse(fs.readFileSync(path.join(__dirname,'examples/01_BADD_standard_120.json')));
 const original=JSON.stringify(raw);raw.courseSnapshot.rows.find(r=>r.code==='XM_0136').ec=8;
 const input=path.join(qa,'saved-draft.json');fs.writeFileSync(input,JSON.stringify(raw));await page.locator('#file-input').setInputFiles(input);
 await page.waitForFunction(()=>PEP_APP.getState().student.number==='DEMO-2026');
 const summary=page.locator('#import-summary');assert((await summary.innerText()).includes('122 EC previously → 120 EC after import.'));assert((await summary.innerText()).includes('ADME'));assert.equal(await page.evaluate(()=>document.activeElement.id),'import-summary');ok('Snapshot comparison focuses named course changes and precise before/after EC totals');
 await page.screenshot({path:path.join(qa,'import-change-desktop.png')});
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#save-draft').click()]);const savedPath=path.join(qa,'resaved-draft.json');await download.saveAs(savedPath);const saved=JSON.parse(fs.readFileSync(savedPath));assert(saved.courseSnapshot);assert.equal(saved.formVersion,require('./catalogue.json').appVersion);assert(!saved.importReport);assert.equal(JSON.parse(fs.readFileSync(input)).courseSnapshot.rows.find(r=>r.code==='XM_0136').ec,8);ok('Saving creates an updated snapshot without modifying the original draft');
 await page.locator('#file-input').setInputFiles(savedPath);await page.waitForFunction(()=>{const report=PEP_APP.getState().importReport;return report?.source==='saved'&&report.beforeTotal===120&&report.changes.length===0;});assert((await summary.innerText()).includes('courses and EC unchanged'));ok('Reopening the updated draft confirms unchanged courses and EC');
 const moved=JSON.parse(original);moved.courseSnapshot.rows.find(r=>r.code==='XM_0136').section='General electives';await page.evaluate(s=>PEP_APP.load(s),moved);assert((await summary.innerText()).includes('120 EC previously → 120 EC after import.'));assert((await summary.innerText()).includes('Constrained electives'));assert((await summary.innerText()).includes('General electives'));ok('Category changes remain visible when totals are unchanged');
 saved.courseSnapshot.rows[0].name='<img src=x onerror=alert(1)>';await page.evaluate(s=>PEP_APP.load(s),saved);assert.equal(await summary.locator('img').count(),0);assert((await summary.innerText()).includes('<img src=x onerror=alert(1)>'));ok('Untrusted snapshot labels are displayed as text, never executable markup');
 const unknown={...raw,courseSnapshot:null};await page.evaluate(s=>PEP_APP.load(s),unknown);assert((await summary.innerText()).includes('previous total unavailable'));ok('Unknown historical totals are explained instead of guessed');
 await page.setViewportSize({width:390,height:844});await page.evaluate(s=>PEP_APP.load(s),raw);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(qa,'import-change-mobile.png'),fullPage:true});ok('Import comparison fits a narrow mobile screen');
 await page.locator('#file-input').setInputFiles(path.join(__dirname,'draft-fixtures/planner-transfer.json'));await page.waitForFunction(()=>PEP_APP.getState().notes.startsWith('Curriculum planner overview'));const transferred=await page.evaluate(()=>({s:PEP_APP.getState(),v:PEP_APP.evaluate()}));assert.equal(transferred.v.total,120);assert.equal(transferred.s.student.specialization,'BADD');assert.equal(transferred.s.major.route,'split');assert(transferred.s.minor.enabled);assert(transferred.s.notes.includes('Year 1'));assert.equal(await page.getByRole('button',{name:'Import draft PEP or Curriculum Planning',exact:true}).count(),2);ok('Real fictional planner PEP export imports through the renamed button with courses, credits and planning notes preserved');
 assert.deepEqual(errors,[]);ok('No browser script errors');
 fs.writeFileSync(path.join(__dirname,'compatibility-browser-test-results.json'),JSON.stringify({count:results.length,results,date:new Date().toISOString()},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
