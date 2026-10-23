/* Offline, selectable-text PDF export with native AcroForm fields.
   Layout is derived from the prepared PDF document DOM. */
(function(root){
'use strict';
async function create(source,state,logo){
 const {PDFDocument,StandardFonts,rgb,PDFName,PDFString,PDFNumber,PDFArray,PDFDict}=root.PDFLib;
 const doc=await PDFDocument.create();doc.registerFontkit(root.fontkit);
 const bytes=Uint8Array.from(atob(root.PEP_PDF_FONT),c=>c.charCodeAt(0));
 // Keep the full font so the board can enter characters not present in this PEP.
 const font=await doc.embedFont(bytes),bold=await doc.embedFont(StandardFonts.HelveticaBold),form=doc.getForm();
 const supported=new Set(font.getCharacterSet());
 const boardRequired=root.PEPRules.principlesStatementRequired(state);const red=rgb(.706,.137,.094);
 const blue=rgb(0,0.467,0.702),navy=rgb(0,0.23,0.392),ink=rgb(0.125,0.169,0.2),muted=rgb(0.35,0.40,0.45),line=rgb(0.71,0.75,0.78),pale=rgb(0.94,0.96,0.98),white=rgb(1,1,1);
 const W=595.28,H=841.89,M=40,width=W-2*M,bottom=42;let page,y;
 const txt=el=>{let out='';for(const n of el.childNodes)out+=n.nodeType===3?n.textContent:n.nodeName==='BR'?'\n':txt(n);return out.replace(/\r/g,'').trim();};
 function clean(s){const t=String(s??'').replace(/\t/g,'    ').replace(/\r/g,'');for(const ch of t)if(ch!=='\n'&&!supported.has(ch.codePointAt(0)))throw Error('A character in the form is not supported by the PDF font ('+ch+').');return t;}
 function newPage(){page=doc.addPage([W,H]);y=H-M;}
 function ensure(h){if(y-h<bottom)newPage();}
 function lines(text,size=9,max=width,f=font){const result=[];for(const para of clean(text).split('\n')){if(!para){result.push('');continue;}let current='';for(const word of para.split(/\s+/)){const candidate=current?current+' '+word:word;if(f.widthOfTextAtSize(candidate,size)<=max){current=candidate;continue;}if(current){result.push(current);current='';}let part='';for(const ch of word){if(f.widthOfTextAtSize(part+ch,size)>max&&part){result.push(part);part='';}part+=ch;}current=part;}if(current)result.push(current);}return result;}
 function draw(text,x,top,size=9,f=font,color=ink){page.drawText(clean(text),{x,y:top-size,size,font:f,color});}
 function paragraph(text,{size=9,color=ink,space=3}={}){const l=lines(text,size);const lh=size*1.35;for(const row of l){ensure(lh);draw(row,M,y,size,font,color);y-=lh;}y-=space;}
 function heading(text,major=false){ensure(major?65:45);if(major){page.drawRectangle({x:M,y:y-19,width,height:19,color:blue});draw(text,M+6,y-4,10.5,bold,white);y-=24;}else{y-=4;draw(text,M,y,10,bold,navy);y-=16;}}
 function link(text,url,x,top){const size=8,w=font.widthOfTextAtSize(text,size);draw(text,x,top,size,font,blue);page.drawLine({start:{x,y:top-size-1},end:{x:x+w,y:top-size-1},thickness:.35,color:blue});const annot=doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Link',Rect:[x,top-12,x+w,top+2],Border:[0,0,0],A:{Type:'Action',S:'URI',URI:PDFString.of(url)}}));page.node.addAnnot(annot);return w;}
 function table(el){const all=[...el.rows];if(!all.length)return;const cols=all[0].cells.length;const course=!!el.querySelector('th.code'),label=!!el.querySelector('.label');const ws=cols===4?[width*.54,width*.25,width*.10,width*.11]:cols===3?[width*.67,width*.23,width*.10]:label?[width*.30,width*.70]:[width*.50,width*.50];const size=8.7,lh=11.2,pad=5;const heads=all.filter(r=>r.parentElement.tagName==='THEAD');
  function layout(row){const isHead=row.parentElement.tagName==='THEAD',f=isHead?bold:font;let reviewLines=null;const ls=[...row.cells].map((c,i)=>{const label=c.querySelector('.unlisted-review-label');if(i===0&&label){const name=lines(c.firstChild.textContent,size,ws[i]-pad*2,f),review=lines(txt(label),size,ws[i]-pad*2,f),details=c.querySelector('small');reviewLines=[name.length,name.length+review.length];return [...name,...review,...(details?lines(txt(details),size,ws[i]-pad*2,f):[])];}return lines(txt(c),isHead?8.2:size,ws[i]-pad*2,f);});return {ls,reviewLines,isHead,f,h:Math.max(...ls.map(a=>a.length))*lh+6};}
  function rowDraw(data,start=0,count=null){const countLines=count??Math.max(...data.ls.map(a=>a.length));const h=countLines*lh+6;let x=M;data.ls.forEach((ls,i)=>{page.drawRectangle({x,y:y-h,width:ws[i],height:h,color:data.isHead?pale:white,borderColor:line,borderWidth:.5});ls.slice(start,start+countLines).forEach((s,j)=>{const sz=data.isHead?8.2:size;const offset=course&&i===cols-1?ws[i]-pad-data.f.widthOfTextAtSize(s,sz):pad;const reviewLabel=i===0&&data.reviewLines&&start+j>=data.reviewLines[0]&&start+j<data.reviewLines[1];if(reviewLabel)page.drawRectangle({x:x+offset-1,y:y-3.5-j*lh-sz-1,width:Math.min(ws[i]-pad*2,data.f.widthOfTextAtSize(s,sz)+2),height:sz+2,color:rgb(1,.95,.94),borderColor:red,borderWidth:.35});draw(s,x+offset,y-3.5-j*lh,sz,data.f,data.isHead?navy:reviewLabel?red:ink);});x+=ws[i];});y-=h;}
  const headerData=heads.map(layout);
  for(const row of all){const data=layout(row);if(data.h<=H-M-bottom-40){if(y-data.h<bottom){newPage();if(!data.isHead)headerData.forEach(d=>rowDraw(d));}rowDraw(data);}else{let start=0,total=Math.max(...data.ls.map(a=>a.length));while(start<total){if(y-30<bottom){newPage();headerData.forEach(d=>rowDraw(d));}const count=Math.min(total-start,Math.floor((y-bottom-6)/lh));if(count<1){newPage();continue;}rowDraw(data,start,count);start+=count;}}}y-=5;
 }
 function checks(el){
  const ws=[width*.52,width*.32,width*.16],pad=5,lh=10.5;
  const statusColour=s=>s==='pass'?rgb(.141,.412,.263):s==='review'?rgb(.55,.31,0):red;
  function header(){ensure(20);let x=M;['Check','Details','Status'].forEach((t,i)=>{page.drawRectangle({x,y:y-19,width:ws[i],height:19,color:pale,borderColor:line,borderWidth:.5});draw(t,x+pad,y-5,8,bold,navy);x+=ws[i];});y-=19;}
  header();
  for(const row of el.querySelectorAll('tbody tr')){
   const title=lines(txt(row.cells[0].querySelector('strong')),8.5,ws[0]-pad*2,bold),desc=lines(txt(row.cells[0].querySelector('small')),8,ws[0]-pad*2),value=lines(txt(row.cells[1]),8.5,ws[1]-pad*2),status=lines(txt(row.cells[2]),8.5,ws[2]-pad*2,bold);
   const h=Math.max(title.length+desc.length,value.length,status.length)*lh+8;
   if(y-h<bottom){newPage();header();}
   let x=M;ws.forEach(w=>{page.drawRectangle({x,y:y-h,width:w,height:h,color:white,borderColor:line,borderWidth:.5});x+=w;});
   title.forEach((t,j)=>draw(t,M+pad,y-4-j*lh,8.5,bold,navy));desc.forEach((t,j)=>draw(t,M+pad,y-4-(title.length+j)*lh,8,font,muted));
   value.forEach((t,j)=>draw(t,M+ws[0]+pad,y-4-j*lh,8.5,font,ink));status.forEach((t,j)=>draw(t,M+ws[0]+ws[1]+pad,y-4-j*lh,8.5,bold,statusColour(row.dataset.status)));y-=h;
  }y-=6;
 }
 function reviewItem(el){ensure(65);paragraph('DECISION / VERIFICATION REQUIRED',{size:8.5,color:rgb(.55,.31,0)});for(const child of el.children)if(child.tagName==='P')walk(child);}
 function label(text,x,top,required=false,size=8.5){draw(text,x,top,size,bold,navy);if(required)draw(' *',x+bold.widthOfTextAtSize(text,size),top,size,bold,red);}
 function field(name,text,value='',height=32,multiline=false){ensure(height+23);label(text,M,y,['admissions_decision','coordinator_exception_comment'].includes(name));y-=15;addField(name,value,M,y,width,height,multiline);y-=height+8;}
 function addField(name,value,x,top,w,h,multiline=false){const f=form.createTextField(name);if(multiline)f.enableMultiline();f.setText(clean(value));f.disableScrolling();f.addToPage(page,{x,y:top-h,width:w,height:h,borderWidth:.6,borderColor:line,backgroundColor:rgb(.975,.985,1),textColor:ink,font});f.setFontSize(9);if(name==='admissions_decision'||name==='coordinator_exception_comment'||name==='coordinator_date'||boardRequired&&['admissions_name','admissions_date'].includes(name))f.enableRequired();return f;}
 function signatureField(name,description,x,top,w,h,required,lockFields){
  const lock=doc.context.obj(lockFields?{Type:'SigFieldLock',Action:'Include',Fields:lockFields.map(PDFString.of)}:{Type:'SigFieldLock',Action:'All'});
  const field=doc.context.obj({FT:'Sig',T:PDFString.of(name),TU:PDFString.of(description),Ff:required?2:0,Kids:[],Lock:lock});
  const fieldRef=doc.context.register(field);
  const appearance=doc.context.flateStream('q 0.95 0.975 1 rg 0 0 '+w+' '+h+' re f 0 0.467 0.702 RG 0.6 w 0.3 0.3 '+(w-.6)+' '+(h-.6)+' re S BT /Helv 9 Tf 0 0.23 0.392 rg 8 '+(h/2-3)+' Td (Click to digitally sign) Tj ET Q',{Type:'XObject',Subtype:'Form',BBox:[0,0,w,h],Resources:{Font:{Helv:bold.ref}}});
  const apRef=doc.context.register(appearance);
  const widget=doc.context.obj({Type:'Annot',Subtype:'Widget',Parent:fieldRef,P:page.ref,Rect:[x,top-h,x+w,top],F:4,AP:{N:apRef},MK:{BC:[0,.467,.702],BG:[.95,.975,1]},BS:{W:.6,S:'S'}});
  const widgetRef=doc.context.register(widget);field.lookup(PDFName.of('Kids')).push(widgetRef);page.node.addAnnot(widgetRef);form.acroForm.addField(fieldRef);
 }
 function signatures(){
  const columns=boardRequired?['Admissions Board for Principles courses','Specialisation coordinator preapproval for PEP']:['Specialisation coordinator preapproval for PEP'];
  const col=width/columns.length,headerLines=columns.map(t=>lines(t,9,col-10,bold)),headerHeight=Math.max(...headerLines.map(l=>l.length))*12+10;
  ensure(headerHeight+125);
  columns.forEach((s,i)=>{const x=M+i*col;page.drawRectangle({x,y:y-headerHeight,width:col,height:headerHeight,color:pale,borderColor:line,borderWidth:.5});headerLines[i].forEach((t,j)=>draw(t,x+5,y-5-j*12,9,bold,navy));});
  y-=headerHeight;const top=y;
  columns.forEach((s,i)=>{const x=M+i*col,isBoard=boardRequired&&i===0;page.drawRectangle({x,y:top-107,width:col,height:107,borderColor:line,borderWidth:.5});label('Name:',x+5,top-6,isBoard,8);label('Signature:',x+5,top-32,true,8);label('Date:',x+5,top-87,true,8);
   if(isBoard){addField('admissions_name','',x+44,top-4,col-51,23);addField('admissions_date','',x+44,top-82,col-51,21);signatureField('admissions_signature','Admissions Board for Principles courses digital signature',x+5,top-45,col-10,33,true,['admissions_decision','admissions_name','admissions_date']);}
   else{draw(root.PEPRules.coordinatorName(state),x+38,top-7,8);addField('coordinator_date','',x+44,top-82,col-51,21);signatureField('coordinator_signature','Specialisation coordinator digital signature',x+5,top-45,col-10,33,true,null);}
  });
  y=top-115;
 }
 function total(el){ensure(42);const h=31,w=246,x=W-M-w;page.drawRectangle({x,y:y-h,width:w,height:h,color:pale,borderColor:blue,borderWidth:.8});page.drawRectangle({x:W-M-4,y:y-h,width:4,height:h,color:blue});const value=el.querySelector('strong').textContent;const right=W-M-13;draw('Total credit count of PEP',x+10,y-10,9,bold,navy);draw(value,right-bold.widthOfTextAtSize(value,13),y-8,13,bold,navy);y-=h+9;}
 function walk(el){
  if(el.classList?.contains('print-submission')){ensure(70);const a=el.querySelector('a');paragraph(txt(el).replace(a?txt(a):'', '').trim(),{size:8,space:4});if(a){ensure(16);link(a.href,a.href,M,y);y-=19;}return;}
  if(el.dataset?.pdfField==='coordinator_exception_comment'){field('coordinator_exception_comment','Coordinator explanation for the listed exceptions','',100,true);return;}
  if(el.dataset?.pdfField==='admissions_decision'){const val='';const h=92;field('admissions_decision','Admission board decision (to be filled in by admission board)',val,h,true);return;}
  if(el.classList?.contains('print-total')){total(el);return;}
  if(el.classList?.contains('signature-table')){signatures();return;}
  if(el.classList?.contains('print-check-table')){checks(el);return;}
  if(el.dataset?.reviewId){reviewItem(el);return;}
  if(el.tagName==='TABLE'){table(el);return;}
  if(el.tagName==='H2'){if(root.PEPRules.isEducation(state)&&txt(el).includes('Review and'))ensure(570);if(txt(el).includes('Research projects')||root.PEPRules.isEducation(state)&&txt(el).includes('Major research project'))ensure(190);heading(txt(el),true);return;}
  if(el.tagName==='H3'){if(txt(el)==='Specialisation coordinator explanation for exceptions')ensure(210);if(['Major research project','Minor research project','Literature thesis'].includes(txt(el)))ensure(txt(el)==='Major research project'?170:120);const next=el.nextElementSibling;if(next?.tagName==='TABLE'&&next.rows.length<=4)ensure(24+next.rows.length*20);heading(txt(el));return;}
  if(el.tagName==='P'&&el.classList.contains('print-checks')&&txt(el).startsWith('*')){ensure(24);const top=y;paragraph(txt(el),{size:8,color:red});return;}
  if(el.tagName==='P'){paragraph(txt(el),{size:el.classList.contains('print-checks')?8:9,color:el.classList.contains('warning-text')||el.classList.contains('mandatory-note')?red:el.classList.contains('exception-justification')?rgb(0,.373,.569):ink});return;}
  if(el.tagName==='STRONG'){paragraph(txt(el),{size:8.5,color:navy});return;}
  if(el.classList?.contains('print-approval'))ensure(198);
  if(el.classList?.contains('print-project'))ensure(70);
  for(const child of el.children)walk(child);
 }
 newPage();const image=await doc.embedJpg(logo);const dims=image.scaleToFit(123,60);page.drawImage(image,{x:W-M-dims.width,y:y-dims.height,width:dims.width,height:dims.height});
 draw('Master Drug Discovery Sciences',M,y,11,font,navy);y-=20;
 for(const l of lines('Personal Education Plan Approval',16,width-140,bold)){draw(l,M,y,16,bold,blue);y-=20;}
 y-=2;
 const a=link('VU Study Guide - TER',root.PEPRules.DATA.links.studyGuide,M,y);link('DDS Canvas community',root.PEPRules.DATA.links.canvas,M+a+18,y);y-=24;
 page.drawLine({start:{x:M,y},end:{x:W-M,y},thickness:1.3,color:blue});y-=14;
 for(const el of source.children){if(el.classList.contains('print-head'))continue;walk(el);}
 const pages=doc.getPages();pages.forEach((p,i)=>{p.drawText('DDS - Cohort 2026',{x:M,y:23,size:8,font,color:muted});p.drawText((i+1)+' / '+pages.length,{x:W-M-28,y:23,size:8,font,color:muted});});
 form.updateFieldAppearances(font);
 // Shared embedded font resources keep editable text at the surrounding 9 pt size.
 form.acroForm.dict.set(PDFName.of('DR'),doc.context.obj({Font:{'NotoSans-Regular':font.ref}}));
 form.acroForm.dict.set(PDFName.of('SigFlags'),PDFNumber.of(3));
 for(const f of form.getFields())if(f instanceof root.PDFLib.PDFTextField)f.setFontSize(9);
 // Each field has exactly one widget. Store it as one canonical field/widget
 // object, a standard PDF representation that supports incremental form updates
 // and signature validation consistently across PDF processors.
 for(const f of form.getFields()){
  const dict=f.acroField.dict,kids=dict.lookupMaybe(PDFName.of('Kids'),PDFArray);if(!kids||kids.size()!==1)continue;
  const widgetRef=kids.get(0),widget=doc.context.lookup(widgetRef,PDFDict);
  for(const [key,value] of widget.entries())if(key.toString()!=='/Parent')dict.set(key,value);
  dict.delete(PDFName.of('Kids'));
  for(const p of doc.getPages()){const annotations=p.node.Annots();if(!annotations)continue;for(let i=0;i<annotations.size();i++)if(annotations.get(i).toString()===widgetRef.toString())annotations.set(i,f.ref);}
  doc.context.delete(widgetRef);
 }
 doc.setTitle('DDS PEP '+state.student.number+' - '+new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Amsterdam'}));doc.setAuthor('Vrije Universiteit Amsterdam - Drug Discovery Sciences');doc.setSubject('Proposed curriculum; editable Admissions Board decision fields');doc.setLanguage('en-GB');
 return doc.save({updateFieldAppearances:false});
}
root.PEP_PDF={create};
})(window);
