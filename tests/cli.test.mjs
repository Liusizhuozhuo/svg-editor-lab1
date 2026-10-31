import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { Readable, Writable } from 'node:stream';
import { Tokenizer } from '../dist/cli/Tokenizer.js';
import { TokenCursor } from '../dist/cli/TokenCursor.js';
import { CommandRouter } from '../dist/cli/CommandRouter.js';
import { CliApplication } from '../dist/cli/CliApplication.js';
import { CommandExecutor } from '../dist/application/CommandExecutor.js';
import { ShapeFactory } from '../dist/domain/ShapeFactory.js';
import { ShapeFormatter } from '../dist/presentation/ShapeFormatter.js';
import { TreeFormatter } from '../dist/presentation/TreeFormatter.js';
import { SvgDocument } from '../dist/domain/SvgDocument.js';
import { Rect } from '../dist/domain/shapes/Rect.js';
import { Group } from '../dist/domain/shapes/Group.js';

const tokenizer = new Tokenizer();
const values = line => tokenizer.tokenize(line).map(token => token.getValue());
function fixture() {
  const editor = new CommandExecutor();
  return {editor, cli:new CliApplication(editor)};
}
function snapshot(editor) {
  const doc = editor.getDocument();
  const walk = shape => ({id:shape.getId(),attrs:shape.getAttributes(),children:shape.getChildren().map(walk)});
  return {width:doc.getWidth(),height:doc.getHeight(),tree:doc.getChildren().map(walk),
    count:doc.getElementCount(),history:editor.getHistoryState()};
}

test('tokenizer retains quoted whitespace, empty strings, case and token columns', () => {
  const tokens = tokenizer.tokenize('  create text T 1 2 "Hello world" ""');
  assert.deepEqual(tokens.map(t=>t.getValue()),['create','text','T','1','2','Hello world','']);
  assert.equal(tokens[0].getColumn(),3);
  assert.equal(tokens[5].isQuoted(),true);
  assert.equal(tokens[4].isQuoted(),false);
  assert.equal(tokens[6].isQuoted(),true);
});

test('only leading comments are ignored; color hashes and hashes in text survive', () => {
  assert.deepEqual(values('  # comment "unclosed'),[]);
  assert.deepEqual(values(' \t '),[]);
  assert.deepEqual(values('create rect r 0 0 1 1 #ffffff').slice(-1),['#ffffff']);
  assert.deepEqual(values('create text t 0 0 "# text"').slice(-1),['# text']);
  assert.deepEqual(values('move r 1 2 # note').slice(-2),['#','note']);
});

test('quoted escapes preserve quotes, backslashes and unknown Windows path escapes', () => {
  assert.deepEqual(values(String.raw`"say \"hi\"" "C:\temp\file.svg" "a\\b"`),
    ['say "hi"','C:\\temp\\file.svg','a\\b']);
});

test('tokenizer rejects unclosed quotes and concatenated quoted fragments', () => {
  for (const line of ['create text t 1 2 "open','move r 1 "2"tail','move r 1 pre"two"']) {
    assert.throws(()=>tokenizer.tokenize(line),/quote/);
  }
});

test('cursor checks finite decimal numbers, argument counts and missing values', () => {
  const cursor = new TokenCursor(tokenizer.tokenize('-1.25e2 +.5'));
  assert.equal(cursor.readNumber('x'),-125);
  assert.equal(cursor.readNumber('y'),0.5);
  cursor.expectEnd();
  assert.throws(()=>cursor.readString('id'),/missing argument: id/);
  for (const value of ['NaN','Infinity','1e999','0x10','12px','""']) {
    assert.throws(()=>new TokenCursor(tokenizer.tokenize(value)).readNumber('x'),/finite number/);
  }
  assert.throws(()=>new TokenCursor(tokenizer.tokenize('extra')).expectEnd(),/unexpected argument/);
});

