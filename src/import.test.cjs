const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const R=require('./rules.js');const results=[];
const test=(name,fn)=>{fn();results.push(name);console.log('PASS '+name);};
const base=()=>JSON.parse(fs.readFileSync(path.join(__dirname,'examples/01_BADD_standard_120.json')));
test('Current draft round trip preserves selections and 120 EC',()=>{
 const raw=base(),saved=R.exportDraft(raw),s=R.importDraft(saved);
 assert.equal(R.evaluate(s).total,120);assert.deepEqual(s.constrained,raw.constrained);assert.deepEqual(s.electives,raw.electives);
 assert.equal(saved.formVersion,R.DATA.appVersion);assert(saved.courseSnapshot.rows.length);assert(!('importReport' in s));assert(!('importNotice' in s));
});
test('Imported snapshot credits cannot override actual course credits',()=>{
 const saved=R.exportDraft(base());saved.courseSnapshot.total=999;saved.courseSnapshot.rows[0].ec=1;
 assert.equal(R.evaluate(R.importDraft(saved)).total,120);
});
test('Custom courses, exceptions and project details survive export and import',()=>{
 const s=base();s.custom=[{uid:'TEST-CUSTOM',name:'Example external course',code:'EXT500',ec:'5',institution:'Example University',level:'500',category:'alpha',url:'https://example.org/course'}];s.exceptions.over120={reason:'Fictional explanation',reference:'TEST'};s.major.hostStatus='proposed';s.major.host='Example host';
 const restored=R.importDraft(R.exportDraft(s));assert.deepEqual(restored.custom,s.custom);assert.deepEqual(restored.exceptions,s.exceptions);assert.deepEqual(restored.major,s.major);
});
test('Malformed files, unsupported formats and other cohorts are rejected',()=>{
 for(const raw of [null,[],{}, {...base(),schemaVersion:100},{...base(),student:{...base().student,cohort:2025}},{...base(),electives:'invalid'}])assert.throws(()=>R.importDraft(raw));
});
test('Curriculum planner PEP export retains courses, project route and planning notes',()=>{
 const s=R.importDraft(JSON.parse(fs.readFileSync(path.join(__dirname,'draft-fixtures/planner-transfer.json'))));
 assert.equal(R.evaluate(s).total,120);assert.equal(s.student.specialization,'BADD');assert.equal(s.major.route,'split');assert(s.minor.enabled);assert(s.notes.includes('Year 1'));
});
fs.writeFileSync(path.join(__dirname,'import-test-results.json'),JSON.stringify({count:results.length,results,date:new Date().toISOString()},null,2));
