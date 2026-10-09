import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
execFileSync(process.execPath,['src/build.mjs','dist/index.html'],{stdio:'inherit'});
fs.mkdirSync('dist/2026',{recursive:true});
fs.copyFileSync('dist/index.html','dist/2026/index.html');
fs.copyFileSync('dist/index.html','dist/DDS_PEP_2026.html');
fs.writeFileSync('dist/.nojekyll','');
