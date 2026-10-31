import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { SvgReader } from '../dist/infrastructure/SvgReader.js';
import { SvgWriter } from '../dist/infrastructure/SvgWriter.js';
import { SvgFileRepository } from '../dist/infrastructure/SvgFileRepository.js';
import { CommandExecutor } from '../dist/application/CommandExecutor.js';
import { CliApplication } from '../dist/cli/CliApplication.js';
const svg = body => `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">${body}</svg>`;
const reader = new SvgReader();
const writer = new SvgWriter();
const snapshot = doc => writer.write(doc);
function directory(t) { const dir = mkdtempSync(join(tmpdir(),'svg lab ')); t.after(()=>rmSync(dir,{recursive:true,force:true})); return dir; }
function fixture() { const editor = new CommandExecutor(new SvgFileRepository()); const cli = new CliApplication(editor); cli.executeLine('init'); cli.executeLine('create rect r 1 2 3 4'); return {editor,cli}; }

test('six shapes, hierarchy, styles, order and Unicode text survive SVG roundtrip',()=>{
 const source=svg('<g id="g" fill="red"><rect id="r" x="1" y="2" width="3" height="4"/><circle id="c" cx="5" cy="6" r="7"/><ellipse id="e" rx="8" ry="9"/><line id="l" x2="10" stroke="blue" stroke-width="2"/><text id="t" x="1">  中文 &amp; &lt; &gt; " &#13;\n<![CDATA[<raw>]]></text></g>');
 const first=reader.read(source).getDocument(); const second=reader.read(writer.write(first)).getDocument();
 assert.equal(snapshot(second),snapshot(first)); assert.equal(first.getElementCount(),6);
 assert.equal(first.getShape('t').getAttributes().text,'  中文 & < > " \r\n<raw>');
 assert.equal(first.getShape('r').getAttributes().fill,undefined);
 assert.deepEqual(first.getShape('g').getChildren().map(s=>s.getId()),['r','c','e','l','t']);
});
test('missing IDs avoid explicit IDs appearing later and remain stable after saving',()=>{
 const result=reader.read(svg('<rect/><g><rect id="rect1"/><rect/></g><circle/>'));
 assert.deepEqual(result.getDocument().getChildren().map(s=>s.getId()),['rect2','g1','circle1']);
 assert.equal(result.getDocument().getShape('g1').getChildren()[1].getId(),'rect3');
 assert.equal(result.getWarnings().length,4);
 assert.equal(reader.read(writer.write(result.getDocument())).getWarnings().length,0);
 assert.equal(reader.read(svg('<rect/>')).getDocument().getChildren()[0].getId(),'rect1');
});
test('SVG namespace prefixes, pixel canvas dimensions and matching viewBox are accepted',()=>{
 const result=reader.read('<s:svg xmlns:s="http://www.w3.org/2000/svg" width="20px" height="30px" viewBox="0,0,20,30"><s:circle id="C"/></s:svg>');
 assert.equal(result.getDocument().getWidth(),20); assert.equal(result.getDocument().getShape('C').getAttributes().r,0);
});
for (const [name,source] of [
 ['duplicate IDs',svg('<rect id="a"/><g><circle id="a"/></g>')],
 ['empty ID',svg('<rect id=""/>')],
 ['unknown element',svg('<path id="p"/>')],
 ['transform',svg('<g transform="translate(1 2)"/>')],
 ['CSS',svg('<rect style="fill:red"/>')],
 ['foreign namespace',svg('<rect xmlns="urn:foreign"/>')],
 ['child in leaf',svg('<rect><circle/></rect>')],
 ['nontext content',svg('<g>lost text</g>')],
 ['nested text',svg('<text><tspan>lost</tspan></text>')],
 ['DTD','<!DOCTYPE svg [<!ENTITY x "abc">]>'+svg('<text>&x;</text>')],
 ['broken XML',svg('<rect>')],
 ['unknown entity',svg('<text>&missing;</text>')],
 ['negative radius',svg('<circle r="-1"/>')],
 ['bad viewBox','<svg width="20" height="30" viewBox="1 0 20 30"/>'],
 ['missing dimensions','<svg/>'],
 ['root style','<svg width="20" height="30" fill="red"/>'],
 ['XML control',svg('<text>&#1;</text>')],
 ['stylesheet instruction','<?xml-stylesheet href="a.css"?>'+svg('')]
]) test(`rejects ${name} instead of silently losing SVG semantics`,()=>assert.throws(()=>reader.read(source)));

