import test from 'node:test';
import assert from 'node:assert/strict';
import { CommandExecutor } from '../dist/application/CommandExecutor.js';
import { CommandHistory } from '../dist/application/CommandHistory.js';
import { EditorSession } from '../dist/application/EditorSession.js';
import { CreateCommand } from '../dist/commands/CreateCommand.js';
import { MoveCommand } from '../dist/commands/MoveCommand.js';
import { CommandResult } from '../dist/commands/CommandResult.js';
import { SvgDocument } from '../dist/domain/SvgDocument.js';
import { Rect } from '../dist/domain/shapes/Rect.js';
import { Circle } from '../dist/domain/shapes/Circle.js';
import { Ellipse } from '../dist/domain/shapes/Ellipse.js';
import { Line } from '../dist/domain/shapes/Line.js';
import { TextShape } from '../dist/domain/shapes/TextShape.js';
import { Group } from '../dist/domain/shapes/Group.js';

const rect = (id = 'r') => new Rect(id, 0.1, 0.2, 3, 4);
const state = (undoCount, redoCount, blocked = false) => ({undoCount,redoCount,blocked});
function initialized() { const app = new CommandExecutor(); app.initialize(); return app; }

// Independent visible-state snapshot for checking command-level atomicity.
function snapshot(app) {
  const doc = app.getDocument();
  const walk = shape => ({id:shape.getId(), attrs:shape.getAttributes(),
    children:shape.getChildren().map(walk)});
  return {width:doc.getWidth(),height:doc.getHeight(),count:doc.getElementCount(),
    tree:doc.getChildren().map(walk),history:app.getHistoryState()};
}

test('no-document errors apply to edits, undo, redo and history barriers', () => {
  const app = new CommandExecutor();
  const command = new CreateCommand(rect());
  for (const action of [() => app.execute(command), () => app.undo(),
    () => app.redo(), () => app.markDocumentOperation()]) {
    assert.throws(action, /no document\. use 'init' or 'read' first/);
  }
  assert.deepEqual(app.getHistoryState(),state(0,0));
  app.initialize();
  app.execute(command); // Failed attempts do not consume the command.
  assert.equal(app.getDocument().getElementCount(),1);
});

test('initialize blocks both histories until a successful edit', () => {
  const app = initialized();
  assert.deepEqual(app.getHistoryState(),state(0,0,true));
  assert.throws(() => app.undo(), /undo not allowed after io command/);
  assert.throws(() => app.redo(), /undo not allowed after io command/);
  app.execute(new CreateCommand(rect()));
  assert.deepEqual(app.getHistoryState(),state(1,0));
  app.undo();
  assert.deepEqual(app.getHistoryState(),state(0,1));
  assert.throws(() => app.undo(), /nothing to undo/);
  app.redo();
  assert.throws(() => app.redo(), /nothing to redo/);
});

test('create supports all six shapes with the same command implementation', () => {
  const app = initialized();
  const shapes = [rect(), new Circle('c',1,2,3), new Ellipse('e',1,2,3,4),
    new Line('l',0,0,1,1), new TextShape('t',1,2,'hello'), new Group('g')];
  for (const shape of shapes) {
    const result = app.execute(new CreateCommand(shape));
    assert.equal(result.getSummary(),`${shape.getType()}#${shape.getId()} created`);
  }
  assert.equal(app.getDocument().getElementCount(),6);
  for (let i=0;i<6;i++) app.undo();
  assert.equal(app.getDocument().getElementCount(),0);
  for (let i=0;i<6;i++) app.redo();
  assert.deepEqual(app.getDocument().getChildren(),shapes);
});

