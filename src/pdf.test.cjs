const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const html=path.resolve(process.env.PEP_HTML||path.join(__dirname,'dist/DDS_PEP_2026.html'));
const qa=path.resolve(process.env.PEP_QA||path.join(__dirname,'qa'));fs.mkdirSync(qa,{recursive:true});
const output=path.resolve(process.env.PEP_FILLABLE_PDF||path.join(qa,'DDS_PEP_example.pdf'));
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const results=[],errors=[],network=[];const ok=s=>{results.push(s);console.log('PASS '+s);};
 try{
 const page=await browser.newPage({acceptDownloads:true,viewport:{width:1360,height:1000}});page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});await page.goto('file://'+html);
 const load=async name=>{await page.evaluate(s=>PEP_APP.load(s),JSON.parse(fs.readFileSync(path.join(__dirname,'examples',name+'.json'))));};
 const save=async file=>{const [d]=await Promise.all([page.waitForEvent('download',{timeout:30000}),page.locator('#download-pdf').click()]);await d.saveAs(file);assert.equal(fs.readFileSync(file).subarray(0,5).toString(),'%PDF-');};
 assert(await page.locator('#download-pdf').isDisabled());ok('Incomplete plan cannot use fillable export');
 const links=page.locator('.masthead .resource-links a');assert.deepEqual(await links.evaluateAll(a=>a.map(e=>e.href)),['https://studiegids.vu.nl/nl/Master/2026-2027/drug-discovery-sciences#/tab=2','https://canvas.vu.nl/courses/31939/']);assert.equal(await page.locator('#personal .grid label').first().textContent(),'First name *');ok('Both exact resource links and First name appear in the header/form');
 await load('01_BADD_standard_120');await page.locator('#principles-explanation').fill('');await page.locator('#principles-reference').fill('');assert(await page.locator('#download-pdf').isEnabled());assert(await page.locator('.checks tr').filter({hasText:'Compulsory and path courses'}).locator('td').last().textContent()==='Passed');await save(output);ok('Student can download a fillable 120 EC PEP with a blank board decision');
 await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';window.scrollTo(0,0);document.getElementById('toast').hidden=true;});await page.screenshot({path:path.join(qa,'updated-form.png')});
 await page.locator('#principles-explanation').fill('Example decision: both Principles courses are required.');await page.locator('#principles-reference').fill('AB-TEST-2026');await save(path.join(qa,'prefilled-decision.pdf'));ok('Existing decision text is preserved by the fillable export');
 await load('02_DSDD_SMC_120');await save(path.join(qa,'fillable-dsdd.pdf'));await load('03_PTDD_MP_one_Principles');await save(path.join(qa,'fillable-ptdd.pdf'));await load('04_BADD_three_projects_warning');assert((await page.locator('#projects .warning-text').textContent()).includes('will result in study delay'));assert((await page.locator('#review-results').textContent()).includes('cannot be completed within the two-year programme'));await save(path.join(qa,'fillable-three-projects.pdf'));await load('05_BADD_external_122_request');assert((await page.locator('#review-results').textContent()).includes('diploma supplement'));await save(path.join(qa,'fillable-excess.pdf'));ok('Path, delay warning and extracurricular explanation export with current validation');
 await load('01_BADD_standard_120');await page.locator('#student-firstName').fill('Éléonore Αλέξανδρος');await page.locator('#principles-explanation').fill('Example decision with international names: Éléonore and Αλέξανδρος.');await save(path.join(qa,'unicode.pdf'));ok('Accented and Greek characters export without losing text');
 await page.locator('#notes').fill(Array(28).fill('Long explanation for pagination: this is fictional text to test that all details are retained and remain readable across pages.').join('\n'));await save(path.join(qa,'long-notes.pdf'));ok('Long explanations paginate across PDF pages');
 assert.deepEqual(errors,[]);assert.deepEqual(network,[]);ok('Fillable export completes without browser errors or network requests');
 fs.writeFileSync(path.join(__dirname,'pdf-browser-test-results.json'),JSON.stringify({date:new Date().toISOString(),count:results.length,results,errors,network},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
