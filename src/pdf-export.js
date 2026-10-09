/* Offline, selectable-text PDF export with native AcroForm fields.
   Layout is derived from the same printable DOM as the browser print route. */
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
 function table(el){const all=[...el.rows];if(!all.length)return;const cols=all[0].cells.length;const course=!!el.querySelector('th.code'),label=!!el.querySelector('.label');const ws=cols===3?[width*.67,width*.23,width*.10]:label?[width*.30,width*.70]:[width*.50,width*.50];const size=8.7,lh=11.2,pad=5;const heads=all.filter(r=>r.parentElement.tagName==='THEAD');
  function layout(row){const isHead=row.parentElement.tagName==='THEAD',f=isHead?bold:font;const ls=[...row.cells].map((c,i)=>lines(txt(c),isHead?8.2:size,ws[i]-pad*2,f));return {ls,isHead,f,h:Math.max(...ls.map(a=>a.length))*lh+6};}
  function rowDraw(data,start=0,count=null){const countLines=count??Math.max(...data.ls.map(a=>a.length));const h=countLines*lh+6;let x=M;data.ls.forEach((ls,i)=>{page.drawRectangle({x,y:y-h,width:ws[i],height:h,color:data.isHead?pale:white,borderColor:line,borderWidth:.5});ls.slice(start,start+countLines).forEach((s,j)=>{const sz=data.isHead?8.2:size;const offset=cols===3&&i===2?ws[i]-pad-data.f.widthOfTextAtSize(s,sz):pad;draw(s,x+offset,y-3.5-j*lh,sz,data.f,data.isHead?navy:ink);});x+=ws[i];});y-=h;}
  const headerData=heads.map(layout);
  for(const row of all){const data=layout(row);if(data.h<=H-M-bottom-40){if(y-data.h<bottom){newPage();if(!data.isHead)headerData.forEach(d=>rowDraw(d));}rowDraw(data);}else{let start=0,total=Math.max(...data.ls.map(a=>a.length));while(start<total){if(y-30<bottom){newPage();headerData.forEach(d=>rowDraw(d));}const count=Math.min(total-start,Math.floor((y-bottom-6)/lh));if(count<1){newPage();continue;}rowDraw(data,start,count);start+=count;}}}y-=5;
 }
 function label(text,x,top,required=false,size=8.5){draw(text,x,top,size,bold,navy);if(required)draw(' *',x+bold.widthOfTextAtSize(text,size),top,size,bold,red);}
 function field(name,text,value='',height=32,multiline=false){ensure(height+23);label(text,M,y,name==='admissions_decision');y-=15;addField(name,value,M,y,width,height,multiline);y-=height+8;}
 function addField(name,value,x,top,w,h,multiline=false){const f=form.createTextField(name);if(multiline)f.enableMultiline();f.setText(clean(value));f.disableScrolling();f.addToPage(page,{x,y:top-h,width:w,height:h,borderWidth:.6,borderColor:line,backgroundColor:rgb(.975,.985,1),textColor:ink,font});f.setFontSize(0);if(name==='admissions_decision'||name==='coordinator_date'||boardRequired&&['admissions_name','admissions_date'].includes(name))f.enableRequired();return f;}
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
  ensure(142);const col=width/2;
  ['Admissions Board','Specialization coordinator preapproval'].forEach((s,i)=>{const x=M+i*col;page.drawRectangle({x,y:y-22,width:col,height:22,color:pale,borderColor:line,borderWidth:.5});draw(s,x+5,y-5,9,bold,navy);});
  y-=22;const top=y;
  for(let i=0;i<2;i++){const x=M+i*col,required=i===1||boardRequired;page.drawRectangle({x,y:top-107,width:col,height:107,borderColor:line,borderWidth:.5});label('Name:',x+5,top-6,i===0&&boardRequired,8);label('Signature:',x+5,top-32,required,8);label('Date:',x+5,top-87,required,8);}
  addField('admissions_name','',M+44,top-4,col-51,23);draw(root.PEPRules.coordinatorName(state),M+col+38,top-7,8);
  addField('admissions_date','',M+44,top-82,col-51,21);addField('coordinator_date','',M+col+44,top-82,col-51,21);
  signatureField('admissions_signature','Admissions Board digital signature',M+5,top-45,col-10,33,boardRequired,['admissions_decision','admissions_reference','admissions_name','admissions_date'].filter(n=>form.getFieldMaybe(n)));
  signatureField('coordinator_signature','Specialization coordinator digital signature',M+col+5,top-45,col-10,33,true,null);
  y=top-115;
 }
 function total(el){ensure(42);const h=31,w=246,x=W-M-w;page.drawRectangle({x,y:y-h,width:w,height:h,color:pale,borderColor:blue,borderWidth:.8});page.drawRectangle({x:W-M-4,y:y-h,width:4,height:h,color:blue});const value=el.querySelector('strong').textContent;const right=W-M-13;draw('Total programme',x+10,y-10,10,bold,navy);draw(value,right-bold.widthOfTextAtSize(value,17),y-6,17,bold,navy);y-=h+9;}
 function walk(el){
  if(el.dataset?.pdfField==='admissions_decision'){const val=state.principles.explanation||'';const h=Math.max(62,Math.min(170,lines(val,9,width-12).length*12+14));field('admissions_decision','Admissions Board decision on Principles courses',val,h,true);return;}
  if(el.dataset?.pdfField==='admissions_reference'){field('admissions_reference','Decision reference, if applicable',state.principles.reference||'',24);return;}
  if(el.classList?.contains('print-total')){total(el);return;}
  if(el.classList?.contains('signature-table')){signatures();return;}
  if(el.tagName==='TABLE'){table(el);return;}
  if(el.tagName==='H2'){heading(txt(el),true);return;}
  if(el.tagName==='H3'){const next=el.nextElementSibling;if(next?.tagName==='TABLE'&&next.rows.length<=4)ensure(24+next.rows.length*20);heading(txt(el));return;}
  if(el.tagName==='P'&&el.classList.contains('print-checks')&&txt(el).startsWith('*')){ensure(24);const top=y;paragraph(txt(el),{size:8});draw('*',M,top,8,font,red);return;}
  if(el.tagName==='P'){paragraph(txt(el),{size:el.classList.contains('print-checks')?8:9,color:el.classList.contains('print-total')?navy:ink});return;}
  if(el.tagName==='STRONG'){paragraph(txt(el),{size:8.5,color:navy});return;}
  if(el.classList?.contains('print-approval'))ensure(220);
  if(el.classList?.contains('print-project'))ensure(70);
  for(const child of el.children)walk(child);
 }
 newPage();const image=await doc.embedJpg(logo);const dims=image.scaleToFit(123,60);page.drawImage(image,{x:W-M-dims.width,y:y-dims.height,width:dims.width,height:dims.height});
 for(const l of lines('Personal Education Plan - Cohort 2026',16,width-140,bold)){draw(l,M,y,16,bold,blue);y-=20;}
 draw('Master Drug Discovery Sciences',M,y,11,font,navy);y-=22;
 const a=link('VU Study Guide - TER',root.PEPRules.DATA.links.studyGuide,M,y);link('DDS Canvas community',root.PEPRules.DATA.links.canvas,M+a+18,y);y-=24;
 page.drawLine({start:{x:M,y},end:{x:W-M,y},thickness:1.3,color:blue});y-=14;
 for(const el of source.children){if(el.classList.contains('print-head'))continue;walk(el);}
 const pages=doc.getPages();pages.forEach((p,i)=>{p.drawText('DDS - Cohort 2026',{x:M,y:23,size:8,font,color:muted});p.drawText((i+1)+' / '+pages.length,{x:W-M-28,y:23,size:8,font,color:muted});});
 form.updateFieldAppearances(font);
 // Shared font resources and zero-size default appearances let PDF readers resize
 // new board text to fit, while retaining the generated appearances for existing text.
 form.acroForm.dict.set(PDFName.of('DR'),doc.context.obj({Font:{'NotoSans-Regular':font.ref}}));
 form.acroForm.dict.set(PDFName.of('SigFlags'),PDFNumber.of(3));
 for(const f of form.getFields())if(f instanceof root.PDFLib.PDFTextField)f.setFontSize(f.getName()==='admissions_decision'?0:9);
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
 doc.setTitle('DDS PEP '+state.student.number+' - version '+state.revision);doc.setAuthor('Vrije Universiteit Amsterdam - Drug Discovery Sciences');doc.setSubject('Proposed curriculum; editable Admissions Board decision fields');doc.setLanguage('en-GB');
 return doc.save({updateFieldAppearances:false});
}
root.PEP_PDF={create};
})(window);
