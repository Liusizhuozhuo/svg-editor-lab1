import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { CommandExecutor } from '../dist/application/CommandExecutor.js';
import { CliApplication } from '../dist/cli/CliApplication.js';
import { SvgDocument } from '../dist/domain/SvgDocument.js';
import { Group } from '../dist/domain/shapes/Group.js';
import { Rect } from '../dist/domain/shapes/Rect.js';

function fixture(lines = []) {
  const editor = new CommandExecutor();
  const cli = new CliApplication(editor);
  cli.executeLine('init');
  for (const line of lines) cli.executeLine(line);
  return {editor,cli,doc:editor.getDocument()};
}
const ids = children => children.map(child=>child.getId());
function state(doc) {
  const walk = shape => ({id:shape.getId(),parent:shape.getParent()?.getId(),attrs:shape.getAttributes(),
    children:shape.getChildren().map(walk)});
  return {count:doc.getElementCount(),roots:doc.getChildren().map(walk)};
}
function verify(doc) {
  const found = new Set();
  function visit(shape,parent) {
    assert.equal(shape.getParent(),parent);
    assert.equal(doc.getShape(shape.getId()),shape);
    assert.equal(found.has(shape.getId()),false);
    found.add(shape.getId());
    shape.getChildren().forEach(child=>visit(child,shape));
  }
  doc.getChildren().forEach(shape=>visit(shape,undefined));
  assert.equal(found.size,doc.getElementCount());
}
function roundtrip(editor,cli,line) {
  const before = state(editor.getDocument());
  const count = editor.getHistoryState().undoCount;
  cli.executeLine(line);
  const after = state(editor.getDocument());
  assert.equal(editor.getHistoryState().undoCount,count+1);
  verify(editor.getDocument());
  for(let i=0;i<3;i++) {
    cli.executeLine('undo'); assert.deepEqual(state(editor.getDocument()),before); verify(editor.getDocument());
    cli.executeLine('redo'); assert.deepEqual(state(editor.getDocument()),after); verify(editor.getDocument());
  }
}

test('delete restores leaf parent/order and full container subtree in one undo unit', () => {
  const {editor,cli,doc} = fixture(['create g g','create rect a 0 0 1 1 in g',
    'create g inner in g','create text t 1 2 "hello" in inner','create circle b 1 2 3 in g']);
  const t = doc.getShape('t');
  roundtrip(editor,cli,'delete inner');
  assert.equal(doc.findById('t'),undefined);
  cli.executeLine('undo');
  assert.equal(doc.getShape('t'),t);
  assert.deepEqual(ids(doc.getShape('g').getChildren()),['a','inner','b']);
  roundtrip(editor,cli,'delete a');
  cli.executeLine('undo');
  roundtrip(editor,cli,'delete g');
  assert.equal(doc.getElementCount(),0);
});

test('scale recursively changes coordinates and sizes and exactly restores floats', () => {
  const {editor,cli,doc} = fixture(['create g g','create rect r 0.1 0.2 3 4 in g',
    'create line l 1 2 3 4 black in g','create text t 5 6 "stay" in g']);
  roundtrip(editor,cli,'scale g 1.3');
  assert.equal(doc.getShape('r').getAttributes().x,0.1*1.3);
  assert.equal(doc.getShape('r').getAttributes().width,3*1.3);
  assert.equal(doc.getShape('l').getAttributes().x2,3*1.3);
  assert.equal(doc.getShape('t').getAttributes().text,'stay');
  cli.executeLine('undo');
  assert.equal(doc.getShape('r').getAttributes().x,0.1);
});

test('invalid or overflowing scale preserves geometry, redo and history', () => {
  const {editor,cli,doc} = fixture(['create g g','create rect r 1 2 3 4 in g',
    `create circle big ${Number.MAX_VALUE} 1 1 in g`]);
  cli.executeLine('move r 1 1'); cli.executeLine('undo');
  const before = state(doc), history = editor.getHistoryState();
  for(const line of ['scale g 0','scale g -1','scale g NaN','scale g 2']) {
    assert.throws(()=>cli.executeLine(line));
    assert.deepEqual(state(doc),before); assert.deepEqual(editor.getHistoryState(),history);
  }
});

