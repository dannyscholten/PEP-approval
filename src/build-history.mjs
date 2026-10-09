import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const releases=JSON.parse(fs.readFileSync(path.join(dir,'compatibility/releases.json')));
const blocks=releases.map(({version,ruleVersion})=>{
 const old=path.join(dir,'compatibility/legacy',version);
 const data=fs.readFileSync(path.join(old,'catalogue.json'),'utf8').replace(/</g,'\\u003c');
 const rules=fs.readFileSync(path.join(old,'rules.js'),'utf8');
 return `{const module=undefined;const globalThis={PEP_DATA:${data}};\n${rules}\nversions[${JSON.stringify(ruleVersion)}]=globalThis.PEPRules;}`;
});
fs.writeFileSync(path.join(dir,'draft-history.js'),`/* Generated from immutable compatibility/legacy releases. */\n(function(root){const versions={};\n${blocks.join('\n')}\nif(typeof module!=='undefined'&&module.exports)module.exports=versions;else root.PEP_HISTORY=versions;\n})(typeof globalThis!=='undefined'?globalThis:this);\n`);
