const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const html=path.resolve(process.env.PEP_HTML||path.join(__dirname,'dist/DDS_PEP_2026.html'));
const qa=path.resolve(process.env.PEP_QA||path.join(__dirname,'qa'));fs.mkdirSync(qa,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PEP_CHROME?{executablePath:process.env.PEP_CHROME}:{channel:'chrome'})});
 try{
 const page=await browser.newPage({viewport:{width:1360,height:1000},acceptDownloads:true});const errors=[],results=[];
 page.on('pageerror',e=>errors.push(e.message));const ok=n=>{results.push(n);console.log('PASS '+n);};
 await page.goto('file://'+html);await page.locator('#welcome-start').click();await page.waitForFunction(()=>window.PEP_APP);
 const raw=JSON.parse(fs.readFileSync(path.join(__dirname,'examples/01_BADD_standard_120.json')));
 const input=path.join(qa,'current-draft.json');fs.writeFileSync(input,JSON.stringify(raw));await page.locator('#file-input').setInputFiles(input);await page.waitForFunction(()=>document.getElementById('file-input').value==='');
 await page.waitForFunction(()=>PEP_APP.getState().student.number==='DEMO-2026');
 assert.equal((await page.evaluate(()=>PEP_APP.evaluate())).total,120);assert.equal(await page.locator('#import-summary').count(),0);assert.equal(await page.evaluate(()=>document.activeElement.id),'student-firstName');ok('Current draft imports and recalculates without historical comparison');
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#save-draft').click()]);const savedPath=path.join(qa,'resaved-draft.json');await download.saveAs(savedPath);const saved=JSON.parse(fs.readFileSync(savedPath));assert.equal(saved.formVersion,require('./catalogue.json').appVersion);assert(!saved.importReport);
 await page.locator('#file-input').setInputFiles(savedPath);await page.waitForFunction(()=>document.getElementById('file-input').value==='');assert.equal((await page.evaluate(()=>PEP_APP.evaluate())).total,120);ok('Exported draft can be imported again');
 raw.student.firstName='<img src=x onerror=alert(1)>';await page.evaluate(s=>PEP_APP.load(s),raw);assert.equal(await page.locator('#student-firstName').inputValue(),raw.student.firstName);assert.equal(await page.locator('#personal img').count(),0);ok('Imported text is escaped');
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));ok('Imported form fits a narrow mobile screen');
 await page.locator('#file-input').setInputFiles(path.join(__dirname,'draft-fixtures/planner-transfer.json'));await page.waitForFunction(()=>document.getElementById('file-input').value==='');await page.waitForFunction(()=>PEP_APP.getState().notes.startsWith('Curriculum planner overview'));const transferred=await page.evaluate(()=>({s:PEP_APP.getState(),v:PEP_APP.evaluate()}));assert.equal(transferred.v.total,120);assert.equal(transferred.s.student.specialization,'BADD');assert.equal(transferred.s.major.route,'split');assert(transferred.s.minor.enabled);assert(transferred.s.notes.includes('Year 1'));assert.equal(await page.getByRole('button',{name:'Open draft',exact:true}).count(),2);ok('Planner PEP export imports with courses, credits and planning notes');

 const builderFixtures=JSON.parse(fs.readFileSync(path.join(__dirname,'draft-fixtures/builder-1.4.5.json')));
 for(const name of ['Didactics-126EC','08_Education_120.json major-year-1','03_PTDD_MP_one_Principles.json major-year-2']){
  const test=builderFixtures.cases.find(c=>c.name===name),file=path.join(qa,'synthetic-builder-import.json');fs.writeFileSync(file,JSON.stringify(test.draft));
  await page.locator('#file-input').setInputFiles(file);await page.waitForFunction(()=>document.getElementById('file-input').value==='');await page.waitForFunction(expected=>PEP_APP.evaluate().total===expected.total&&PEP_APP.getState().student.specialization===expected.spec&&PEP_APP.getState().major.route===expected.route,{total:test.expectedTotal,spec:test.draft.student.specialization,route:test.draft.major.route});
  const actual=await page.evaluate(()=>({state:PEP_APP.getState(),result:PEP_APP.evaluate()}));assert.equal(actual.result.total,test.expectedTotal);assert.equal(await page.locator('#notes').inputValue(),test.draft.notes);assert.equal(actual.state.major.route,test.draft.major.route);assert.equal(await page.locator('#toast').innerText(),'PEP Builder selection imported: '+test.expectedTotal+' EC. Complete your personal and project details. All approval checks have been recalculated.');
  if(name==='Didactics-126EC'){assert(actual.result.rows.some(r=>r.code==='XM_0197'));assert(actual.result.errors.some(i=>i.id==='over120'));assert.equal(await page.locator('#download-pdf').isDisabled(),true);}
  ok('Current Builder UI import: '+name);
 }
 const beforeWrongFile=await page.evaluate(()=>PEP_APP.getState()),wrongFile=path.join(qa,'synthetic-builder-save.json');fs.writeFileSync(wrongFile,JSON.stringify({kind:'DDS-planner-design-draft',schemaVersion:2}));await page.locator('#file-input').setInputFiles(wrongFile);await page.waitForFunction(()=>document.getElementById('file-input').value==='');await page.waitForFunction(()=>document.getElementById('toast').textContent.includes('Export for approval'));assert((await page.locator('#toast').innerText()).includes('Export for approval'));assert.deepEqual(await page.evaluate(()=>PEP_APP.getState()),beforeWrongFile);ok('Saved build rejected with approval-export guidance and no state change');
 assert.deepEqual(errors,[]);ok('No browser script errors');
 fs.writeFileSync(path.join(__dirname,'import-browser-test-results.json'),JSON.stringify({count:results.length,results,date:new Date().toISOString()},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