test('set undo restores absent optional styles rather than writing a default', () => {
  const {editor,cli,doc} = fixture(['create rect r 1 2 3 4']);
  for(const [attr,value] of [['fill','red'],['stroke','black'],['stroke-width','2']]) {
    assert.equal(Object.hasOwn(doc.getShape('r').getAttributes(),attr),false);
    roundtrip(editor,cli,`set r ${attr} ${value}`);
    cli.executeLine('undo');
    assert.equal(Object.hasOwn(doc.getShape('r').getAttributes(),attr),false);
  }
});

test('set restores existing values, text spaces/empty content and geometric properties', () => {
  const {editor,cli,doc} = fixture(['create rect r 1 2 3 4 red','create text t 1 2 "old content"']);
  roundtrip(editor,cli,'set r width 12.5');
  roundtrip(editor,cli,'set r fill blue');
  roundtrip(editor,cli,'set t text "new content"');
  roundtrip(editor,cli,'set t text ""');
  assert.equal(doc.getShape('t').getAttributes().text,'');
});

test('set on group changes own style and preserves explicit child color', () => {
  const {editor,cli,doc} = fixture(['create g g','create rect r 1 2 3 4 red in g']);
  roundtrip(editor,cli,'set g fill blue');
  assert.equal(doc.getShape('r').getAttributes().fill,'red');
  const before = state(doc), history = editor.getHistoryState();
  for(const line of ['set g width 10','set r id changed','set r width -1','set r stroke-width -1']) {
    assert.throws(()=>cli.executeLine(line));
    assert.deepEqual(state(doc),before); assert.deepEqual(editor.getHistoryState(),history);
  }
});

test('group same-parent nodes uses document order rather than argument order', () => {
  const {editor,cli,doc} = fixture(['create g scene','create rect a 1 2 3 4 in scene',
    'create rect b 1 2 3 4 in scene','create rect c 1 2 3 4 in scene',
    'create rect d 1 2 3 4 in scene']);
  roundtrip(editor,cli,'group pair d b');
  assert.deepEqual(ids(doc.getShape('scene').getChildren()),['a','pair','c']);
  assert.deepEqual(ids(doc.getShape('pair').getChildren()),['b','d']);
});

test('cross-parent group uses lowest common ancestor and earliest affected branch', () => {
  const {editor,cli,doc} = fixture(['create g scene','create rect lead 0 0 1 1 in scene',
    'create g left in scene','create rect a 1 2 3 4 in left','create rect untouched 0 0 1 1 in left',
    'create g right in scene','create rect b 5 6 7 8 in right']);
  roundtrip(editor,cli,'group merged b a');
  assert.deepEqual(ids(doc.getShape('scene').getChildren()),['lead','merged','left','right']);
  assert.deepEqual(ids(doc.getShape('merged').getChildren()),['a','b']);
  assert.deepEqual(ids(doc.getShape('left').getChildren()),['untouched']);
  assert.deepEqual(doc.getShape('right').getChildren(),[]);
});

test('group across root branches and a direct root node is reversible', () => {
  const {editor,cli,doc} = fixture(['create g a','create rect x 1 2 3 4 in a',
    'create rect y 1 2 3 4','create g b','create rect z 1 2 3 4 in b']);
  roundtrip(editor,cli,'group combined z y x');
  assert.deepEqual(ids(doc.getChildren()),['combined','a','b']);
  assert.deepEqual(ids(doc.getShape('combined').getChildren()),['x','y','z']);
});

test('group a single node is allowed and keeps its location', () => {
  const {editor,cli,doc} = fixture(['create rect a 1 2 3 4','create rect b 1 2 3 4']);
  roundtrip(editor,cli,'group single b');
  assert.deepEqual(ids(doc.getChildren()),['a','single']);
});

test('invalid group validates all IDs, duplicates and ancestor selections before mutation', () => {
  const {editor,cli,doc} = fixture(['create g g','create g nested in g','create rect r 1 2 3 4 in nested']);
  const before = state(doc), history = editor.getHistoryState();
  for(const line of ['group bad','group g r','group bad r missing','group bad r r','group bad r g','group bad nested r']) {
    assert.throws(()=>cli.executeLine(line));
    assert.deepEqual(state(doc),before);assert.deepEqual(editor.getHistoryState(),history);verify(doc);
  }
  assert.throws(()=>cli.executeLine('group bad r g'),/cannot group a container into its own descendant: g/);
});

