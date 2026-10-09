"""Sign the two exported signature fields using ephemeral fictional test identities.
No real institutional certificate or identity is used, stored or distributed.
Dependencies: pyHanko, cryptography; pypdf and PyMuPDF used by field tests first.
"""
from pathlib import Path
import logging
from io import BytesIO
from datetime import datetime,timedelta,timezone
import sys,json
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes,serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from asn1crypto import x509 as asn1_x509,keys
from pyhanko.sign import signers
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pyhanko.pdf_utils.reader import PdfFileReader
from pyhanko.pdf_utils import generic
from pyhanko.sign.validation import validate_pdf_signature
from pyhanko.sign.diff_analysis.policies import DEFAULT_DIFF_POLICY
from copy import deepcopy
# Use the stricter supported policy: reject in-place appearance rewrites.
# pyHanko 0.37's permissive branch can flag unchanged appearances from an
# earlier revision as updates (last_change != old_revision). New appearance
# streams remain checked, and all field locks and other diff checks remain on.
policy=deepcopy(DEFAULT_DIFF_POLICY)
for rule in policy.form_rule.field_rules:
 if hasattr(rule,'allow_in_place_appearance_stream_changes'):
  rule.allow_in_place_appearance_stream_changes=False
from pyhanko_certvalidator import ValidationContext
from pyhanko_certvalidator.registry import SimpleCertificateStore
qa=Path(sys.argv[1]);results=[]
# Expected negative cases are asserted below; avoid misleading error tracebacks.
logging.getLogger('pyhanko.sign.diff_analysis').setLevel(logging.CRITICAL)
def ok(s):results.append(s);print('PASS',s)
def identity(n):
 key=rsa.generate_private_key(public_exponent=65537,key_size=2048)
 name=x509.Name([x509.NameAttribute(NameOID.COMMON_NAME,'PEP TEST SIGNER '+n+' - NOT AN APPROVAL')])
 now=datetime.now(timezone.utc)
 cert=(x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key()).serial_number(x509.random_serial_number()).not_valid_before(now-timedelta(days=1)).not_valid_after(now+timedelta(days=2)).add_extension(x509.BasicConstraints(ca=False,path_length=None),critical=True).add_extension(x509.KeyUsage(digital_signature=True,content_commitment=True,key_encipherment=False,data_encipherment=False,key_agreement=False,key_cert_sign=False,crl_sign=False,encipher_only=False,decipher_only=False),critical=True).sign(key,hashes.SHA256()))
 ac=asn1_x509.Certificate.load(cert.public_bytes(serialization.Encoding.DER));pk=keys.PrivateKeyInfo.load(key.private_bytes(serialization.Encoding.DER,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()))
 return signers.SimpleSigner(ac,pk,SimpleCertificateStore()),ac
signer1,cert1=identity('ONE');signer2,cert2=identity('TWO');context=ValidationContext(trust_roots=[cert1,cert2],allow_fetching=False)
unsigned=(qa/'board-completed-example.pdf').read_bytes()
def sign(data,name,signer):
 writer=IncrementalPdfFileWriter(BytesIO(data));out=BytesIO()
 signers.sign_pdf(writer,signers.PdfSignatureMetadata(field_name=name,reason='Fictional automated test only; no academic approval'),signer=signer,existing_fields_only=True,output=out)
 return out.getvalue()
one=sign(unsigned,'admissions_signature',signer1);(qa/'test-one-signature.pdf').write_bytes(one)
r=PdfFileReader(BytesIO(one));assert len(r.embedded_signatures)==1
s=validate_pdf_signature(r.embedded_signatures[0],signer_validation_context=context,diff_policy=policy);assert s.intact and s.valid and s.trusted and s.docmdp_ok,s.summary();ok('Admissions Board field accepts a cryptographic signature in an existing field')
# Exercise a legitimate coordinator date change after the first signature, via an incremental update.
w=IncrementalPdfFileWriter(BytesIO(one))
for ref in w.root['/AcroForm']['/Fields']:
 f=ref.get_object()
 if f.get('/T')=='coordinator_date':
  f[generic.pdf_name('/V')]=generic.pdf_string('13 October 2026')
  old_ap=f['/AP']['/N'].get_object();data=old_ap.data
  assert b'12 October 2026' in data
  new_ap=generic.StreamObject({k:v for k,v in old_ap.items() if k not in ['/Length','/Filter','/DecodeParms']},stream_data=data.replace(b'12 October 2026',b'13 October 2026'))
  f['/AP'][generic.pdf_name('/N')]=w.add_object(new_ap);w.mark_update(ref)
changed=BytesIO();w.write(changed);(qa/'test-coordinator-date.pdf').write_bytes(changed.getvalue())
two=sign(changed.getvalue(),'coordinator_signature',signer2);(qa/'test-two-signatures.pdf').write_bytes(two)
r=PdfFileReader(BytesIO(two));assert len(r.embedded_signatures)==2
for sig in r.embedded_signatures:
 status=validate_pdf_signature(sig,signer_validation_context=context,diff_policy=policy);assert status.intact and status.valid and status.trusted and status.docmdp_ok,(sig.field_name,status.summary())
ok('Coordinator can update its date and countersign while both signatures remain valid')
# Alter a board-owned field after its signature: validation must reject the change.
w=IncrementalPdfFileWriter(BytesIO(one))
for ref in w.root['/AcroForm']['/Fields']:
 f=ref.get_object()
 if f.get('/T')=='admissions_decision':f[generic.pdf_name('/V')]=generic.pdf_string('Tampered test decision');w.mark_update(ref)
bad=BytesIO();w.write(bad);r=PdfFileReader(BytesIO(bad.getvalue()));status=validate_pdf_signature(r.embedded_signatures[0],signer_validation_context=context,diff_policy=policy);assert not status.docmdp_ok;ok('Changing the board decision after signing is detected as a prohibited change')
# The coordinator's final signature locks all form fields.
r=PdfFileReader(BytesIO(two));assert r.embedded_signatures[-1].fieldmdp.action.value=='/All';ok('Coordinator signature carries the final all-fields lock')
# A stream-only change must also fail: the stricter policy never relaxes this check.
w=IncrementalPdfFileWriter(BytesIO(one))
for ref in w.root['/AcroForm']['/Fields']:
 f=ref.get_object()
 if f.get('/T')=='admissions_date':
  ap=f['/AP'].raw_get('/N');old=ap.get_object()
  assert b'10 October 2026' in old.data
  replacement=generic.StreamObject({k:v for k,v in old.items() if k not in ['/Length','/Filter','/DecodeParms']},stream_data=old.data.replace(b'10 October 2026',b'11 October 2026'))
  w.objects[(ap.generation,ap.idnum)]=replacement
bad=BytesIO();w.write(bad);r=PdfFileReader(BytesIO(bad.getvalue()));status=validate_pdf_signature(r.embedded_signatures[0],signer_validation_context=context,diff_policy=policy);assert not status.docmdp_ok;ok('Changing only a locked field appearance is also rejected')
Path(__file__).with_name('signature-test-results.json').write_text(json.dumps({'date':datetime.now(timezone.utc).isoformat(),'count':len(results),'results':results,'identities':'Ephemeral fictional QA certificates only; no institutional approval'},indent=2))
