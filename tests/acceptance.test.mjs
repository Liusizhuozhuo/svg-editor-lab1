import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { SvgReader } from '../dist/infrastructure/SvgReader.js';
import { SvgWriter } from '../dist/infrastructure/SvgWriter.js';
import { CommandExecutor } from '../dist/application/CommandExecutor.js';
import { CliApplication } from '../dist/cli/CliApplication.js';
const root=resolve('.');
const task=readFileSync('phase_cli_1.md','utf8').split('## 6. ')[1];
const typical=task.split('### 6.1')[0];
const flowchart=task.split('### 6.1')[1].split('**版本 B')[0];
const commands=section=>[...section.matchAll(/^svg> (.*)$/gm)].map(match=>match[1]).join('\n')+'\n';
function replay(t,section) {
 const dir=mkdtempSync(join(tmpdir(),'svg acceptance '));
 t.after(()=>rmSync(dir,{recursive:true,force:true}));
 writeFileSync(join(dir,'other.svg'),typical.match(/```xml\n([\s\S]*?)```/)[1]);
 const result=spawnSync(process.execPath,[join(root,'dist/main.js')],{cwd:dir,input:commands(section),encoding:'utf8'});
 assert.equal(result.status,0);return {dir,...result};
}
test('task section 6 replays its expected errors, import warning and saved model',t=>{
 assert.equal(readFileSync('examples/acceptance/typical.txt','utf8'),commands(typical));
 const result=replay(t,typical);
 assert.deepEqual(result.stderr.trim().split(/\r?\n/),[
  'error: cannot group a container into its own descendant: markers',
  'error: undo not allowed after io command']);
 assert.match(result.stdout,/saved to demo.svg \(5 elements\)/);
 assert.match(result.stdout,/warning: assigned id rect1 to unnamed <rect>/);
 assert.match(result.stdout,/read other.svg \(7 elements\)/);
 const doc=new SvgReader().read(readFileSync(join(result.dir,'demo.svg'),'utf8')).getDocument();
 assert.equal(doc.getElementCount(),5);assert.equal(doc.getShape('c1').getAttributes().cx,130);
 assert.equal(doc.getShape('title').getAttributes().text,'My Diagram');
 assert.deepEqual(doc.getShape('markers').getChildren().map(s=>s.getId()),['c1','box']);
});
test('task section 6.1 version A saves exactly eight elements and restores moved node',t=>{
 assert.equal(readFileSync('examples/acceptance/flowchart.txt','utf8'),commands(flowchart));
 const result=replay(t,flowchart);assert.equal(result.stderr,'');
 assert.match(result.stdout,/saved to flowchart.svg \(8 elements\)/);
 const doc=new SvgReader().read(readFileSync(join(result.dir,'flowchart.svg'),'utf8')).getDocument();
 assert.equal(doc.getElementCount(),8);assert.equal(doc.getShape('process').getAttributes().y,100);
 assert.equal(doc.getShape('process-label').getAttributes().text,'处理数据 v2');
 assert.deepEqual(doc.getShape('flowchart').getChildren().map(s=>s.getId()),['node1','node2','arrow1']);
});
test('all ten edit commands undo and redo as single units in a mixed workflow',()=>{
 const editor=new CommandExecutor(),cli=new CliApplication(editor),writer=new SvgWriter();
 cli.executeLine('init');const states=[writer.write(editor.getDocument())];
 const edits=['create g scene','create rect r 1 2 3 4 in scene','create circle c 10 20 5 in scene',
  'create g other in scene','move scene 3 4','scale scene 2','set scene fill red',
  'group pair c r','addto other pair','ungroup pair','front r','back r','delete other'];
 for(const line of edits){cli.executeLine(line);states.push(writer.write(editor.getDocument()));}
 for(let i=edits.length-1;i>=0;i--){cli.executeLine('undo');assert.equal(writer.write(editor.getDocument()),states[i],edits[i]);}
 for(let i=0;i<edits.length;i++){cli.executeLine('redo');assert.equal(writer.write(editor.getDocument()),states[i+1],edits[i]);}
});
test('future box plugin stays excluded and leaves redo intact',()=>{
 const editor=new CommandExecutor(),cli=new CliApplication(editor);cli.executeLine('init');
 cli.executeLine('create rect r 0 0 10 10');cli.executeLine('undo');const state=editor.getHistoryState();
 assert.throws(()=>cli.executeLine('create box n1 0 0 100 50 "title"'),/unknown shape type: box/);
 assert.deepEqual(editor.getHistoryState(),state);cli.executeLine('redo');assert.equal(editor.getDocument().getElementCount(),1);
});