test('ungroup promotes children into the exact position and restores original group identity/style', () => {
  const {editor,cli,doc} = fixture(['create g scene','create rect before 0 0 1 1 in scene',
    'create g g in scene','set g fill blue','create rect a 1 2 3 4 in g',
    'create g inner in g','create text t 1 2 "x" in inner','create rect after 0 0 1 1 in scene']);
  const group = doc.getShape('g');
  roundtrip(editor,cli,'ungroup g');
  assert.deepEqual(ids(doc.getShape('scene').getChildren()),['before','a','inner','after']);
  assert.equal(doc.findById('g'),undefined);
  cli.executeLine('undo');
  assert.equal(doc.getShape('g'),group);
  assert.equal(group.getAttributes().fill,'blue');
});

test('empty nested group can be ungrouped and undone', () => {
  const {editor,cli,doc} = fixture(['create g scene','create g empty in scene']);
  roundtrip(editor,cli,'ungroup empty');
  assert.equal(doc.getElementCount(),1);
});

test('ungroup root, leaf and absent targets fails atomically', () => {
  const {editor,cli,doc} = fixture(['create g scene','create rect r 1 2 3 4 in scene']);
  const before=state(doc), history=editor.getHistoryState();
  assert.throws(()=>cli.executeLine('ungroup scene'),/cannot ungroup top-level container: scene/);
  assert.throws(()=>cli.executeLine('ungroup r'),/not a container: r/);
  assert.throws(()=>cli.executeLine('ungroup missing'),/no such shape: missing/);
  assert.deepEqual(state(doc),before);assert.deepEqual(editor.getHistoryState(),history);
});

test('addto appends, preserves subtree identity and supports same-parent moves', () => {
  const {editor,cli,doc} = fixture(['create g a','create rect r 1 2 3 4 in a',
    'create rect s 1 2 3 4 in a','create g b','create rect t 1 2 3 4 in b']);
  const shape = doc.getShape('r');
  roundtrip(editor,cli,'addto b r');
  assert.deepEqual(ids(doc.getShape('b').getChildren()),['t','r']);
  assert.equal(doc.getShape('r'),shape);
  roundtrip(editor,cli,'addto b t');
  assert.deepEqual(ids(doc.getShape('b').getChildren()),['r','t']);
  roundtrip(editor,cli,'addto b a');
});

test('addto rejects cycles and invalid destinations without clearing redo', () => {
  const {editor,cli,doc} = fixture(['create g outer','create g inner in outer',
    'create rect r 1 2 3 4 in inner']);
  cli.executeLine('move r 1 2');cli.executeLine('undo');
  const before=state(doc),history=editor.getHistoryState();
  for(const line of ['addto inner outer','addto outer outer','addto r inner','addto missing r']) {
    assert.throws(()=>cli.executeLine(line));
    assert.deepEqual(state(doc),before);assert.deepEqual(editor.getHistoryState(),history);
  }
});

test('front/back stay within siblings and are reversible including no-op positions', () => {
  const {editor,cli,doc} = fixture(['create g g','create rect a 1 2 3 4 in g',
    'create rect b 1 2 3 4 in g','create rect c 1 2 3 4 in g','create g outside']);
  roundtrip(editor,cli,'front a');
  assert.deepEqual(ids(doc.getShape('g').getChildren()),['b','c','a']);
  roundtrip(editor,cli,'front a');
  roundtrip(editor,cli,'back c');
  assert.deepEqual(ids(doc.getShape('g').getChildren()),['c','b','a']);
  roundtrip(editor,cli,'front g');
  assert.deepEqual(ids(doc.getChildren()),['outside','g']);
});

