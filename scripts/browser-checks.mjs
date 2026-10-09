import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
const env={...process.env,PEP_HTML:'dist/index.html',PEP_QA:'qa',PEP_EXAMPLE_PDF:'qa/static-example.pdf',PEP_FILLABLE_PDF:'qa/fillable-example.pdf',PEP_CHROME:process.env.PEP_CHROME||chromium.executablePath()};
for(const test of ['browser.test.cjs','compatibility.browser.test.cjs','pdf.test.cjs'])execFileSync(process.execPath,['src/'+test],{stdio:'inherit',env});