test('factory provides all six types, optional styles and matching help syntax', () => {
  const factory = new ShapeFactory();
  const cases = [
    ['rect',['1','2','3','4','red'],{fill:'red',x:1,y:2,width:3,height:4}],
    ['circle',[1,2,3],{cx:1,cy:2,r:3}],
    ['ellipse',[1,2,3,4],{cx:1,cy:2,rx:3,ry:4}],
    ['line',[1,2,3,4,'black'],{stroke:'black',x1:1,y1:2,x2:3,y2:4}],
    ['text',[1,2,''],{x:1,y:2,text:''}],
    ['g',[],{}]
  ];
  for (const [type,args,expected] of cases) {
    const shape = factory.create(type,type,args);
    assert.equal(shape.getType(),type);
    assert.deepEqual(shape.getAttributes(),expected);
  }
  assert.equal(factory.getSyntax().length,6);
  assert.ok(factory.getSyntax().every(line=>line.endsWith('[in <containerId>]')));
});

test('factory rejects unknown types, missing/extra values and invalid geometry', () => {
  const factory = new ShapeFactory();
  for (const type of ['box','hexagon','Rect','__proto__']) {
    assert.throws(()=>factory.create(type,'x',[]),/unknown shape type: .* \(is the plugin loaded\?\)/);
  }
  assert.throws(()=>factory.create('rect','r',[0,0,1]),/missing argument/);
  assert.throws(()=>factory.create('g','g',['extra']),/unexpected shape argument/);
  assert.throws(()=>factory.create('circle','c',[0,0,-1]),/non-negative/);
  assert.throws(()=>factory.create('text','t',[0,0,123]),/content must be a string/);
});

test('init supports zero, one or two dimensions and validates before replacing a document', () => {
  const {editor,cli} = fixture();
  assert.equal(cli.executeLine('init'),'canvas 800x600 created');
  assert.equal(cli.executeLine('init 400'),'canvas 400x600 created');
  assert.equal(cli.executeLine('init 400.5 200.25'),'canvas 400.5x200.25 created');
  cli.executeLine('create g existing');
  const before = snapshot(editor);
  for (const line of ['init 1 2 3','init 0 10','init abc','init 1 Infinity']) {
    assert.throws(()=>cli.executeLine(line));
    assert.deepEqual(snapshot(editor),before);
  }
});

test('help, blank lines and comments work without a document; other valid commands require one', () => {
  const {cli} = fixture();
  assert.match(cli.executeLine('help'),/Available commands/);
  assert.equal(cli.executeLine(' '),undefined);
  assert.equal(cli.executeLine('# ignored'),undefined);
  for (const line of ['create g g','move r 1 2','tree','show r','undo','redo']) {
    assert.throws(()=>cli.executeLine(line),/no document\. use 'init' or 'read' first/);
  }
});

