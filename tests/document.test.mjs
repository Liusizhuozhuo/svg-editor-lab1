import test from 'node:test';
import assert from 'node:assert/strict';
import { SvgDocument } from '../dist/domain/SvgDocument.js';
import { Rect } from '../dist/domain/shapes/Rect.js';
import { Circle } from '../dist/domain/shapes/Circle.js';
import { Group } from '../dist/domain/shapes/Group.js';

const rect = id => new Rect(id, 10, 20, 30, 40);
const ids = shapes => shapes.map(shape => shape.getId());

// Walk independently of the document index and check both representations agree.
function verify(doc) {
  const found = new Set();
  function visit(node, parent) {
    assert.equal(node.getParent(), parent);
    assert.equal(found.has(node.getId()), false);
    found.add(node.getId());
    assert.equal(doc.findById(node.getId()), node);
    node.getChildren().forEach(child => visit(child, node));
  }
  doc.getChildren().forEach(node => visit(node, undefined));
  assert.equal(doc.getElementCount(), found.size);
}

function snapshot(doc) {
  function tree(node) {
    return { id: node.getId(), parent: node.getParent()?.getId(),
      attributes: node.getAttributes(), children: node.getChildren().map(tree) };
  }
  return {width:doc.getWidth(), height:doc.getHeight(), count:doc.getElementCount(),
    roots:doc.getChildren().map(tree)};
}

test('default canvas, custom floating dimensions and atomic resize', () => {
  const doc = new SvgDocument();
  assert.equal(doc.getWidth(), 800);
  assert.equal(doc.getHeight(), 600);
  assert.equal(doc.getElementCount(), 0);
  doc.resize(320.5, 200.25);
  const before = snapshot(doc);
  for (const [w,h] of [[0,1],[-1,1],[1,0],[1,-1],[NaN,1],[1,Infinity]]) {
    assert.throws(() => doc.resize(w,h));
    assert.deepEqual(snapshot(doc), before);
    assert.throws(() => new SvgDocument(w,h));
  }
});

test('insert roots and nested subtrees indexes every node with case-sensitive IDs', () => {
  const doc = new SvgDocument();
  const r = rect('r');
  const upper = rect('R');
  const circle = new Circle('c',1,2,3);
  const inner = new Group('inner',[circle]);
  const group = new Group('g',[r,inner]);
  doc.insert(group);
  doc.insert(upper);
  assert.equal(doc.getElementCount(), 5);
  assert.equal(doc.getShape('r'), r);
  assert.equal(doc.getShape('R'), upper);
  assert.equal(doc.findById('missing'), undefined);
  assert.throws(() => doc.getShape('missing'), /no such shape: missing/);
  verify(doc);
});

test('insert at beginning, middle and end in both root and group', () => {
  const doc = new SvgDocument();
  doc.insert(rect('b'));
  doc.insert(rect('a'),undefined,0);
  doc.insert(rect('d'));
  doc.insert(rect('c'),undefined,2);
  assert.deepEqual(ids(doc.getChildren()), ['a','b','c','d']);
  const group = new Group('g');
  doc.insert(group);
  doc.insert(rect('y'),'g');
  doc.insert(rect('x'),'g',0);
  doc.insert(rect('z'),'g',2);
  assert.deepEqual(ids(group.getChildren()), ['x','y','z']);
  verify(doc);
});

test('duplicate IDs across document subtrees reject the entire insertion', () => {
  const doc = new SvgDocument();
  doc.insert(rect('taken'));
  const newLeaf = rect('new');
  const candidate = new Group('g',[newLeaf, rect('taken')]);
  const before = snapshot(doc);
  assert.throws(() => doc.insert(candidate), /id already exists: taken/);
  assert.deepEqual(snapshot(doc), before);
  assert.equal(doc.findById('g'),undefined);
  assert.equal(doc.findById('new'),undefined);
  assert.equal(candidate.getParent(),undefined);
  // No ownership leaked to earlier nodes during the failed validation.
  const other = new SvgDocument();
  other.insert(candidate);
  verify(other);
});

test('duplicate IDs within an incoming subtree, including group vs child, are rejected', () => {
  for (const candidate of [new Group('g',[rect('x'),rect('x')]), new Group('same',[rect('same')])]) {
    const doc = new SvgDocument();
    assert.throws(() => doc.insert(candidate), /id already exists/);
    assert.equal(doc.getElementCount(),0);
    assert.deepEqual(doc.getChildren(),[]);
    assert.equal(candidate.getParent(),undefined);
  }
});

