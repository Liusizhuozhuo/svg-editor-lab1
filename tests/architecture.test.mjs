import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname, relative, basename, join } from 'node:path';
const sourceRoot=resolve('src');
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):e.name.endsWith('.ts')?[join(dir,e.name)]:[]);}
const files=walk(sourceRoot).map(path=>({path,source:readFileSync(path,'utf8')}));
const moduleOf=path=>relative(sourceRoot,path).replaceAll('\\','/').split('/')[0];
const allowed={domain:[],ports:['domain'],commands:['domain','ports'],application:['domain','ports','commands'],
 cli:['application','commands','domain','presentation'],presentation:['domain'],infrastructure:['domain','ports']};
// Source convention checks for this repository's static import syntax, not a general TS parser.
const imports=source=>[...source.matchAll(/^import\b[^;]*?from\s+["']([^"']+)["'];/gm)].map(m=>m[1]);
test('static source imports obey documented module and IO boundaries',()=>{
 for(const {path,source} of files) for(const spec of imports(source)){
  const origin=moduleOf(path);if(origin==='main.ts')continue;
  if(spec.startsWith('.')){
   const target=moduleOf(resolve(dirname(path),spec));
   assert.ok(target===origin||allowed[origin]?.includes(target),`${relative(sourceRoot,path)} -> ${spec}`);
  }else assert.ok(origin==='infrastructure'||(origin==='cli'&&['node:readline','node:stream'].includes(spec)),`${origin} imports ${spec}`);
 }
});
test('TreeStructure imports stay inside three designated domain collaborators',()=>{
 for(const {path,source} of files) for(const spec of imports(source)){
  if(spec.includes('TreeStructure'))assert.ok(['Shape.ts','Group.ts','SvgDocument.ts'].includes(basename(path)),path);
 }
});
test('source conventions keep one named class per file and no public data declarations',()=>{
 for(const {path,source} of files){
  const classes=[...source.matchAll(/^export (?:abstract )?class (\w+)/gm)];
  assert.ok(classes.length<=1,path);
  for(const cls of classes)assert.equal(cls[1],basename(path,'.ts'));
  assert.doesNotMatch(source,/^export (?:async )?function\b/m,path);
  assert.doesNotMatch(source,/\bpublic\s+(?:static\s+)?(?:readonly\s+)?\w+\s*[:=]/,path);
 }
});
