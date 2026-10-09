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
 schemaVersion:1,ruleVersion:DATA.ruleVersion,id:'PEP-'+Date.now().toString(36).toUpperCase(),revision:1,
 student:{firstName:'',lastName:'',number:'',cohort:2026,specialization:'',path:'',education:'',institution:'',degree:'',graduated:''},
 principles:{override:false,required:[],explanation:'',reference:''},constrained:[],electives:[],omitted:[],courseDetails:{},
 major:{route:'',hostStatus:'unknown',host:'',topicStatus:'unknown',topic:'',area:''},
 minor:{enabled:false,hostStatus:'unknown',host:'',topicStatus:'unknown',topic:''},
 literature:{enabled:false,hostStatus:'unknown',host:'',topicStatus:'unknown',topic:''},
 custom:[],exceptions:{},notes:'',coordinator:'',importNotice:''
};}
function principleCodes(s){return s.principles.override ? s.principles.required : s.student.education==='VU_FW' ? [] : DATA.principles;}
function pathCodes(s){let spec=DATA.specializations[s.student.specialization];return spec ? (spec.paths[s.student.path]||[]).filter(c=>map[c]) : [];}
function requiredCodes(s){let spec=DATA.specializations[s.student.specialization];return spec ? [...principleCodes(s),'XM_0196',...spec.compulsory] : [];}
function components(s){
 let rows=[];
 const add=(code,section)=>{const c=map[code];if(c&&!s.omitted.includes(code)) rows.push({...c,id:code,section});};
 requiredCodes(s).forEach(c=>add(c,'Compulsory courses'));
 s.constrained.forEach(c=>add(c,'Constrained electives'));
 if(DATA.specializations[s.student.specialization]) rows.push({id:'MAJOR',code:s.major.route==='split'?'XM_0207 + code to be announced':'Code to be announced',name:s.major.route==='split'?'Major Research Project DDS — Part 1 (18 EC) + Part 2 (30 EC)':'Major Research Project DDS',ec:48,section:'Major research project',source:'TER 10.2, p. 20',project:true});
 if(s.minor.enabled)rows.push({id:'MINOR',code:'Code to be announced',name:'Minor Research Project DDS',ec:30,section:'Minor research project',project:true});
 if(s.literature.enabled)rows.push({...map.XM_0198,id:'XM_0198',section:'Literature thesis',project:true});
 s.electives.forEach(c=>add(c,map[c]?.category==='alpha'?'Alpha/gamma electives':'General electives'));
 s.custom.forEach(c=>rows.push({...c,id:c.uid,ec:Number(c.ec)||0,section:c.category==='alpha'?'Alpha/gamma electives':c.category==='general'?'General electives':'Electives awaiting classification',custom:true}));
 return rows;
}
function evaluate(s){
 const issues=[];const spec=DATA.specializations[s.student.specialization];const rows=components(s);
 const add=(id,severity,message,source='',section='review',exceptionable=false)=>{
  const request=s.exceptions[id];
  if(exceptionable&&clean(request?.reason))issues.push({id,severity:'review',message,source,section,exceptionable,requested:true,reason:clean(request.reason),reference:clean(request.reference)});
  else issues.push({id,severity,message,source,section,exceptionable,requested:false});
 };
 const err=(id,msg,section)=>add(id,'error',msg,'',section);
 if(s.student.cohort!==2026)err('cohort','This version supports the 2026 intake only.','personal');
 for(const [key,label] of [['firstName','Given name'],['lastName','Last name'],['number','Student number'],['education','Previous education'],['institution','Previous institution'],['degree','Previous degree'],['graduated','Graduation date']])if(!clean(s.student[key]))err('student_'+key,label+' is required.','personal');
 if(!spec)err('specialization','Choose your specialization.','personal');
 if(!['','VU_FW','WO','HBO'].includes(s.student.education))err('education','Previous education is not recognized.','personal');
 if(spec&&Object.keys(spec.paths).length&&!spec.paths[s.student.path])err('path','Choose a path within your specialization.','personal');
 if(spec&&!Object.keys(spec.paths).length&&s.student.path)err('badd_path','BADD does not have paths. Clear the path selection.','personal');
 if(!Number.isInteger(s.revision)||s.revision<1)err('revision','The PEP revision must be a positive whole number.','personal');
 if(s.student.graduated&&!/^\d{4}-\d{2}-\d{2}$/.test(s.student.graduated))err('graduated_format','Use a complete graduation date.','personal');
 const defaults=s.student.education==='VU_FW'?[]:DATA.principles;
 const p=principleCodes(s);
 if(p.some(c=>!DATA.principles.includes(c))||unique(p).length!==p.length)err('principles_invalid','The Principles selection contains an invalid or duplicate course.','principles');
 const differs=norm([...p].sort().join())!==norm([...defaults].sort().join());
 if(s.principles.override&&differs){
  if(!clean(s.principles.explanation))err('principles_statement','Describe the individual Principles decision. The coordinator will arrange the Admissions Board statement and signature.','principles');
  add('principles_decision','review','Principles requirement differs from the default. Admissions Board confirmation is required.','Admissions decision; PEP statement section','principles');
 }
 const allCodes=[...requiredCodes(s).filter(c=>!s.omitted.includes(c)),...s.constrained,...s.electives];
 const invalid=allCodes.filter(c=>!map[c]);if(invalid.length)err('unknown_codes','Unrecognized catalogue code(s): '+invalid.join(', ')+'. Add unlisted courses through the custom-course form.','electives');
 if(s.constrained.some(c=>!spec?.constrained.includes(c)))err('invalid_constrained','A selected constrained elective is not in the list for this specialization.','constrained');
 if(s.electives.some(c=>DATA.principles.includes(c)||c==='XM_0196'||c==='XM_0198'))err('reserved_elective','Principles, RAS and Literature Thesis must use their dedicated programme sections.','electives');
 if(s.electives.some(c=>spec?.compulsory.includes(c)||spec?.constrained.includes(c)))err('wrong_section','A course from your own compulsory or constrained list has been entered as a general elective. Use its dedicated section.','electives');
 for(const c of s.omitted){
  if(!requiredCodes(s).includes(c))err('stale_omission_'+c,'An omitted course no longer belongs to your required programme: '+c+'.','compulsory');
  else add('missing_'+c,'error',map[c].name+' is compulsory and has been omitted.','TER 10.2','compulsory',true);
 }
 if(spec){
  const selected=unique(s.constrained.filter(c=>spec.constrained.includes(c)));
  if(selected.length<2)add('constrained_min','error','Select at least two distinct constrained electives from your specialization (12 EC).','TER 10.2','constrained',true);
  const missing=pathCodes(s).filter(c=>!selected.includes(c));
  if(missing.length)add('path_courses','error','Your path requires: '+missing.map(c=>map[c].name).join('; ')+'.','Specialization FAQ, constrained choices','constrained',true);
  if(!['single','split'].includes(s.major.route))err('major_route','Choose the registration route for your 48 EC major project.','projects');
 }
 for(const [key,title] of [['major','Major project'],['minor','Minor project'],['literature','Literature thesis']]){
  if(key!=='major'&&!s[key].enabled)continue;
  if(key==='major'&&!spec)continue;
  for(const field of ['host','topic']){
   if(!['unknown','proposed','confirmed'].includes(s[key][field+'Status']))err(key+'_'+field+'_status','Choose a status for '+title.toLowerCase()+' '+field+'.','projects');
   if(s[key][field+'Status']!=='unknown'&&!clean(s[key][field]))err(key+'_'+field,title+' '+field+' needs details, or choose “Not yet known”.','projects');
  }
 }
 if(s.minor.enabled&&s.literature.enabled)add('three_projects','warning','Combining a major, minor and literature thesis is strongly discouraged because of the time involved.','Programme clarification, 9 October 2026','projects');
 if(s.student.path==='SMC'&&s.major.area==='radiopharma'&&!allCodes.includes('XM_0069'))add('radiopharma','error','For an intended Synthetic Radiopharmaceutical Chemistry internship, include Advanced Radiopharmaceutical Chemistry.','DSDD FAQ, PDF p. 6','projects',true);
 const existing=rows.filter(r=>!r.custom).map(r=>({key:r.id,code:canonicalCode(r.code),name:norm(r.name)}));
 const usedIds=[];
 for(const c of s.custom){
  const prefix='custom_'+c.uid;
  if(!clean(c.uid)||usedIds.includes(c.uid))err(prefix+'_id','Custom courses have missing or repeated identifiers. Remove the duplicate row.','electives');usedIds.push(c.uid);
  for(const [key,label] of [['name','Course title'],['institution','Institution']])if(!clean(c[key]))err(prefix+'_'+key,label+' is required for each custom course.','electives');
  if(!c.codePending&&!clean(c.code))err(prefix+'_code','Provide a course code, or mark it as not yet available.','electives');
  if(!(Number(c.ec)>0&&Number(c.ec)<=120&&Number.isFinite(Number(c.ec)))||Math.abs(Number(c.ec)*100-Math.round(Number(c.ec)*100))>0.00001)err(prefix+'_ec','Custom-course credits must be a positive number with at most two decimals (maximum 120).','electives');
  if(!['400','500','600','other','unknown'].includes(c.level))err(prefix+'_level','Select a level for '+(c.name||'the custom course')+'.','electives');
  if(!/^https?:\/\/\S+$/i.test(c.url))err(prefix+'_url','Provide a public http(s) course-information link for '+(c.name||'the custom course')+'.','electives');
  if(!['general','alpha','unknown'].includes(c.category))err(prefix+'_category','Choose a classification for '+(c.name||'the custom course')+'.','electives');
  if(!['requested','granted'].includes(c.permission))err(prefix+'_permission','Select the permission status for '+(c.name||'the custom course')+'.','electives');
  if(c.permission==='granted'&&!clean(c.reference))err(prefix+'_reference','Provide the Examination Board decision reference for '+(c.name||'the custom course')+'.','electives');
  if(c.permission==='requested'&&!clean(c.reason))err(prefix+'_reason','Explain why you want to include '+(c.name||'the custom course')+'.','electives');
  add(prefix+'_approval','review',(c.permission==='granted'?'Verify the reported written permission for ':'Written Examination Board permission is requested for ')+(c.name||'an unlisted course')+'.','TER 10.3.2','electives');
  if(c.category==='unknown')add(prefix+'_classification','review','General / alpha-gamma classification is undecided for '+(c.name||'an unlisted course')+'. The 18 EC limit cannot yet be fully confirmed.','FAQ alpha/gamma limit','electives');
  if(['unknown','other'].includes(c.level))add(prefix+'_level_review','review','Academic level needs review for '+(c.name||'an unlisted course')+'.','Course suitability review','electives');
  const canonical=canonicalCode(c.code);
  const match=DATA.courses.find(r=>norm(r.code)===norm(canonical)||norm(r.name)===norm(c.name));
  if(match)err(prefix+'_catalogue','This custom course matches '+match.name+' ('+match.code+'). Select it from the catalogue so its official EC and classification are used.','electives');
  if(existing.some(r=>(clean(c.code)&&norm(r.code)===norm(canonical))||(norm(c.name)&&r.name===norm(c.name))))err(prefix+'_duplicate','Duplicate course: '+c.name+'. A course can count only once.','electives');
  existing.push({key:c.uid,code:canonical,name:norm(c.name)});
  if((s.student.specialization==='BADD'&&norm(c.name)==='bioanalyticalsciences')||((s.student.path==='SMC'||allCodes.includes('XM_0110'))&&norm(c.name)==='syntheticorganicchemistry'))add(prefix+'_overlap','error',c.name+' overlaps with a required/selected course and is excluded by the specialization FAQ.','FAQ Appendix B','electives',true);
 }
 const duplicate=unique(allCodes.filter((c,i)=>allCodes.indexOf(c)!==i));if(duplicate.length)err('duplicates','Courses counted more than once: '+duplicate.join(', ')+'.','electives');
 for(const r of rows.filter(r=>!r.custom)){
  const det=s.courseDetails[r.id];if(!det)continue;
  if(det.outside){if(!clean(det.institution))err('outside_'+r.id,'Name the institution providing '+r.name+'.','electives');if(!/^https?:\/\/\S+$/i.test(det.url))err('outside_url_'+r.id,'Add a public course-information link for '+r.name+' outside VU.','electives');}
  if(det.status&&det.status!=='planned'){
   if(r.project&&r.id==='MAJOR')err('major_exemption','An exemption from the final project is not permitted.','projects');
   else {
    if(!['exemption_requested','exemption_granted'].includes(det.status))err('status_'+r.id,'Unrecognized exemption status for '+r.name+'.','electives');
    if(!clean(det.reference))err('exemption_reference_'+r.id,'Provide the separate exemption request or decision reference for '+r.name+'.','electives');
    add('exemption_'+r.id,'review',(det.status==='exemption_granted'?'Verify reported exemption for ':'Exemption requested separately for ')+r.name+'. Its EC count once in this proposed plan.','TER 3.7; separate exemption procedure','electives');
   }
  }
 }
 const total=round(rows.reduce((a,r)=>a+r.ec,0));
 const alpha=round(rows.filter(r=>r.section==='Alpha/gamma electives').reduce((a,r)=>a+r.ec,0));
 const unclassified=round(rows.filter(r=>r.section==='Electives awaiting classification').reduce((a,r)=>a+r.ec,0));
 if(total<120)add('under120','error','The programme is '+round(120-total)+' EC short of 120. Complete the proposed curriculum.','TER 9.1','review');
 if(total>120){
  const removable=rows.filter(r=>!r.project&&r.section!=='Compulsory courses'&&total-r.ec>=120&&!(r.section==='Constrained electives'&&(s.constrained.length<=2||pathCodes(s).includes(r.code))));
  const detail=removable.length?' Removing '+removable.map(r=>r.name).join('; ')+' would still leave at least 120 EC without removing a required core/path course. Explain why this is nevertheless necessary.':' Removing any single removable elective would bring the total below 120 EC. Explain why the excess is needed to fulfil the requirements; this arithmetic check does not grant approval.';
  add('over120','error','The programme totals '+total+' EC ('+round(total-120)+' above 120).'+detail,'Programme clarification, 9 October 2026','review',true);
 }
 if(alpha>18)add('alpha_limit','error','Alpha/gamma electives total '+alpha+' EC; the maximum is 18 EC.','Specialization FAQs','electives',true);
 const unresolved=issues.filter(i=>i.severity==='error');const review=issues.filter(i=>i.severity==='review');const warnings=issues.filter(i=>i.severity==='warning');
 const activeIds=new Set(issues.map(i=>i.id));
 const inactiveRequests=Object.entries(s.exceptions).filter(([id,e])=>clean(e.reason)&&!activeIds.has(id)).map(([id])=>id);
 const checks=[
  {label:'Programme total',value:total+' / 120 EC',status:total===120?'pass':total>120&&clean(s.exceptions.over120?.reason)?'review':'error'},
  {label:'Compulsory and path courses',value:'Checked for '+(s.student.specialization||'your specialization'),status:issues.some(i=>['compulsory','principles','constrained','personal'].includes(i.section)&&i.severity==='error')?'error':issues.some(i=>['compulsory','principles','constrained'].includes(i.section)&&i.severity==='review')?'review':'pass'},
  {label:'Alpha/gamma electives',value:alpha+' / 18 EC'+(unclassified?' + '+unclassified+' EC unclassified':''),status:alpha>18?(clean(s.exceptions.alpha_limit?.reason)?'review':'error'):unclassified?'review':'pass'},
  {label:'No double counting',value:duplicate.length?'Duplicate selections':'Each selected component counted once',status:issues.some(i=>i.id.includes('duplicate')||i.id.endsWith('_catalogue'))?'error':'pass'}
 ];
 return {rows,total,alpha,unclassified,issues,errors:unresolved,review,warnings,inactiveRequests,checks,canExport:unresolved.length===0,principles:p,principlesDeviation:s.principles.override&&differs,status:unresolved.length?'Incomplete — action needed':review.length?'Ready for review — decisions required':'Ready for coordinator review'};
}
function importDraft(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.schemaVersion!==1)throw Error('This is not a supported DDS PEP draft (format version 1).');
 if(raw.student?.cohort!==2026)throw Error('This form supports the 2026 intake only.');
 let base=fresh();const textKeys=['id','notes','coordinator'];for(const k of textKeys)if(typeof raw[k]==='string')base[k]=raw[k].slice(0,k==='notes'?10000:200);
 const obj=(target,source)=>{if(!source||typeof source!=='object'||Array.isArray(source))return;for(const k of Object.keys(target)){if(typeof target[k]==='string'&&typeof source[k]==='string')target[k]=source[k].slice(0,10000);if(typeof target[k]==='boolean')target[k]=source[k]===true;}};
 obj(base.student,raw.student);obj(base.principles,raw.principles);for(const k of ['major','minor','literature'])obj(base[k],raw[k]);
 for(const k of ['constrained','electives','omitted']){if(raw[k]!==undefined&&!Array.isArray(raw[k]))throw Error('Invalid '+k+' list.');base[k]=(raw[k]||[]).filter(v=>typeof v==='string').slice(0,200);}
 base.principles.required=Array.isArray(raw.principles?.required)?raw.principles.required.filter(v=>typeof v==='string').slice(0,4):[];
 base.revision=Number(raw.revision)||1;
 if(raw.custom!==undefined&&!Array.isArray(raw.custom))throw Error('Invalid custom course list.');
 base.custom=(raw.custom||[]).slice(0,100).map(x=>{const c={uid:'',name:'',code:'',codePending:false,institution:'',ec:'',level:'unknown',category:'unknown',url:'',permission:'requested',reference:'',reason:''};obj(c,x);c.ec=typeof x.ec==='number'?String(x.ec):c.ec;return c;});
 for(const k of ['exceptions','courseDetails']){
  if(!raw[k]||typeof raw[k]!=='object'||Array.isArray(raw[k]))continue;
  for(const [key,value] of Object.entries(raw[k]).slice(0,300)){
   if(['__proto__','prototype','constructor'].includes(key)||!value||typeof value!=='object')continue;
   const template=k==='exceptions'?{reason:'',reference:''}:{status:'planned',reference:'',outside:false,institution:'',url:''};obj(template,value);base[k][key]=template;
  }
 }
 base.importNotice=raw.ruleVersion!==DATA.ruleVersion?'This draft used '+clean(raw.ruleVersion)+'. Checks have been recalculated using '+DATA.ruleVersion+'. Review the results before exporting.':'';
 return base;
}
const api={DATA,map,fresh,principleCodes,pathCodes,requiredCodes,components,evaluate,importDraft,round};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PEPRules=api;
})(typeof globalThis!=='undefined'?globalThis:this);