test('create in a group restores exact identity and insertion order', () => {
  const app = initialized();
  const group = new Group('g',[rect('a'),rect('c')]);
  app.execute(new CreateCommand(group));
  const b = rect('b');
  const result = app.execute(new CreateCommand(b,'g',1));
  assert.equal(result.getSummary(),'rect#b created in g#g');
  assert.deepEqual(group.getChildren().map(s=>s.getId()),['a','b','c']);
  app.undo();
  assert.equal(b.getParent(),undefined);
  assert.equal(app.getDocument().findById('b'),undefined);
  app.redo();
  assert.equal(app.getDocument().getShape('b'),b);
  assert.equal(b.getParent(),group);
  assert.deepEqual(group.getChildren().map(s=>s.getId()),['a','b','c']);
});

test('creating a subtree is one undo unit and clears/rebuilds every indexed ID', () => {
  const app = initialized();
  const leaf = rect();
  const group = new Group('g',[new Group('inner',[leaf])]);
  app.execute(new CreateCommand(group));
  assert.deepEqual(app.getHistoryState(),state(1,0));
  app.undo();
  for (const id of ['g','inner','r']) assert.equal(app.getDocument().findById(id),undefined);
  app.redo();
  assert.equal(app.getDocument().getElementCount(),3);
  assert.equal(app.getDocument().getShape('r'),leaf);
});

test('move restores exact floating coordinates through repeated undo and redo', () => {
  const app = initialized();
  const r = rect();
  app.execute(new CreateCommand(r));
  const before = r.getAttributes();
  app.execute(new MoveCommand('r',0.2,0.1));
  const after = r.getAttributes();
  assert.notEqual(after.x - 0.2, before.x); // Demonstrate why inverse translation is insufficient.
  for (let i=0;i<30;i++) {
    app.undo(); assert.deepEqual(r.getAttributes(),before);
    app.redo(); assert.deepEqual(r.getAttributes(),after);
  }
  assert.deepEqual(app.getHistoryState(),state(2,0));
});

test('all leaf geometry snapshots support exact move undo', () => {
  const app = initialized();
  const shapes = [new Circle('c',0.1,0.2,3), new Ellipse('e',0.1,0.2,3,4),
    new Line('l',0.1,0.2,0.3,0.4), new TextShape('t',0.1,0.2,'content')];
  for (const shape of shapes) {
    app.execute(new CreateCommand(shape));
    const before = shape.getAttributes();
    app.execute(new MoveCommand(shape.getId(),0.2,0.1));
    const after = shape.getAttributes();
    app.undo(); assert.deepEqual(shape.getAttributes(),before);
    app.redo(); assert.deepEqual(shape.getAttributes(),after);
  }
});

test('nested group movement is one undo unit and leaves unrelated shapes untouched', () => {
  const app = initialized();
  const a = rect('a');
  const b = new TextShape('b',5,6,'keep');
  app.execute(new CreateCommand(new Group('g',[a,new Group('nested',[b])])));
  const outside = rect('outside');
  app.execute(new CreateCommand(outside));
  const before = [a.getAttributes(),b.getAttributes(),outside.getAttributes()];
  app.execute(new MoveCommand('g',10,20));
  assert.equal(a.getAttributes().x,10.1);
  assert.equal(b.getAttributes().y,26);
  assert.deepEqual(app.getHistoryState(),state(3,0));
  app.undo();
  assert.deepEqual([a.getAttributes(),b.getAttributes(),outside.getAttributes()],before);
  app.redo();
  assert.equal(b.getAttributes().y,26);
  assert.deepEqual(outside.getAttributes(),before[2]);
});

test('multiple commands undo and redo in proper order, including recreate then move', () => {
  const app = initialized();
  const r = rect();
  const before = r.getAttributes();
  app.execute(new CreateCommand(r));
  app.execute(new MoveCommand('r',5,0));
  app.execute(new MoveCommand('r',0,10));
  const after = r.getAttributes();
  app.undo(); app.undo();
  assert.deepEqual(r.getAttributes(),before);
  app.undo();
  assert.equal(app.getDocument().getElementCount(),0);
  app.redo(); app.redo(); app.redo();
  assert.equal(app.getDocument().getShape('r'),r);
  assert.deepEqual(r.getAttributes(),after);
});

