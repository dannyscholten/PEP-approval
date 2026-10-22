// These fixtures were exported by the actual PEP Builder 1.4.5 application.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),R=require('./rules.js');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'draft-fixtures/builder-1.4.5.json')));
for(const {name,expectedTotal,draft} of fixture.cases){
 const s=R.importDraft(draft),v=R.evaluate(s);
 assert.equal(v.total,expectedTotal,name+' credits');
 assert.deepEqual(R.courseSnapshot(s).rows,draft.courseSnapshot.rows,name+' course rows');
 for(const key of ['constrained','electives','educationElectives'])assert.deepEqual(s[key],draft[key]||[],name+' '+key);
 assert.equal(s.major.route,draft.major.route,name+' major route');
 assert.equal(s.minor.enabled,draft.minor.enabled,name+' minor');
 assert.equal(s.notes,draft.notes||'',name+' explanation');
 assert(!Object.hasOwn(s,'plannerTransfer'),name+' does not copy timing metadata into the approval form');
 assert.equal(draft.plannerTransfer.targetFormVersion,R.DATA.appVersion,name+' form version');
 assert.equal(draft.plannerTransfer.targetRuleVersion,R.DATA.ruleVersion,name+' rule version');
 assert.equal(draft.plannerTransfer.targetSchemaVersion,s.schemaVersion,name+' schema version');
 if(R.isEducation(s)){assert.equal(v.ddsTotal,60,name+' DDS component');assert.equal(v.educationTotal,60,name+' Education component');}
 if(name.startsWith('actual-build-')){assert.equal(v.canExport,false,name+' still needs personal and host details for approval');assert(v.errors.length>0);}
 const roundTrip=R.importDraft(R.exportDraft(s));assert.equal(R.evaluate(roundTrip).total,expectedTotal);assert.equal(roundTrip.notes,s.notes);
 console.log('PASS Builder import: '+name+' ('+v.total+' EC)');
}
assert.throws(()=>R.importDraft({kind:'DDS-planner-design-draft',schemaVersion:2}),/Export for approval/);
const text=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');assert(text.includes('https://dannyscholten.github.io/PEP-builder/'));assert(!text.includes('dds-curriculum-planner/'));
console.log('PASS saved-build guidance, current Builder link, unchanged approval gates and clean notes across '+fixture.cases.length+' real exports.');
