const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const R=require('./rules.js');const results=[];
const test=(name,fn)=>{fn();results.push(name);console.log('PASS '+name);};
const base=()=>JSON.parse(fs.readFileSync(path.join(__dirname,'draft-fixtures/0.9.0-standard.json')));
test('First student-release baseline restores selections and credits',()=>{const raw=base(),s=R.importDraft(raw);assert.equal(R.evaluate(s).total,120);assert.deepEqual(s.constrained,raw.constrained);assert.deepEqual(s.importReport.changes,[]);});
test('Older unknown host statuses clear with a notice while topics and credits remain unchanged',()=>{const raw=base(),s=R.importDraft(raw);for(const key of ['major','minor','literature']){assert.equal(s[key].hostStatus,'');assert.equal(s[key].topicStatus,raw[key].topicStatus);assert.equal(s[key].host,raw[key].host);}assert(s.importNotice.includes('no longer available for project hosts'));assert.equal(R.evaluate(s).total,120);assert(!R.evaluate(s).canExport);assert.deepEqual(s.importReport.changes,[]);});
test('Save/reopen includes stable snapshot and form version, without stale import messages',()=>{
 const saved=R.exportDraft(base());assert.equal(saved.schemaVersion,2);assert.equal(saved.formVersion,R.DATA.appVersion);assert(saved.courseSnapshot.rows.length);assert(!('importReport' in saved));assert(!('importNotice' in saved));
 const s=R.importDraft(saved);assert.equal(s.importReport.source,'saved');assert.deepEqual(s.importReport.changes,[]);assert.equal(s.importReport.beforeTotal,s.importReport.afterTotal);
});
test('A future catalogue EC change produces an exact before/after comparison',()=>{
 const saved=R.exportDraft(base()),data=structuredClone(R.DATA);data.courses.find(c=>c.code==='XM_0136').ec=8;
 const ctx={PEP_DATA:data};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'rules.js'),'utf8'),ctx);
 const s=ctx.PEPRules.importDraft(saved);assert.equal(s.importReport.beforeTotal,120);assert.equal(s.importReport.afterTotal,122);assert(s.importReport.changes.some(c=>c.before?.code==='XM_0136'&&c.before.ec===6&&c.after.ec===8));
});
test('Course removal cannot silently retain credits or disappear without a warning',()=>{
 const s=base();s.electives.push('X_405052');const saved=R.exportDraft(s),data=structuredClone(R.DATA);data.courses=data.courses.filter(c=>c.code!=='X_405052');
 const ctx={PEP_DATA:data};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'rules.js'),'utf8'),ctx);
 const imported=ctx.PEPRules.importDraft(saved);assert(imported.electives.includes('X_405052'));assert(imported.importReport.changes.some(c=>c.type==='removed'&&c.before.code==='X_405052'));assert(!ctx.PEPRules.evaluate(imported).canExport);
});

test('New snapshots work even when the older rule version is not in the form bundle',()=>{
 const saved=R.exportDraft(base());saved.ruleVersion='future-release';const s=R.importDraft(saved);assert.equal(s.importReport.source,'saved');assert.equal(s.importReport.beforeTotal,120);
});
test('Unknown or malformed snapshots never invent a previous total',()=>{
 const raw=structuredClone(base());raw.ruleVersion='unknown';raw.courseSnapshot={snapshotVersion:1,rows:[{ec:'invalid'}],total:999};const s=R.importDraft(raw);assert.equal(s.importReport.beforeTotal,null);assert.equal(s.importReport.afterTotal,120);assert(s.importNotice.includes('unavailable'));
});
test('Saved snapshot credits never override validation or current credit totals',()=>{
 const saved=R.exportDraft(base());saved.courseSnapshot.total=999;saved.courseSnapshot.rows[0].ec=1;const s=R.importDraft(saved);assert.equal(R.evaluate(s).total,120);assert.notEqual(s.importReport.beforeTotal,999);assert(s.importReport.changes.length>0);
});
test('Custom courses, exception requests and project information survive save/reopen',()=>{
 const s=base();s.custom=[{uid:'TEST-CUSTOM',name:'Example external course',code:'EXT500',ec:'5',institution:'Example University',level:'500',category:'alpha',url:'https://example.org/course'}];s.exceptions.over120={reason:'Fictional explanation',reference:'TEST'};s.major.hostStatus='proposed';s.major.host='Example host';
 const restored=R.importDraft(R.exportDraft(s));assert.deepEqual(restored.custom,s.custom);assert.deepEqual(restored.exceptions,s.exceptions);assert.deepEqual(restored.major,s.major);
});



fs.writeFileSync(path.join(__dirname,'compatibility-test-results.json'),JSON.stringify({count:results.length,results,date:new Date().toISOString()},null,2));