test('file repository overwrites valid destination and remembers explicit save path',t=>{
 const dir=directory(t), path=join(dir,'drawing.svg'); const {editor,cli}=fixture();
 assert.throws(()=>cli.executeLine('save'),/no file path/);
 cli.executeLine(`save "${path}"`); assert.equal(editor.getFilePath(),path);
 cli.executeLine('move r 10 0'); cli.executeLine('save');
 assert.equal(reader.read(readFileSync(path,'utf8')).getDocument().getShape('r').getAttributes().x,11);
 assert.deepEqual(readdirSync(dir),['drawing.svg']);
});
test('failed read preserves document identity, filename, undo and redo',t=>{
 const dir=directory(t), path=join(dir,'bad.svg'); const {editor,cli}=fixture();
 cli.executeLine(`save "${join(dir,'ok.svg')}"`); cli.executeLine('move r 10 0'); cli.executeLine('undo');
 const doc=editor.getDocument(), state=editor.getHistoryState(), filename=editor.getFilePath();
 for(const source of [svg('<rect id="r"/><circle id="r"/>'),svg('<g transform="translate(1)"/>')]) {
  writeFileSync(path,source); assert.throws(()=>cli.executeLine(`read "${path}"`));
  assert.equal(editor.getDocument(),doc); assert.deepEqual(editor.getHistoryState(),state); assert.equal(editor.getFilePath(),filename);
 }
 assert.throws(()=>cli.executeLine(`read "${join(dir,'missing.svg')}"`),/cannot read file:/);
 cli.executeLine('redo'); assert.equal(doc.getShape('r').getAttributes().x,11);
});
test('failed save retains history, filename and destination and removes temp file',t=>{
 const dir=directory(t), path=join(dir,'destination'); mkdirSync(path);
 const {editor,cli}=fixture(); const state=editor.getHistoryState();
 assert.throws(()=>cli.executeLine(`save "${path}"`),/cannot write file:/);
 assert.deepEqual(editor.getHistoryState(),state); assert.equal(editor.getFilePath(),undefined);
 assert.deepEqual(readdirSync(dir),['destination']); cli.executeLine('undo');
});
test('serialization failure does not truncate existing file',t=>{
 const dir=directory(t),path=join(dir,'existing.svg');writeFileSync(path,'KEEP');
 const {editor,cli}=fixture();cli.executeLine('create text t 0 0 "ok"'); editor.getDocument().getShape('t').setAttribute('text','bad\u0001');
 const state=editor.getHistoryState();assert.throws(()=>editor.saveDocument(path),/invalid XML character/);
 assert.equal(readFileSync(path,'utf8'),'KEEP');assert.deepEqual(editor.getHistoryState(),state);
});
test('successful read, save and canvas resize block history; next edit unlocks',t=>{
 const dir=directory(t),path=join(dir,'drawing.svg'); const {editor,cli}=fixture();
 for(const action of [`save "${path}"`,`read "${path}"`,'canvas 900 700']) {
  cli.executeLine(action); assert.throws(()=>cli.executeLine('undo'),/undo not allowed after io command/);
  assert.throws(()=>cli.executeLine('redo'),/undo not allowed after io command/);
  cli.executeLine('move r 1 0'); cli.executeLine('undo');
 }
 assert.equal(editor.getFilePath(),path);
 cli.executeLine('init');assert.equal(editor.getFilePath(),undefined);
});
test('canvas query and invalid changes preserve history and dimensions',()=>{
 const {editor,cli}=fixture(),state=editor.getHistoryState();
 assert.equal(cli.executeLine('canvas'),'canvas 800x600');
 for(const command of ['canvas 10','canvas 10 -1','canvas 10 20 extra','canvas NaN 20']) assert.throws(()=>cli.executeLine(command));
 assert.equal(cli.executeLine('canvas'),'canvas 800x600');assert.deepEqual(editor.getHistoryState(),state);cli.executeLine('undo');
});
test('actual CLI reads before init, prints warnings, saves quoted paths and continues after IO error',t=>{
 const dir=directory(t),input=join(dir,'input drawing.svg'),output=join(dir,'output drawing.svg');writeFileSync(input,svg('<text>Hello &amp; 中文</text>'));
 const result=spawnSync(process.execPath,['dist/main.js'],{encoding:'utf8',input:`read "${input}"\ncanvas\nsave "${output}"\nundo\nmove text1 1 2\nsave\n`});
 assert.equal(result.status,0);assert.match(result.stdout,/warning: assigned id text1/);assert.match(result.stdout,/canvas 800x600/);
 assert.match(result.stderr,/error: undo not allowed after io command/);
 assert.equal(reader.read(readFileSync(output,'utf8')).getDocument().getShape('text1').getAttributes().text,'Hello & 中文');
});

test('DOCTYPE-like text in comments and CDATA is ordinary content',()=>{
 const doc=reader.read(svg('<!-- <!DOCTYPE example> --><text id="t"><![CDATA[<!DOCTYPE example>]]></text>')).getDocument();
 assert.equal(doc.getShape('t').getAttributes().text,'<!DOCTYPE example>');
 assert.equal(snapshot(reader.read(writer.write(doc)).getDocument()),snapshot(doc));
});
test('real DOCTYPE remains unsupported with no entity references',()=>{
 assert.throws(()=>reader.read('<!DOCTYPE svg>'+svg('')),/DOCTYPE is not supported/);
 assert.throws(()=>reader.read('<!DOCTYPE svg SYSTEM "file:///nonexistent.dtd">'+svg('')),/DOCTYPE is not supported/);
});
test('duplicate imported IDs use the task specification error message',()=>{
 assert.throws(()=>reader.read(svg('<rect id="r1"/><circle id="r1"/>')), {message:'id already exists: r1'});
});