test('new successful edit clears redo; a read-only query does not', () => {
  const app = initialized();
  app.execute(new CreateCommand(rect()));
  app.execute(new MoveCommand('r',5,0));
  app.undo();
  const before = app.getHistoryState();
  app.getDocument().getShape('r').getAttributes();
  app.getDocument().getChildren();
  assert.deepEqual(app.getHistoryState(),before);
  app.execute(new CreateCommand(rect('new')));
  assert.deepEqual(app.getHistoryState(),state(2,0));
  assert.throws(() => app.redo(), /nothing to redo/);
});

test('failed edits preserve document and redo, and do not consume undo units', () => {
  const app = initialized();
  app.execute(new CreateCommand(rect()));
  app.execute(new MoveCommand('r',5,0));
  app.undo();
  const before = snapshot(app);
  for (const command of [new MoveCommand('missing',1,1),new MoveCommand('r',NaN,1),
    new CreateCommand(rect()),new CreateCommand(rect('new'),'missing'),
    new CreateCommand(rect('new'),'r')]) {
    assert.throws(() => app.execute(command));
    assert.deepEqual(snapshot(app),before);
  }
  app.redo();
  assert.equal(app.getDocument().getShape('r').getAttributes().x,5.1);
});

test('nested overflow preserves geometry and history', () => {
  const app = initialized();
  app.execute(new CreateCommand(new Group('g',[rect(),new Circle('huge',Number.MAX_VALUE,0,1)])));
  const before = snapshot(app);
  assert.throws(() => app.execute(new MoveCommand('g',Number.MAX_VALUE,1)), /finite number/);
  assert.deepEqual(snapshot(app),before);
});

test('failed edit after a barrier leaves undo/redo blocked', () => {
  const app = initialized();
  assert.throws(() => app.execute(new MoveCommand('missing',1,1)));
  assert.deepEqual(app.getHistoryState(),state(0,0,true));
  assert.throws(() => app.undo(), /undo not allowed after io command/);
});

test('successful document barrier discards both old stacks and starts a new history segment', () => {
  const app = initialized();
  app.execute(new CreateCommand(rect()));
  app.execute(new MoveCommand('r',10,0));
  app.undo();
  app.markDocumentOperation();
  assert.deepEqual(app.getHistoryState(),state(0,0,true));
  assert.throws(() => app.redo(), /undo not allowed after io command/);
  app.execute(new MoveCommand('r',0,10));
  app.undo();
  assert.deepEqual(app.getDocument().getShape('r').getAttributes(),rect().getAttributes());
  assert.throws(() => app.undo(), /nothing to undo/);
  assert.equal(app.getDocument().getElementCount(),1); // Pre-barrier create cannot be undone.
});

test('failed initialize retains document, path, redo and geometry', () => {
  const app = new CommandExecutor();
  const doc = new SvgDocument();
  app.replaceDocument(doc,'original.svg');
  app.execute(new CreateCommand(rect()));
  app.undo();
  const before = snapshot(app);
  assert.throws(() => app.initialize(0,600));
  assert.equal(app.getDocument(),doc);
  assert.equal(app.getFilePath(),'original.svg');
  assert.deepEqual(snapshot(app),before);
  app.redo();
});

test('replacement clears old history and initialize resets the remembered path', () => {
  const app = initialized();
  app.execute(new CreateCommand(rect()));
  const replacement = new SvgDocument(400,300);
  app.replaceDocument(replacement,'imported.svg');
  assert.equal(app.getDocument(),replacement);
  assert.equal(app.getFilePath(),'imported.svg');
  assert.deepEqual(app.getHistoryState(),state(0,0,true));
  app.initialize();
  assert.equal(app.getFilePath(),undefined);
  assert.equal(app.getDocument().getWidth(),800);
});