test('invalid parent and insertion positions do not attach or claim candidates', () => {
  const doc = new SvgDocument();
  doc.insert(rect('leaf'));
  const candidate = rect('new');
  const before = snapshot(doc);
  assert.throws(() => doc.insert(candidate,'missing'), /no such container: missing/);
  assert.throws(() => doc.insert(candidate,'leaf'), /not a container: leaf/);
  for (const position of [-1,2,0.5,NaN,Infinity]) {
    assert.throws(() => doc.insert(candidate,undefined,position), /invalid child position/);
    assert.deepEqual(snapshot(doc),before);
    assert.equal(candidate.getParent(),undefined);
  }
  new SvgDocument().insert(candidate);
});

test('attached child cannot be inserted separately', () => {
  const child = rect('child');
  const group = new Group('g',[child]);
  const doc = new SvgDocument();
  assert.throws(() => doc.insert(child), /already has a parent/);
  assert.equal(child.getParent(),group);
  assert.equal(doc.getElementCount(),0);
});

test('owned root cannot be reused in another document or a detached Group', () => {
  const a = new SvgDocument();
  const b = new SvgDocument();
  const root = new Group('root',[rect('leaf')]);
  a.insert(root);
  const before = snapshot(a);
  assert.throws(() => a.insert(root), /already belongs to a document/);
  assert.throws(() => b.insert(root), /already belongs to a document/);
  const free = rect('free');
  assert.throws(() => new Group('wrapper',[free,root]), /already belongs to a document/);
  assert.equal(free.getParent(),undefined);
  assert.equal(root.getParent(),undefined);
  assert.deepEqual(snapshot(a),before);
  assert.equal(b.getElementCount(),0);
  verify(a);
});

test('remove nested subtree clears all its IDs and retains internal links', () => {
  const leaf = rect('leaf');
  const nested = new Group('nested',[leaf]);
  const root = new Group('root',[rect('before'),nested,rect('after')]);
  const doc = new SvgDocument();
  doc.insert(root);
  const location = doc.getLocation('nested');
  assert.deepEqual(location,{parentId:'root',index:1});
  const removed = doc.remove('nested');
  assert.equal(removed,nested);
  assert.equal(removed.getParent(),undefined);
  assert.equal(leaf.getParent(),nested);
  assert.equal(doc.findById('nested'),undefined);
  assert.equal(doc.findById('leaf'),undefined);
  assert.deepEqual(ids(root.getChildren()),['before','after']);
  verify(doc);
  doc.insert(removed,location.parentId,location.index);
  assert.deepEqual(ids(root.getChildren()),['before','nested','after']);
  assert.equal(doc.getShape('leaf'),leaf);
  verify(doc);
});

test('removed subtree can transfer to a different document', () => {
  const a = new SvgDocument();
  const b = new SvgDocument();
  a.insert(new Group('g',[rect('r')]));
  b.insert(a.remove('g'));
  assert.equal(a.getElementCount(),0);
  assert.equal(a.findById('r'),undefined);
  assert.equal(b.getElementCount(),2);
  verify(a); verify(b);
});

test('remove unknown ID preserves the document', () => {
  const doc = new SvgDocument();
  doc.insert(rect('r'));
  const before = snapshot(doc);
  assert.throws(() => doc.remove('missing'), /no such shape: missing/);
  assert.deepEqual(snapshot(doc),before);
  verify(doc);
});

test('removing the only root permits reusing its ID for a new object', () => {
  const doc = new SvgDocument();
  const old = rect('r');
  doc.insert(old);
  assert.equal(doc.remove('r'),old);
  const replacement = rect('r');
  doc.insert(replacement);
  assert.equal(doc.getShape('r'),replacement);
  assert.throws(() => doc.insert(old), /id already exists: r/);
  verify(doc);
});

test('move subtree across parents, then to root, preserves identity, geometry and index', () => {
  const moving = new Group('moving',[rect('leaf')]);
  const a = new Group('a',[rect('left'),moving]);
  const b = new Group('b',[rect('right')]);
  const doc = new SvgDocument();
  doc.insert(a); doc.insert(b);
  const attributes = doc.getShape('leaf').getAttributes();
  doc.reparent('moving','b',0);
  assert.deepEqual(ids(a.getChildren()),['left']);
  assert.deepEqual(ids(b.getChildren()),['moving','right']);
  assert.equal(moving.getParent(),b);
  assert.deepEqual(doc.getShape('leaf').getAttributes(),attributes);
  verify(doc);
  doc.reparent('moving',undefined,1);
  assert.deepEqual(ids(doc.getChildren()),['a','moving','b']);
  assert.deepEqual(ids(b.getChildren()),['right']);
  assert.equal(moving.getParent(),undefined);
  verify(doc);
});