test('mixed edits undo all the way to empty then redo all with exact object identities', () => {
  const {editor,cli,doc} = fixture();
  const lines=['create g scene','create rect a 0.1 0.2 3 4 in scene',
    'create text t 5 6 "old" in scene','group node t a','move node 0.2 0.1',
    'scale node 1.3','set t text "new words"','set a fill red','front a',
    'ungroup node','create g other in scene','addto other a','delete other','back t'];
  for(const line of lines) {cli.executeLine(line);verify(doc);}
  const expected=state(doc);
  const t=doc.getShape('t');
  for(let i=0;i<lines.length;i++) {cli.executeLine('undo');verify(doc);}
  assert.equal(doc.getElementCount(),0);
  for(let i=0;i<lines.length;i++) {cli.executeLine('redo');verify(doc);}
  assert.deepEqual(state(doc),expected);assert.equal(doc.getShape('t'),t);
});

test('structural restore refuses stealing a deleted subtree from another document', () => {
  const {editor,cli,doc} = fixture(['create g g','create rect r 1 2 3 4 in g']);
  const g=doc.getShape('g');
  cli.executeLine('delete g');
  const other=new SvgDocument(); other.insert(g);
  const history=editor.getHistoryState();
  assert.throws(()=>cli.executeLine('undo'),/owned by another document/);
  assert.deepEqual(editor.getHistoryState(),history);assert.equal(doc.getElementCount(),0);verify(other);
  other.remove('g');cli.executeLine('undo');verify(doc);
});

test('structural history detects out-of-band structural edits before restoring anything', () => {
  const {editor,cli,doc} = fixture(['create rect a 1 2 3 4','create rect b 1 2 3 4']);
  cli.executeLine('group g b a');
  doc.insert(new Rect('outside',0,0,1,1));
  const before=state(doc),history=editor.getHistoryState();
  assert.throws(()=>cli.executeLine('undo'),/document structure changed/);
  assert.deepEqual(state(doc),before);assert.deepEqual(editor.getHistoryState(),history);
  doc.remove('outside');cli.executeLine('undo');verify(doc);
});

test('failed new edits leave existing redo available; successful edits discard it', () => {
  const {editor,cli} = fixture(['create rect r 1 2 3 4','set r fill red']);
  cli.executeLine('undo');
  assert.throws(()=>cli.executeLine('delete missing'));
  assert.equal(editor.getHistoryState().redoCount,1);
  cli.executeLine('scale r 2');
  assert.equal(editor.getHistoryState().redoCount,0);
  assert.throws(()=>cli.executeLine('redo'),/nothing to redo/);
});

test('all added parsers reject missing/extra arguments and require a document', () => {
  const empty=new CliApplication();
  for(const line of ['delete r','scale r 2','set r fill red','group g r','ungroup g','addto g r','front r','back r']) {
    assert.throws(()=>empty.executeLine(line),/no document/);
  }
  const {editor,cli,doc}=fixture(['create g g','create rect r 1 2 3 4 in g']);
  const before=state(doc),history=editor.getHistoryState();
  for(const line of ['delete','delete r extra','scale r','scale r 2 extra','set r fill',
    'set r fill red extra','group g','ungroup g extra','addto g','addto g r extra','front r extra','back']) {
    assert.throws(()=>cli.executeLine(line));assert.deepEqual(state(doc),before);assert.deepEqual(editor.getHistoryState(),history);
  }
});

test('help lists all 16 available commands and only file/canvas commands remain absent', () => {
  const {cli}=fixture();
  const help=cli.executeLine('help');
  for(const command of ['delete','scale','set','group','ungroup','addto','front','back']) {
    assert.match(help,new RegExp(`^  ${command} `,'m'));
  }
  assert.match(help,/File commands and canvas/);
});

test('actual CLI executes new commands, keeps quoted content and continues after invalid ungroup', () => {
  const lines=['init','create g scene','create rect a 1 2 3 4 in scene',
    'create text t 5 6 "old" in scene','group node t a','scale node 2','set t text "中文 内容"',
    'ungroup scene','ungroup node','front a','back a','delete a','undo','show a','show t'];
  const result=spawnSync(process.execPath,['dist/main.js'],{input:lines.join('\n'),encoding:'utf8',timeout:10000});
  assert.equal(result.status,0,result.stderr);
  assert.equal(result.stderr,'error: cannot ungroup top-level container: scene\n');
  assert.match(result.stdout,/x=2 y=4 width=6 height=8/);
  assert.match(result.stdout,/text="中文 内容"/);
});