test('command instances cannot be submitted twice, including after undo or barriers', () => {
  const app = initialized();
  const command = new CreateCommand(rect());
  app.execute(command);
  assert.throws(() => app.execute(command), /already been submitted/);
  app.undo();
  const before = snapshot(app);
  assert.throws(() => app.execute(command), /already been submitted/);
  assert.deepEqual(snapshot(app),before);
  app.markDocumentOperation();
  assert.throws(() => app.execute(command), /already been submitted/);
});

test('command lifecycle rejects undo/redo before execution and cross-document undo', () => {
  const a = new EditorSession(); a.replaceDocument(new SvgDocument());
  const b = new EditorSession(); b.replaceDocument(new SvgDocument());
  const command = new CreateCommand(rect());
  assert.throws(() => command.undo(a), /invalid command lifecycle/);
  assert.throws(() => command.redo(a), /invalid command lifecycle/);
  command.execute(a);
  assert.throws(() => command.execute(b), /already been executed/);
  assert.throws(() => command.undo(b), /different document/);
  command.undo(a);
  command.redo(a);
  assert.equal(a.getDocument().getElementCount(),1);
  assert.equal(b.getDocument().getElementCount(),0);
});

test('failed redo keeps redo entry and can be retried after resolving a conflict', () => {
  const app = initialized();
  const original = rect();
  app.execute(new CreateCommand(original)); app.undo();
  // Deliberate out-of-band change to exercise the failure path.
  app.getDocument().insert(rect());
  const before = snapshot(app);
  assert.throws(() => app.redo(), /id already exists/);
  assert.deepEqual(snapshot(app),before);
  app.getDocument().remove('r');
  app.redo();
  assert.equal(app.getDocument().getShape('r'),original);
});

test('failed undo of a replaced target keeps the undo entry', () => {
  const app = initialized();
  app.execute(new CreateCommand(rect()));
  app.execute(new MoveCommand('r',1,2));
  const original = app.getDocument().remove('r');
  app.getDocument().insert(rect());
  const before = snapshot(app);
  assert.throws(() => app.undo(), /target shape changed/);
  assert.deepEqual(snapshot(app),before);
  app.getDocument().remove('r'); app.getDocument().insert(original);
  app.undo();
  assert.deepEqual(original.getAttributes(),rect().getAttributes());
});

test('snapshot rejects changed subtree structure before partially restoring geometry', () => {
  const app = initialized();
  const leaf = rect();
  app.execute(new CreateCommand(new Group('g',[leaf])));
  app.execute(new MoveCommand('g',10,20));
  app.getDocument().insert(rect('extra'),'g');
  const before = snapshot(app);
  assert.throws(() => app.undo(), /shape structure changed/);
  assert.deepEqual(snapshot(app),before);
  app.getDocument().remove('extra');
  app.undo();
  assert.deepEqual(leaf.getAttributes(),rect().getAttributes());
});

test('history operates only on protocol and moves stack entries after successful operations', () => {
  const session = new EditorSession(); session.replaceDocument(new SvgDocument());
  const history = new CommandHistory(session);
  let failUndo = true, failRedo = true;
  const result = new CommandResult('ok');
  const command = {
    execute: () => result,
    undo: () => { if (failUndo) throw new Error('undo failure'); return result; },
    redo: () => { if (failRedo) throw new Error('redo failure'); return result; }
  };
  assert.equal(history.execute(command),result);
  assert.throws(() => history.undo(),/undo failure/);
  assert.deepEqual(history.getState(),state(1,0));
  failUndo = false; history.undo();
  assert.throws(() => history.redo(),/redo failure/);
  assert.deepEqual(history.getState(),state(0,1));
  failRedo = false; history.redo();
  assert.deepEqual(history.getState(),state(1,0));
  assert.throws(() => { history.getState().undoCount = 100; },TypeError);
});
