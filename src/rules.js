/* Pure validation functions. No browser, storage or network dependency. */
(function(root){
'use strict';
const DATA = typeof module !== 'undefined' && module.exports ? require('./catalogue.json') : root.PEP_DATA;
const map = Object.fromEntries(DATA.courses.map(c=>[c.code,c]));
const clean = v => typeof v==='string' ? v.trim() : '';
const norm = v => clean(v).toLowerCase().replace(/[^a-z0-9]/g,'');
const canonicalCode = code => Object.entries(DATA.aliases).find(([alias])=>norm(alias)===norm(code))?.[1] || code;
const round = v => Math.round(v*100)/100;
const unique = a => [...new Set(a)];
function fresh(){return {
 schemaVersion:2,ruleVersion:DATA.ruleVersion,id:'PEP-'+Date.now().toString(36).toUpperCase(),
 student:{firstName:'',lastName:'',number:'',cohort:2026,specialization:'',path:'',education:'',institution:'',degree:'',graduated:''},
 principles:{override:false,required:[]},constrained:[],electives:[],educationElectives:[],courseDetails:{},
 major:{route:'',hostStatus:'',host:'',topicStatus:'',topic:''},
 minor:{enabled:false,hostStatus:'',host:'',topicStatus:'',topic:''},
 literature:{enabled:false,code:'',hostStatus:'',host:'',topicStatus:'',topic:''},
 custom:[],exceptions:{},notes:'',coordinator:''
};}
function principleCodes(s){return !['WO','HBO'].includes(s.student.education) ? [] : s.principles.override ? s.principles.required : DATA.principles;}
function principlesStatementRequired(s){return ['WO','HBO'].includes(s.student.education)&&DATA.principles.some(c=>!principleCodes(s).includes(c));}
function coordinatorName(s){return DATA.coordinators[s.student.specialization]||'';}
function isEducation(s){return s.student.specialization==='EDU';}
function educationSpec(){return DATA.specializations.EDU;}
function availableDDS(s){return isEducation(s)?[...educationSpec().ddsElectives,...educationSpec().constrained]:DATA.courses.filter(c=>['general','alpha'].includes(c.category)).map(c=>c.code);}
function needsPath(s){const spec=DATA.specializations[s.student.specialization];return !!spec&&Object.keys(spec.paths).length>0&&!spec.paths[s.student.path];}
function isFixedCourse(s,code){return requiredCodes(s).includes(code)||s.constrained.includes(code)||isEducation(s)&&code==='XM_0200';}
function clearFixedCourseDetails(s){for(const code of Object.keys(s.courseDetails))if(isFixedCourse(s,code))delete s.courseDetails[code];}
// Preserve draft selections; known own constrained courses use their dedicated section.
// An old outside-VU entry stays visible in electives until the student corrects it.
function organiseConstrained(s){
 if(isEducation(s))return;
 const own=DATA.specializations[s.student.specialization]?.constrained||[];
 const moving=s.electives.filter(c=>own.includes(c)&&!requiredCodes(s).includes(c)&&!s.courseDetails[c]?.outside);
 s.constrained=[...s.constrained,...moving];s.electives=s.electives.filter(c=>!moving.includes(c));
}
function selectPath(s,path){
 const pool=unique([...s.constrained,...s.electives]);s.student.path=path;
 s.constrained=pathCodes(s);s.electives=pool.filter(c=>!s.constrained.includes(c)&&!requiredCodes(s).includes(c));
 organiseConstrained(s);clearFixedCourseDetails(s);
}
function pathCodes(s){let spec=DATA.specializations[s.student.specialization];return spec ? (spec.paths[s.student.path]||[]).filter(c=>map[c]) : [];}
function requiredCodes(s){let spec=DATA.specializations[s.student.specialization];return spec ? [...principleCodes(s),...(isEducation(s)?[]:['XM_0196']),...spec.compulsory,...(spec.educationCompulsory||[])] : [];}
function components(s){
 let rows=[];
 const add=(code,section)=>{const c=map[code];if(c) rows.push({...c,id:code,section});};
 requiredCodes(s).forEach(c=>add(c,DATA.principles.includes(c)?'Principles courses':educationSpec().educationCompulsory.includes(c)?'Education compulsory courses':'Compulsory courses'));
 s.constrained.forEach(c=>add(c,'Constrained electives'));
 if(isEducation(s))rows.push({...map.XM_0200,id:'XM_0200',section:'Major research project',project:true});
 else if(DATA.specializations[s.student.specialization]&&['single','split'].includes(s.major.route)){
  const project={section:'Major research project',source:'TER 10.2, p. 20',project:true};
  if(s.major.route==='split')rows.push(
   {...project,id:'MAJOR_PART1',code:'XM_0207',name:'Major Research Project DDS — Part 1',ec:18},
   {...project,id:'MAJOR_PART2',code:'to be announced',name:'Major Research Project DDS — Part 2',ec:30}
  );else rows.push({...project,id:'MAJOR',code:'to be announced',name:'Major Research Project DDS',ec:48});
 }
 if(s.minor.enabled)rows.push({id:'MINOR',code:'to be announced',name:'Minor Research Project DDS',ec:30,section:'Minor research project',project:true});
 if(!isEducation(s)&&s.literature.enabled){const code='XM_0198';if(map[code])rows.push({...map[code],id:code,section:'Literature thesis',project:true});}
 s.electives.forEach(c=>add(c,map[c]?.category==='alpha'?'Alpha/gamma electives':'General electives'));
 (s.educationElectives||[]).forEach(c=>add(c,'Education electives'));
 s.custom.forEach(c=>rows.push({...c,id:c.uid,ec:Number(c.ec)||0,section:isEducation(s)&&c.component==='education'?'Education electives':c.category==='alpha'?'Alpha/gamma electives':c.category==='general'?'General electives':'Electives awaiting classification',custom:true}));
 return rows.map(r=>({...r,component:['Education compulsory courses','Education electives'].includes(r.section)?'education':'dds'}));
}
function evaluate(s){
 const issues=[];const spec=DATA.specializations[s.student.specialization],edu=isEducation(s);const rows=components(s);
 const add=(id,severity,message,source='',section='review',exceptionable=false)=>{
  const request=s.exceptions[id];
  if(exceptionable&&clean(request?.reason))issues.push({id,severity:'review',message,source,section,exceptionable,requested:true,reason:clean(request.reason),reference:clean(request.reference)});
  else issues.push({id,severity,message,source,section,exceptionable,requested:false});
 };
 const err=(id,msg,section)=>add(id,'error',msg,'',section);
 if(s.student.cohort!==2026)err('cohort','This version supports the 2026 intake only.','personal');
 for(const [key,label] of [['firstName','First name'],['lastName','Last name'],['number','Student number'],['education','Previous education'],['institution','Previous institution'],['degree','Previous degree'],['graduated','Graduation date']])if(!clean(s.student[key]))err('student_'+key,label+' is required.','personal');
 if(!spec)err('specialization','Choose your specialisation.','personal');
 if(!['','VU_FW','WO','HBO'].includes(s.student.education))err('education','Previous education is not recognized.','personal');
 if(spec&&Object.keys(spec.paths).length&&!spec.paths[s.student.path])err('path','Choose a path within your specialisation.','personal');
 if(spec&&!Object.keys(spec.paths).length&&s.student.path)err('badd_path',(edu?'Education':'BADD')+' does not have paths. Clear the path selection.','personal');
 if(s.student.graduated&&!/^\d{4}-\d{2}-\d{2}$/.test(s.student.graduated))err('graduated_format','Use a complete graduation date.','personal');
 const defaults=s.student.education==='VU_FW'?[]:DATA.principles;
 const p=principleCodes(s);
 if(p.some(c=>!DATA.principles.includes(c))||unique(p).length!==p.length)err('principles_invalid','The Principles selection contains an invalid or duplicate course.','principles');
 const differs=norm([...p].sort().join())!==norm([...defaults].sort().join());
 if(principlesStatementRequired(s)){
  add('principles_decision','review','The Admissions Board must confirm and sign the Principles decision in the downloaded PDF. If its decision changes courses, update the PEP and recalculate credits before signing.','Admissions decision; PEP statement section','principles');
 }
 const allCodes=[...requiredCodes(s),...s.constrained,...s.electives,...s.educationElectives,...(edu?['XM_0200',...(s.literature.enabled?[s.literature.code]:[])]:[])];
 const invalid=allCodes.filter(c=>!map[c]);if(invalid.length)err('unknown_codes','Unrecognized catalogue code(s): '+invalid.join(', ')+'. Add unlisted courses through the custom-course form.','electives');
 if(s.constrained.some(c=>!spec?.constrained.includes(c)))err('invalid_constrained','A selected constrained elective is not in the list for this specialisation.','constrained');
 if(s.electives.some(c=>DATA.principles.includes(c)||c==='XM_0196'||c==='XM_0198'))err('reserved_elective','Principles, RAS and Literature Thesis must use their dedicated programme sections.','electives');
 if(!edu&&s.electives.some(c=>spec?.constrained.includes(c)))err('own_constrained_section','Courses from your own constrained-electives list belong in Constrained electives. For an imported outside-VU entry, first remove it from General electives and select the fixed VU course in Constrained electives.','constrained');
 if(s.electives.some(c=>spec?.compulsory.includes(c)))err('wrong_section','A compulsory course from your own specialisation belongs in the compulsory section.','electives');
 if(spec){
  const selected=unique(s.constrained.filter(c=>spec.constrained.includes(c)));
  if(edu&&selected.length!==1)err('education_constrained','Choose exactly one of the two Education constrained courses (6 EC). Put the other in DDS electives if needed.','constrained');
  if(!edu&&selected.length<2)add('constrained_min','error','Select at least two distinct courses from the six constrained electives for your specialisation (minimum 12 EC).','TER 10.2','constrained',true);
  const missing=pathCodes(s).filter(c=>!s.constrained.includes(c));
  if(missing.length)add('path_courses','error','Your path requires: '+missing.map(c=>map[c].name).join('; ')+'.','Specialisation FAQ, constrained choices','constrained',true);
  if(!edu&&!['single','split'].includes(s.major.route))err('major_route','Choose the registration route for your 48 EC major project.','projects');
 }
 for(const [key,title] of [['major','Major project'],['minor','Minor project'],['literature','Literature thesis']]){
  if(edu&&key!=='major')continue;
  if(key!=='major'&&!s[key].enabled)continue;
  if(key==='major'&&!spec)continue;
  for(const field of ['host','topic']){
   if(!(field==='host'?['proposed','confirmed']:['unknown','proposed','confirmed']).includes(s[key][field+'Status']))err(key+'_'+field+'_status','Choose a status for '+title.toLowerCase()+' '+field+'.','projects');
   if(['proposed','confirmed'].includes(s[key][field+'Status'])&&!clean(s[key][field]))err(key+'_'+field,title+' '+field+' needs details.'+(field==='topic'?' You may choose “Not yet known” for the topic.':''),'projects');
  }
 }
 if(!edu&&s.minor.enabled&&s.literature.enabled)add('three_projects','warning','Combining a major research project, minor research project and literature thesis is strongly discouraged: this combination cannot be completed within the two-year programme and will result in study delay.','Programme clarification, 9 October 2026','projects');
 const existing=rows.filter(r=>!r.custom).map(r=>({key:r.id,code:canonicalCode(r.code),name:norm(r.name)}));
 const usedIds=[];
 for(const c of s.custom){
  const prefix='custom_'+c.uid;
  if(!clean(c.uid)||usedIds.includes(c.uid))err(prefix+'_id','Custom courses have missing or repeated identifiers. Remove the duplicate row.','electives');usedIds.push(c.uid);
  for(const [key,label] of [['name','Course title'],['institution','Institution']])if(!clean(c[key]))err(prefix+'_'+key,label+' is required for each custom course.','electives');
  if(!clean(c.code))err(prefix+'_code','A course code is required for each unlisted course.','electives');
  if(!(Number(c.ec)>0&&Number(c.ec)<=120&&Number.isFinite(Number(c.ec)))||Math.abs(Number(c.ec)*100-Math.round(Number(c.ec)*100))>0.00001)err(prefix+'_ec','Custom-course credits must be a positive number with at most two decimals (maximum 120).','electives');
  if(!clean(c.level)||['unknown','other','not yet known'].includes(clean(c.level).toLowerCase()))err(prefix+'_level','Select a level for '+(c.name||'the custom course')+'.','electives');
  if(!/^https?:\/\/\S+$/i.test(c.url))err(prefix+'_url','Provide a public http(s) course-information link for '+(c.name||'the custom course')+'.','electives');
  if(!(edu?['general','education']:['general','alpha']).includes(c.category))err(prefix+'_category','Choose a classification for '+(c.name||'the custom course')+'.','electives');
  add(prefix+'_review','review',edu?'Individual Examination Board approval is required for '+(c.name||'the unlisted course')+' in the '+(c.component==='education'?'Education':'DDS')+' component. Assess its suitability, level and classification.':'Assess the suitability, academic level and elective classification of '+(c.name||'the unlisted course')+' as part of the PEP review.','TER 10.3.2','electives');
  const canonical=canonicalCode(c.code);
  const match=DATA.courses.find(r=>norm(r.code)===norm(canonical)||norm(r.name)===norm(c.name));
  if(match&&(!edu||c.component==='dds'&&availableDDS(s).includes(match.code)||c.component==='education'&&educationSpec().educationElectives.includes(match.code)||educationSpec().educationCompulsory.includes(match.code)||educationSpec().literature.includes(match.code)||requiredCodes(s).includes(match.code)||match.code==='XM_0200'))err(prefix+'_catalogue','This custom course matches '+match.name+' ('+match.code+'). Select it from the catalogue so its official EC and classification are used.','electives');
  if(existing.some(r=>(clean(c.code)&&norm(r.code)===norm(canonical))||(norm(c.name)&&r.name===norm(c.name))))err(prefix+'_duplicate','Duplicate course: '+c.name+'. A course can count only once.','electives');
  if(edu){
   if(!['dds','education'].includes(c.component))err(prefix+'_component','Choose DDS or Education for each unlisted course.','electives');
   if(c.component==='dds'&&c.category!=='general'||c.component==='education'&&c.category!=='education')err(prefix+'_category','The unlisted-course category must match its selected component; alpha/gamma courses are not allowed in the DDS component.','electives');
   if(match&&match.category==='alpha'&&c.component==='dds')err(prefix+'_alpha','Alpha/gamma courses are not allowed in the DDS component.','electives');
   if(match&&Number(c.ec)!==match.ec)err(prefix+'_credits','Use the official '+match.ec+' EC for '+match.name+'.','electives');
  }
  existing.push({key:c.uid,code:canonical,name:norm(c.name)});
  if((s.student.specialization==='BADD'&&norm(c.name)==='bioanalyticalsciences')||((s.student.path==='SMC'||allCodes.includes('XM_0110'))&&norm(c.name)==='syntheticorganicchemistry'))add(prefix+'_overlap','error',c.name+' overlaps with a required/selected course and is excluded by the specialisation FAQ.','FAQ Appendix B','electives',true);
 }
 const duplicate=unique(allCodes.filter((c,i)=>allCodes.indexOf(c)!==i));if(duplicate.length)err('duplicates','Courses counted more than once: '+duplicate.join(', ')+'.','electives');
 for(const r of rows.filter(r=>!r.custom)){
  const det=s.courseDetails[r.id];if(!det)continue;
  if(det.outside&&isFixedCourse(s,r.id)){err('fixed_outside_'+r.id,r.name+' is a fixed VU course and cannot be recorded as taken outside VU.','compulsory');continue;}
  if(det.outside){if(!clean(det.institution))err('outside_'+r.id,'Name the institution providing '+r.name+'.','electives');if(!/^https?:\/\/\S+$/i.test(det.url))err('outside_url_'+r.id,'Add a public course-information link for '+r.name+' outside VU.','electives');}
 }
 const total=round(rows.reduce((a,r)=>a+r.ec,0));
 const alpha=round(rows.filter(r=>r.section==='Alpha/gamma electives').reduce((a,r)=>a+r.ec,0));
 const unclassified=round(rows.filter(r=>r.section==='Electives awaiting classification').reduce((a,r)=>a+r.ec,0));
 const ddsTotal=round(rows.filter(r=>r.component==='dds').reduce((n,r)=>n+r.ec,0)),educationTotal=round(rows.filter(r=>r.component==='education').reduce((n,r)=>n+r.ec,0));
 if(edu){
  for(const [component,value] of [['DDS',ddsTotal],['Education',educationTotal]])if(value<60)err('education_'+component.toLowerCase()+'_total',component+' component totals '+value+' EC; at least 60 EC are required. Credits in the other component cannot cover this shortfall.','electives');
  if(s.minor.enabled)err('education_minor','Minor research projects are not allowed for Education. Remove the minor; no exception is available.','projects');
  if(s.literature.enabled)err('education_literature','Literature theses are not allowed for Education.','projects');
  if(s.electives.some(c=>educationSpec().literature.includes(c)||c==='XM_0198')||s.custom.some(c=>educationSpec().literature.includes(canonicalCode(c.code))||canonicalCode(c.code)==='XM_0198'||norm(c.name).includes('literaturethesis')))err('education_literature_course','Literature theses cannot be included as electives or unlisted courses for Education. Remove the course.','electives');
  if(s.electives.some(c=>!availableDDS(s).includes(c)))err('education_dds_catalogue','A selected DDS elective is outside the Education-specific list. Remove it; propose eligible alternatives through Add an unlisted course for individual approval.','electives');
  if(s.electives.some(c=>map[c]?.category==='alpha')||s.custom.some(c=>c.component==='dds'&&c.category==='alpha'))err('education_alpha','Alpha/gamma courses are not allowed in the DDS component of Education.','electives');
  if(s.educationElectives.some(c=>!educationSpec().educationElectives.includes(c)))err('education_elective_catalogue','Select Education electives from the recommended list, or propose an unlisted course for approval.','electives');
  if(s.educationElectives.includes('O_MWRLDBS_1')!==s.educationElectives.includes('O_MWRLDBS_2'))err('education_world','Wereldburgerschap and Wereldburgerschap deel 2 must be selected together.','electives');
 }else if(s.educationElectives.length||s.electives.some(c=>map[c]?.category?.startsWith('education')))err('education_only','Education-specific courses require the Education specialisation. Remove them from this plan.','electives');
 if(total<120)add('under120','error','The programme is '+round(120-total)+' EC short of 120. Complete the proposed curriculum.','TER 9.1','review');
 if(total>120){
  const removable=rows.filter(r=>!r.project&&!requiredCodes(s).includes(r.id)&&total-r.ec>=120&&(!edu||(r.component==='dds'?ddsTotal:educationTotal)-r.ec>=60)&&!pathCodes(s).includes(r.code)&&(r.section!=='Constrained electives'||unique(s.constrained.filter(c=>spec?.constrained.includes(c)&&c!==r.code)).length>=(edu?1:2)));
  const detail=removable.length?' Removing '+removable.map(r=>r.name).join('; ')+' would still leave at least 120 EC without removing a required core/path course. Explain why this is nevertheless necessary.':' Removing any single removable elective would bring the total below 120 EC. Explain why the excess is needed to fulfil the requirements; this arithmetic check does not grant approval.';
  add('over120','error','The programme totals '+total+' EC ('+round(total-120)+' above 120). You may obtain more than 120 EC, but credits above 120 EC are extracurricular and passed extracurricular courses appear as such on the diploma supplement. Planned extracurricular courses should not be included in this PEP.'+detail,'Programme clarification, 9 October 2026','review',true);
 }
 if(!edu&&alpha>18)add('alpha_limit','error','Alpha/gamma electives total '+alpha+' EC; the maximum is 18 EC.','Specialisation FAQs','electives',true);
 const unresolved=issues.filter(i=>i.severity==='error');const review=issues.filter(i=>i.severity==='review');const warnings=issues.filter(i=>i.severity==='warning');
 const activeIds=new Set(issues.map(i=>i.id));
 const inactiveRequests=Object.entries(s.exceptions).filter(([id,e])=>clean(e.reason)&&!activeIds.has(id)).map(([id])=>id);
 const courseIssues=issues.filter(i=>i.id!=='principles_decision'&&(['compulsory','principles','constrained'].includes(i.section)||['specialization','path','badd_path','education','student_education','cohort'].includes(i.id)));
 const duplicateProblem=issues.some(i=>i.id.includes('duplicate')||i.id.endsWith('_catalogue'));
 const checkedFor=spec ? (edu?'Education':s.student.specialization)+(s.student.path?' — '+(DATA.paths[s.student.path]||s.student.path):needsPath(s)?' — select a path':'') : 'Choose your specialisation and, where applicable, path';
 const checks=[
  {id:'total',label:'Programme credit total',description:'The proposed programme must contain 120 EC. Credits above 120 EC need explicit justification and pre-approval by the specialisation coordinator and approval by the examination board.',value:total+' / 120 EC',status:total===120?'pass':total>120&&clean(s.exceptions.over120?.reason)?'review':'error'},
  {id:'courses',label:'Compulsory and path courses',description:edu?'Checks fixed DDS and Education courses and one 6 EC constrained choice.':'Checks compulsory courses, minimum of two constrained electives and required path courses.',value:spec?'Checked for '+checkedFor:checkedFor,status:courseIssues.some(i=>i.severity==='error')?'error':courseIssues.some(i=>i.severity==='review')?'review':'pass'},
  {id:'constrained',label:edu?'One of two constrained courses is selected':'Minimum of 2 out of 6 courses is selected',description:edu?'Choose one 6 EC course; the other may use DDS elective space.':'Select at least two distinct courses from your specialisation’s six constrained electives.',value:spec?unique(s.constrained.filter(c=>spec.constrained.includes(c))).length+(edu?' / 2 courses selected (choose 1)':' / 6 courses selected'):'Choose your specialisation',status:!spec?'error':issues.find(i=>i.id==='constrained_min')?.severity==='review'?'review':issues.some(i=>['constrained_min','education_constrained','invalid_constrained','own_constrained_section'].includes(i.id))?'error':'pass'},
  {id:'path',label:'Required path courses are selected',description:'The mandatory courses for the selected path must be included in Constrained electives.',value:!spec?'Choose your specialisation':needsPath(s)?'Choose a path':pathCodes(s).length?pathCodes(s).map(c=>map[c].name).join('; '):'No path-specific courses apply',status:!spec||needsPath(s)?'error':issues.find(i=>i.id==='path_courses')?.severity==='review'?'review':issues.some(i=>i.id==='path_courses')?'error':'pass'},
  {id:'alpha',label:'Alpha/gamma elective limit',description:'Alpha/gamma courses use the shared elective space, up to a maximum of 18 EC.',value:alpha+' / 18 EC'+(unclassified?' + '+unclassified+' EC unclassified':''),status:issues.some(i=>i.id.endsWith('_category'))?'error':alpha>18?(clean(s.exceptions.alpha_limit?.reason)?'review':'error'):unclassified?'review':'pass'},
  {id:'duplicates',label:'Courses are not counted twice',description:'Each selected course or project contributes its EC only once.',value:duplicateProblem?'A duplicate or catalogue match needs correction':'No duplicate courses found',status:duplicateProblem?'error':'pass'}
 ];
 if(edu){
  const alphaCheck=checks.find(c=>c.id==='alpha');alphaCheck.label='No alpha/gamma courses in DDS';alphaCheck.description='DDS elective space cannot contain alpha/gamma courses; Education courses use the Education component.';alphaCheck.value=issues.some(i=>i.id==='education_alpha'||i.id.endsWith('_alpha'))?'Remove alpha/gamma DDS courses':'No alpha/gamma DDS courses selected';alphaCheck.status=issues.some(i=>i.id==='education_alpha'||i.id.endsWith('_alpha'))?'error':'pass';
  for(const [id,label,value] of [['dds','DDS component',ddsTotal],['education','Education component',educationTotal]])checks.splice(1,0,{id:id+'_total',label,description:'60 EC required in this component. Excess needs justification, coordinator preapproval and Examination Board approval; shortfalls cannot be offset.',value:value+' / 60 EC',status:value<60?'error':value>60?clean(s.exceptions.over120?.reason)?'review':'error':'pass'});
 }
 return {rows,total,ddsTotal,educationTotal,alpha,unclassified,issues,errors:unresolved,review,warnings,inactiveRequests,checks,canExport:unresolved.length===0,principles:p,principlesDeviation:s.principles.override&&differs,principlesStatementRequired:principlesStatementRequired(s),status:unresolved.length?'Incomplete — action needed':review.length?'Ready for review — decisions required':'Ready for coordinator review'};
}
// Saved snapshots describe the old plan only. Never use them to approve a plan
// or calculate current credits; current components/evaluate remain authoritative.
function courseSnapshot(s){
 const rows=components(s).map(r=>({id:r.id,code:r.code,name:r.name,ec:r.ec,section:r.section}));
 return {snapshotVersion:1,rows,total:round(rows.reduce((n,r)=>n+r.ec,0))};
}
function exportDraft(s){
 const saved={...s,principles:{override:s.principles.override,required:[...s.principles.required]},ruleVersion:DATA.ruleVersion,formVersion:DATA.appVersion,savedAt:new Date().toISOString(),courseSnapshot:courseSnapshot(s)};
 delete saved.importNotice;delete saved.importReport;
 return saved;
}
function importDraft(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.schemaVersion!==2)throw Error('This is not a supported DDS PEP draft (format version 2).');
 if(raw.student?.cohort!==2026)throw Error('This form supports the 2026 intake only.');
 let base=fresh();const textKeys=['id','notes'];for(const k of textKeys)if(typeof raw[k]==='string')base[k]=raw[k].slice(0,k==='notes'?10000:200);
 const obj=(target,source)=>{if(!source||typeof source!=='object'||Array.isArray(source))return;for(const k of Object.keys(target)){if(typeof target[k]==='string'&&typeof source[k]==='string')target[k]=source[k].slice(0,10000);if(typeof target[k]==='boolean')target[k]=source[k]===true;}};
 obj(base.student,raw.student);obj(base.principles,raw.principles);for(const k of (isEducation(base)?['major','minor']:['major','minor','literature']))obj(base[k],raw[k]);
 for(const k of ['constrained','electives','educationElectives']){if(raw[k]!==undefined&&!Array.isArray(raw[k]))throw Error('Invalid '+k+' list.');base[k]=(raw[k]||[]).filter(v=>typeof v==='string').slice(0,200);}
 base.principles.required=Array.isArray(raw.principles?.required)?raw.principles.required.filter(v=>typeof v==='string').slice(0,4):[];
 if(raw.custom!==undefined&&!Array.isArray(raw.custom))throw Error('Invalid custom course list.');
 base.custom=(raw.custom||[]).slice(0,100).map(x=>{if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Invalid custom course.');const c={uid:'',name:'',code:'',institution:'',ec:'',level:'',category:'',url:''};if(isEducation(base))c.component='';obj(c,x);c.ec=typeof x.ec==='number'?String(x.ec):c.ec;return c;});
 for(const k of ['exceptions','courseDetails']){
  if(!raw[k]||typeof raw[k]!=='object'||Array.isArray(raw[k]))continue;
  for(const [key,value] of Object.entries(raw[k]).slice(0,300)){
   if(['__proto__','prototype','constructor'].includes(key)||!value||typeof value!=='object')continue;
   const template=k==='exceptions'?{reason:'',reference:''}:{outside:false,institution:'',url:''};obj(template,value);base[k][key]=template;
  }
 }
 if(base.student.education==='VU_FW')base.principles={override:false,required:[]};
 clearFixedCourseDetails(base);
 base.coordinator=coordinatorName(base);
 return base;
}
const api={DATA,map,fresh,isEducation,educationSpec,availableDDS,coordinatorName,needsPath,isFixedCourse,clearFixedCourseDetails,organiseConstrained,principleCodes,principlesStatementRequired,selectPath,pathCodes,requiredCodes,components,evaluate,importDraft,exportDraft,courseSnapshot,round};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PEPRules=api;
})(typeof globalThis!=='undefined'?globalThis:this);