test('move a root into a container and keep inherited-style inputs unchanged', () => {
  const doc = new SvgDocument();
  const root = rect('r');
  const group = new Group('g');
  group.setAttribute('fill','blue');
  doc.insert(root); doc.insert(group);
  doc.reparent('r','g');
  assert.deepEqual(ids(doc.getChildren()),['g']);
  assert.equal(Object.hasOwn(root.getAttributes(),'fill'),false);
  group.move(5,6);
  assert.equal(root.getAttributes().x,15);
  assert.equal(root.getAttributes().y,26);
  verify(doc);
});

test('same-parent positions refer to the final sibling list', () => {
  for (const parentId of [undefined,'g']) {
    const doc = new SvgDocument();
    if (parentId) doc.insert(new Group(parentId));
    for (const id of ['a','b','c','d']) doc.insert(rect(id),parentId);
    const children = () => parentId ? doc.getShape(parentId).getChildren() : doc.getChildren();
    doc.reparent('b',parentId,2);
    assert.deepEqual(ids(children()),['a','c','b','d']);
    doc.reparent('d',parentId,0);
    assert.deepEqual(ids(children()),['d','a','c','b']);
    doc.reparent('d',parentId);
    assert.deepEqual(ids(children()),['a','c','b','d']);
    doc.reparent('c',parentId,1);
    assert.deepEqual(ids(children()),['a','c','b','d']);
    verify(doc);
  }
});

test('self/descendant destinations reject cycles without mutation', () => {
  const doc = new SvgDocument();
  doc.insert(new Group('a',[new Group('b',[new Group('c',[rect('r')])])]));
  const before = snapshot(doc);
  for (const [source,target] of [['a','a'],['a','b'],['a','c'],['b','c']]) {
    assert.throws(() => doc.reparent(source,target), /itself or its descendant/);
    assert.deepEqual(snapshot(doc),before);
    verify(doc);
  }
});

test('invalid reparent targets or positions preserve source, destination and index', () => {
  const doc = new SvgDocument();
  doc.insert(new Group('g',[rect('a'),rect('b')]));
  doc.insert(new Group('empty'));
  const before = snapshot(doc);
  for (const action of [
    () => doc.reparent('missing','g'),
    () => doc.reparent('a','missing'),
    () => doc.reparent('a','b'),
    () => doc.reparent('a','empty',1),
    () => doc.reparent('a','g',2),
    () => doc.reparent('a','g',-1),
    () => doc.reparent('a','g',0.5),
    () => doc.reparent('a',undefined,Infinity)
  ]) {
    assert.throws(action);
    assert.deepEqual(snapshot(doc),before);
    verify(doc);
  }
});

test('front appends and back prepends within the existing parent only', () => {
  const doc = new SvgDocument();
  const group = new Group('g',[rect('a'),rect('b'),rect('c')]);
  doc.insert(group); doc.insert(rect('outside'));
  doc.bringToFront('a');
  assert.deepEqual(ids(group.getChildren()),['b','c','a']);
  doc.bringToFront('a');
  doc.sendToBack('c');
  doc.sendToBack('c');
  assert.deepEqual(ids(group.getChildren()),['c','b','a']);
  assert.deepEqual(ids(doc.getChildren()),['g','outside']);
  doc.bringToFront('g');
  assert.deepEqual(ids(doc.getChildren()),['outside','g']);
  doc.sendToBack('g');
  assert.deepEqual(ids(doc.getChildren()),['g','outside']);
  verify(doc);
});

test('document children, group children and locations cannot mutate structure externally', () => {
  const doc = new SvgDocument();
  const group = new Group('g');
  doc.insert(group);
  const roots = doc.getChildren();
  const children = group.getChildren();
  const location = doc.getLocation('g');
  assert.throws(() => roots.push(rect('bad')),TypeError);
  assert.throws(() => children.push(rect('bad')),TypeError);
  assert.throws(() => { location.index = 9; },TypeError);
  doc.insert(rect('new'),'g');
  assert.equal(children.length,0); // Older queries remain stable snapshots.
  assert.deepEqual(ids(group.getChildren()),['new']);
  verify(doc);
});

test('mixed operations keep index, count and all parent links consistent', () => {
  const doc = new SvgDocument(400,300);
  doc.insert(new Group('one')); doc.insert(new Group('two'));
  for (let i=0;i<30;i++) doc.insert(rect(`r${i}`),i%2 ? 'one' : 'two');
  verify(doc);
  for (let i=0;i<30;i++) {
    doc.reparent(`r${i}`,i%3 ? 'one' : undefined);
    doc.bringToFront(`r${i}`);
    verify(doc);
  }
  for (let i=0;i<30;i+=2) {
    const removed = doc.remove(`r${i}`);
    assert.equal(doc.findById(`r${i}`),undefined);
    verify(doc);
    doc.insert(removed,'two',0);
    verify(doc);
  }
});
