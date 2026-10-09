"""Independent checks for exported AcroForms, page widgets, and saved values."""
from pathlib import Path
import sys,json
from datetime import datetime,timezone
from pypdf import PdfReader
import pymupdf
example=Path(sys.argv[1]);qa=Path(sys.argv[2]);results=[]
expected={'admissions_decision','admissions_name','admissions_date','coordinator_date','admissions_signature','coordinator_signature'}
def ok(text): results.append(text);print('PASS',text)
def verify(file,values=None):
    r=PdfReader(file);fields=r.get_fields() or {};assert set(fields)==expected
    refs={v.indirect_reference for v in r.trailer['/Root']['/AcroForm']['/Fields']}
    seen=[]
    for page in r.pages:
        for obj in page.get('/Annots',[]):
            widget=obj.get_object()
            if widget.get('/Subtype')!='/Widget':continue
            parent_ref=widget.raw_get('/Parent') if '/Parent' in widget else obj;assert parent_ref in refs
            parent=parent_ref.get_object();name=parent['/T'];seen.append(name)
            assert not parent.get('/Ff',0)&1
            assert widget.get('/V',parent.get('/V',''))==fields[name].get('/V','')
            if values is not None and name in values:assert parent.get('/V','')==values[name],name
            assert len(widget['/AP']['/N'].get_object().get_data())>0
            x1,y1,x2,y2=widget['/Rect'];assert 0<=x1<x2<=page.mediabox.width and 0<=y1<y2<=page.mediabox.height
    assert set(seen)==expected and len(seen)==len(expected)
    return r
r=verify(example);assert len(r.pages)==2;ok('Four text fields and two digital-signature fields have matching canonical fields and widgets, valid appearances and page positions')
for name in ['admissions_signature','coordinator_signature']:
 f=r.get_fields()[name];assert f['/FT']=='/Sig' and f.get('/Ff',0)&2 and not f.get('/V')
vu=PdfReader(qa/'fillable-three-projects.pdf').get_fields();assert not vu['admissions_signature'].get('/Ff',0)&2;assert vu['coordinator_signature'].get('/Ff',0)&2;assert 'admissions_decision' not in vu
ok('Digital signature fields are unsigned and mandatory where applicable; VU graduates need no Principles decision')
with pymupdf.open(example) as doc:
 totals=[(p,s) for p in doc for b in p.get_text('dict')['blocks'] if 'lines' in b for l in b['lines'] for s in l['spans'] if s['text']=='120 EC' and s['size']>16]
 assert len(totals)==1 and totals[0][1]['bbox'][0]>totals[0][0].rect.width/2
ok('Programme EC total is enlarged to 17 pt and positioned on the right')
assert all(('/NotoSans-Regular 0 Tf' if x['/T']=='admissions_decision' else '/NotoSans-Regular 9 Tf') in x['/DA'] for x in [ref.get_object() for ref in r.trailer['/Root']['/AcroForm']['/Fields']] if x['/FT']=='/Tx');assert '/NotoSans-Regular' in r.trailer['/Root']['/AcroForm']['/DR']['/Font'];ok('Shared embedded font and auto-sized decision text support later board entry')
links=[str(a.get_object()['/A']['/URI']) for p in r.pages for a in p.get('/Annots',[]) if a.get_object().get('/Subtype')=='/Link']
assert links==['https://studiegids.vu.nl/nl/Master/2026-2027/drug-discovery-sciences#/tab=2','https://canvas.vu.nl/courses/31939/','https://vu.nl/en/student/elective-space/electives'];ok('Study guide, Canvas and examination-board submission destinations are clickable PDF links')
text='\n'.join(p.extract_text() for p in r.pages);assert 'After downloading the completed PDF, send it to your specialisation coordinator' in text;assert 'submit it to the DDS examination board for approval' in text;assert text.index('First name')<text.index('Last name');assert 'Checked for BADD — passed' in text;assert 'XM_0207' in text and 'to be announced' in text;ok('PDF retains name order, passed course check and separate major registration data')
values={'admissions_decision':'The Admissions Board confirms that both Principles of Drug Targets and Principles of Drug Discovery are required. This decision applies to the course selection and total shown in this PEP. Approved after review of the prior qualification and curriculum.','admissions_name':'dr. Melissa Bärenfänger','admissions_date':'10 October 2026','coordinator_date':'12 October 2026'}
filled=qa/'board-completed-example.pdf'
with pymupdf.open(example) as doc:
    for page in doc:
        for widget in page.widgets() or []:
            if widget.field_name not in values:continue
            widget.field_value=values[widget.field_name]
            widget.update()
    doc.save(filled)
verify(filled,values);ok('Board text, accented name and dates survive an independent PDF-engine save/reopen with fields still editable')
pre=PdfReader(qa/'prefilled-decision.pdf');assert not pre.get_fields()['admissions_decision'].get('/V');assert 'admissions_reference' not in pre.get_fields();assert not r.get_fields()['admissions_decision'].get('/V');assert 'Admission board decision (to be filled in by admission board)' in text;assert 'Decision reference' not in text;assert 'Major programme' not in text;assert text.count('Compulsory courses')==1;ok('Every new PDF has a blank board-only decision, correct heading and no reference field, including after legacy import')
u=PdfReader(qa/'unicode.pdf');ut='\n'.join(p.extract_text() for p in u.pages);assert 'Éléonore Αλέξανδρος' in ut;assert not u.get_fields()['admissions_decision'].get('/V');ok('International student names remain encoded and the board decision stays blank')
for name,term in [('fillable-three-projects.pdf','will result in study delay'),('fillable-excess.pdf','diploma supplement')]:
    t='\n'.join(p.extract_text() for p in PdfReader(qa/name).pages);assert term in t
    if name=='fillable-three-projects.pdf':assert 'VU bachelor Farmaceutische Wetenschappen are not allowed to follow any of the Principles courses.' in t
long='\n'.join(p.extract_text() for p in PdfReader(qa/'long-notes.pdf').pages);assert long.count('Long explanation for pagination:')==28;ok('Warning, extracurricular explanation and all long-note paragraphs are retained')
Path(__file__).with_name('pdf-fields-test-results.json').write_text(json.dumps({'date':datetime.now(timezone.utc).isoformat(),'count':len(results),'results':results},indent=2))
