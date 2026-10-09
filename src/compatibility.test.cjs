const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const R=require('./rules.js');const results=[];
const test=(name,fn)=>{fn();results.push(name);console.log('PASS '+name);};
const fixture=name=>JSON.parse(fs.readFileSync(path.join(__dirname,'compatibility/fixtures',name+'.json')));
const base=()=>R.importDraft(fixture('0.5.0-standard').draft);
test('Frozen historical rules, catalogues and drafts have not been overwritten',()=>{
 for(const [file,hash] of Object.entries(require('./compatibility/frozen-sha256.json')))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,file))).digest('hex'),hash,file);
});
for(const name of fs.readdirSync(path.join(__dirname,'compatibility/fixtures'))){
 test('Restores and compares historical draft '+name,()=>{
  const {draft,before}=fixture(name.replace('.json','')),copy=JSON.stringify(draft),s=R.importDraft(draft),report=s.importReport;
  assert.equal(JSON.stringify(draft),copy,'Original input remains untouched');
  assert.equal(report.source,'archived');assert.equal(report.beforeTotal,before.total);assert.equal(report.afterTotal,R.evaluate(s).total);
  assert.equal(s.student.number,draft.student.number);assert.equal(s.notes,draft.notes);assert.equal(s.revision,draft.revision);
  assert.deepEqual([...s.constrained,...s.electives].sort(),[...draft.constrained,...draft.electives].sort());
  if(before.total!==report.afterTotal)assert(report.changes.length>0);
  if(draft.constrained.length>2){assert.equal(s.constrained.length,2);assert(report.changes.some(c=>c.before?.section==='Constrained electives'&&c.after?.section==='General electives'));}
 });
}
test('Save/reopen includes stable snapshot and form version, without stale import messages',()=>{
 const saved=R.exportDraft(base());assert.equal(saved.schemaVersion,1);assert.equal(saved.formVersion,R.DATA.appVersion);assert(saved.courseSnapshot.rows.length);assert(!('importReport' in saved));assert(!('importNotice' in saved));
 const s=R.importDraft(saved);assert.equal(s.importReport.source,'saved');assert.deepEqual(s.importReport.changes,[]);assert.equal(s.importReport.beforeTotal,s.importReport.afterTotal);
});
test('A future catalogue EC change produces an exact before/after comparison',()=>{
 const saved=R.exportDraft(base()),data=structuredClone(R.DATA);data.courses.find(c=>c.code==='XM_0136').ec=8;
 const ctx={PEP_DATA:data,PEP_HISTORY:require('./draft-history.js')};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'rules.js'),'utf8'),ctx);
 const s=ctx.PEPRules.importDraft(saved);assert.equal(s.importReport.beforeTotal,120);assert.equal(s.importReport.afterTotal,122);assert(s.importReport.changes.some(c=>c.before?.code==='XM_0136'&&c.before.ec===6&&c.after.ec===8));
});
test('Course removal cannot silently retain credits or disappear without a warning',()=>{
 const s=base();s.electives.push('X_405052');const saved=R.exportDraft(s),data=structuredClone(R.DATA);data.courses=data.courses.filter(c=>c.code!=='X_405052');
 const ctx={PEP_DATA:data,PEP_HISTORY:require('./draft-history.js')};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'rules.js'),'utf8'),ctx);
 const imported=ctx.PEPRules.importDraft(saved);assert(imported.electives.includes('X_405052'));assert(imported.importReport.changes.some(c=>c.type==='removed'&&c.before.code==='X_405052'));assert(!ctx.PEPRules.evaluate(imported).canExport);
});
test('Changed VU Principles requirement explicitly reports the removed course and EC difference',()=>{
 const s=R.importDraft(fixture('0.4.0-vu-principles').draft);assert.equal(s.importReport.beforeTotal,126);assert.equal(s.importReport.afterTotal,120);assert(s.importReport.changes.some(c=>c.type==='removed'&&c.before.code==='XM_0105'));
});
test('New snapshots work even when the older rule version is not in the legacy archive',()=>{
 const saved=R.exportDraft(base());saved.ruleVersion='future-release';const s=R.importDraft(saved);assert.equal(s.importReport.source,'saved');assert.equal(s.importReport.beforeTotal,120);
});
test('Unknown or malformed historical snapshots never invent a previous total',()=>{
 const raw=structuredClone(base());raw.ruleVersion='unknown';raw.courseSnapshot={snapshotVersion:1,rows:[{ec:'invalid'}],total:999};const s=R.importDraft(raw);assert.equal(s.importReport.beforeTotal,null);assert.equal(s.importReport.afterTotal,120);assert(s.importNotice.includes('could not be reconstructed'));
});
test('Saved snapshot credits never override validation or current credit totals',()=>{
 const saved=R.exportDraft(base());saved.courseSnapshot.total=999;saved.courseSnapshot.rows[0].ec=1;const s=R.importDraft(saved);assert.equal(R.evaluate(s).total,120);assert.notEqual(s.importReport.beforeTotal,999);assert(s.importReport.changes.length>0);
});
test('Custom courses, exception requests and project information survive save/reopen',()=>{
 const s=base();s.custom=[{uid:'TEST-CUSTOM',name:'Example external course',code:'EXT500',ec:'5',institution:'Example University',level:'500',category:'alpha',url:'https://example.org/course'}];s.exceptions.over120={reason:'Fictional explanation',reference:'TEST'};s.major.hostStatus='proposed';s.major.host='Example host';
 const restored=R.importDraft(R.exportDraft(s));assert.deepEqual(restored.custom,s.custom);assert.deepEqual(restored.exceptions,s.exceptions);assert.deepEqual(restored.major,s.major);
});
fs.writeFileSync(path.join(__dirname,'compatibility-test-results.json'),JSON.stringify({count:results.length,results,date:new Date().toISOString()},null,2));