test('create parses nested ownership for all six types', () => {
  const {editor,cli} = fixture();
  cli.executeLine('init'); cli.executeLine('create g scene');
  const commands = ['create rect r 0 0 3 4 #fff in scene', 'create circle c 1 2 3 in scene',
    'create ellipse e 1 2 3 4 in scene', 'create line l 1 2 3 4 black in scene',
    'create text t 1 2 "Hello world" in scene','create g nested in scene'];
  for (const line of commands) assert.match(cli.executeLine(line),/created in g#scene$/);
  assert.equal(editor.getDocument().getElementCount(),7);
  assert.deepEqual(editor.getDocument().getShape('scene').getChildren().map(s=>s.getId()),
    ['r','c','e','l','t','nested']);
});

test('in is a suffix keyword only when unquoted and after type/id', () => {
  const {editor,cli} = fixture();
  cli.executeLine('init');
  cli.executeLine('create g in');
  cli.executeLine('create text a 1 2 "in" in in');
  cli.executeLine('create text b 1 2 "text in scene"');
  cli.executeLine('create text c 1 2 "" in in');
  assert.equal(editor.getDocument().getShape('a').getAttributes().text,'in');
  assert.equal(editor.getDocument().getShape('a').getParent().getId(),'in');
  assert.equal(editor.getDocument().getShape('b').getAttributes().text,'text in scene');
  assert.equal(editor.getDocument().getShape('c').getAttributes().text,'');
  assert.throws(()=>cli.executeLine('create rect r 0 0 1 1 in'),/missing argument: containerId/);
});

test('create errors leave document and redo history unchanged', () => {
  const {editor,cli} = fixture();
  cli.executeLine('init'); cli.executeLine('create rect r 0 0 1 1');
  cli.executeLine('move r 1 2'); cli.executeLine('undo');
  const before = snapshot(editor);
  const invalid = ['create rect r 1 2 3 4','create g x in missing','create g x in r',
    'create text t 1 2 "unterminated','create g x extra','create circle c 1 2 -1',
    'create box x','create rect x 1 2','create rect x 1 2 3 4 red in r extra'];
  for (const line of invalid) {
    assert.throws(()=>cli.executeLine(line));
    assert.deepEqual(snapshot(editor),before);
  }
  cli.executeLine('redo');
  assert.equal(editor.getDocument().getShape('r').getAttributes().x,1);
});

test('move/undo/redo integrates with history, and queries do not clear redo', () => {
  const {editor,cli} = fixture();
  cli.executeLine('init'); cli.executeLine('create rect r 0.1 0.2 3 4');
  assert.equal(cli.executeLine('move r 0.2 0.1'),'rect#r moved by (0.2,0.1)');
  cli.executeLine('undo');
  const before = editor.getHistoryState();
  cli.executeLine('tree'); cli.executeLine('tree r'); cli.executeLine('show r'); cli.executeLine('help');
  assert.deepEqual(editor.getHistoryState(),before);
  cli.executeLine('redo');
  assert.equal(editor.getDocument().getShape('r').getAttributes().x,0.1+0.2);
});

test('extra arguments cannot trigger edits, undo, redo, queries or help', () => {
  const {editor,cli} = fixture();
  cli.executeLine('init'); cli.executeLine('create g g');
  const before = snapshot(editor);
  for (const line of ['move g 1 2 extra','undo extra','redo extra','tree g extra',
    'show g extra','help extra']) {
    assert.throws(()=>cli.executeLine(line),/unexpected argument/);
    assert.deepEqual(snapshot(editor),before);
  }
});

test('unknown commands are case sensitive and have no state changes', () => {
  const {editor,cli} = fixture();
  cli.executeLine('init');
  const before = snapshot(editor);
  for (const command of ['MOVE','__proto__','not-a-command','SAVE','READ']) {
    assert.throws(()=>cli.executeLine(command),/unknown command/);
    assert.deepEqual(snapshot(editor),before);
  }
});

test('tree includes geometry and correct branches; subtree excludes siblings', () => {
  const {cli} = fixture();
  for (const line of ['init 400 300','create g g','create rect r 1 2 3 4 red in g',
    'create g inner in g','create text t 5 6 "My Diagram" in inner','create circle c 7 8 9']) cli.executeLine(line);
  assert.equal(cli.executeLine('tree'),[
    'svg (400x300)','├── g#g','│   ├── rect#r  x=1 y=2 w=3 h=4  fill=red',
    '│   └── g#inner','│       └── text#t  (5,6) "My Diagram"','└── circle#c  cx=7 cy=8 r=9'
  ].join('\n'));
  assert.equal(cli.executeLine('tree inner'),'g#inner\n└── text#t  (5,6) "My Diagram"');
  assert.equal(cli.executeLine('tree c'),'circle#c  cx=7 cy=8 r=9');
  assert.throws(()=>cli.executeLine('tree absent'),/no such shape: absent/);
});

test('visitor formatter handles all geometry without type-name branching', () => {
  const factory = new ShapeFactory();
  const formatter = new ShapeFormatter();
  assert.equal(formatter.inline(factory.create('ellipse','e',[1,2,3,4])),
    'ellipse#e  cx=1 cy=2 rx=3 ry=4');
  assert.equal(formatter.inline(factory.create('line','l',[1,2,3,4,'black'])),
    'line#l  (1,2) -> (3,4)  stroke=black');
  assert.equal(formatter.inline(factory.create('g','empty',[])),'g#empty');
  const t = factory.create('text','t',[0,0,'a\nb "quoted"']);
  assert.equal(formatter.inline(t),'text#t  (0,0) "a\\nb \\"quoted\\""');
});

test('show includes actual SVG attribute names, parent and explicit styles', () => {
  const {cli} = fixture();
  cli.executeLine('init'); cli.executeLine('create g g');
  cli.executeLine('create rect r 1 2 3 4 #fff in g');
  assert.equal(cli.executeLine('show r'),'rect#r  parent=g#g\n  x=1 y=2 width=3 height=4\n  fill=#fff');
  assert.equal(cli.executeLine('show g'),'g#g  parent=svg');
  assert.throws(()=>cli.executeLine('show absent'),/no such shape: absent/);
});

test('formatting is read-only and empty canvas is valid output', () => {
  const doc = new SvgDocument();
  const formatter = new TreeFormatter();
  assert.equal(formatter.format(doc),'svg (800x600)');
  const r = new Rect('r',1,2,3,4);
  r.setAttribute('stroke-width',1.5);
  doc.insert(new Group('g',[r]));
  const before = r.getAttributes();
  assert.match(formatter.format(doc),/stroke-width=1.5/);
  assert.deepEqual(r.getAttributes(),before);
});

test('help lists each registered command and every builtin creation syntax', () => {
  const help = new CommandRouter().parse('help').execute(new CommandExecutor());
  for (const name of ['init','create','move','undo','redo','tree','show','help']) {
    assert.match(help,new RegExp(`^  ${name}(?: |$)`,'m'));
  }
  for (const type of ['rect','circle','ellipse','line','text','g']) {
    assert.match(help,new RegExp(`create ${type} <id>`));
  }
});

test('actual process supports CRLF script input, EOF without newline and error continuation', () => {
  const input = ['# script','init 400 200','create g node','create rect r 1 2 3 4 #fff in node',
    'create text t 5 6 "开始" in node','move node 10 20','undo','redo',
    'move missing 1 2','tree node','show r'].join('\r\n');
  const result = spawnSync(process.execPath,['dist/main.js'],{input,encoding:'utf8',timeout:10000});
  assert.equal(result.status,0,result.stderr);
  assert.equal(result.stderr,'error: no such shape: missing\n');
  assert.match(result.stdout,/text#t  \(15,26\) "开始"/);
  assert.match(result.stdout,/rect#r  parent=g#node\n  x=11 y=22 width=3 height=4/);
  assert.doesNotMatch(result.stdout,/svg> |type 'help'/);
});

test('actual process continues after syntax errors and keeps one error per line', () => {
  const result = spawnSync(process.execPath,['dist/main.js'],{
    input:'init\ncreate text t 1 2 "unclosed\ncreate circle c 1 2 3\nmove c NaN 1\nshow c\n',
    encoding:'utf8',timeout:10000
  });
  assert.equal(result.status,0,result.stderr);
  const errors = result.stderr.trim().split('\n');
  assert.equal(errors.length,2);
  assert.ok(errors.every(line=>line.startsWith('error: ')));
  assert.match(result.stdout,/circle#c  parent=svg\n  cx=1 cy=2 r=3/);
});

test('interactive adapter prints the prompt and banner and closes at EOF', {timeout:5000}, async () => {
  let stdout = '', stderr = '';
  const output = new Writable({write(chunk,_encoding,callback){stdout += chunk.toString();callback();}});
  const errors = new Writable({write(chunk,_encoding,callback){stderr += chunk.toString();callback();}});
  await new CliApplication().run(Readable.from(['init\n']),output,errors,true);
  assert.match(stdout,/svg-editor 0.1/);
  assert.match(stdout,/svg> /);
  assert.match(stdout,/canvas 800x600 created/);
  assert.equal(stderr,'');
});
