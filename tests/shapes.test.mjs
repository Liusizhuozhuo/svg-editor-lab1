import test from 'node:test';
import assert from 'node:assert/strict';
import { Rect } from '../dist/domain/shapes/Rect.js';
import { Circle } from '../dist/domain/shapes/Circle.js';
import { Ellipse } from '../dist/domain/shapes/Ellipse.js';
import { Line } from '../dist/domain/shapes/Line.js';
import { TextShape } from '../dist/domain/shapes/TextShape.js';
import { Group } from '../dist/domain/shapes/Group.js';
import { DomainError } from '../dist/domain/DomainError.js';

const geometries = [
  ['rectangle', () => new Rect('r', 10, 20, 100, 50),
    { x: 13, y: 18, width: 100, height: 50 },
    { x: 26, y: 36, width: 200, height: 100 }],
  ['circle', () => new Circle('c', 10, 20, 5),
    { cx: 13, cy: 18, r: 5 }, { cx: 26, cy: 36, r: 10 }],
  ['ellipse', () => new Ellipse('e', 10, 20, 5, 8),
    { cx: 13, cy: 18, rx: 5, ry: 8 }, { cx: 26, cy: 36, rx: 10, ry: 16 }],
  ['line', () => new Line('l', 10, 20, 30, 40),
    { x1: 13, y1: 18, x2: 33, y2: 38 }, { x1: 26, y1: 36, x2: 66, y2: 76 }],
  ['text', () => new TextShape('t', 10, 20, 'hello world'),
    { x: 13, y: 18, text: 'hello world' }, { x: 26, y: 36, text: 'hello world' }]
];

for (const [name, create, moved, scaled] of geometries) {
  test(`${name}: move and scale position and dimensions via the same API`, () => {
    const shape = create();
    shape.move(3, -2);
    assert.deepEqual(shape.getAttributes(), moved);
    shape.scale(2);
    assert.deepEqual(shape.getAttributes(), scaled);
  });
}

test('all six types expose stable identity and SVG type names', () => {
  const shapes = [new Rect('r',0,0,1,1), new Circle('c',0,0,1),
    new Ellipse('e',0,0,1,2), new Line('l',0,0,1,1),
    new TextShape('t',0,0,''), new Group('g')];
  assert.deepEqual(shapes.map(s => s.getType()), ['rect','circle','ellipse','line','text','g']);
  assert.deepEqual(shapes.map(s => s.getId()), ['r','c','e','l','t','g']);
  for (const shape of shapes) {
    assert.throws(() => shape.setAttribute('id', 'changed'), /unknown attribute: id/);
  }
  assert.equal(new Group('G').getId(), 'G');
});

test('nested groups transform each leaf once and preserve ordered structure', () => {
  const rect = new Rect('r', 10, 20, 100, 50);
  const text = new TextShape('t', 15, 25, 'Start');
  const node = new Group('node', [rect, text]);
  const line = new Line('l', 0, 0, 20, 30);
  const scene = new Group('scene', [node, line]);
  scene.move(5, -10);
  scene.scale(0.5);
  assert.deepEqual(rect.getAttributes(), {x:7.5,y:5,width:50,height:25});
  assert.deepEqual(text.getAttributes(), {x:10,y:7.5,text:'Start'});
  assert.deepEqual(line.getAttributes(), {x1:2.5,y1:-5,x2:12.5,y2:10});
  assert.deepEqual(scene.getChildren(), [node, line]);
  assert.equal(rect.getParent(), node);
  assert.equal(node.getParent(), scene);
  assert.equal(scene.getParent(), undefined);
  assert.deepEqual(scene.getAttributes(), {});
});

test('moving a nested group only changes that subtree', () => {
  const a = new Circle('a', 0, 0, 2);
  const b = new Rect('b', 10, 20, 30, 40);
  const inner = new Group('inner', [a]);
  new Group('outer', [inner, b]);
  inner.move(2, 3);
  assert.deepEqual(a.getAttributes(), {cx:2, cy:3, r:2});
  assert.deepEqual(b.getAttributes(), {x:10,y:20,width:30,height:40});
});

test('default styles stay absent; optional constructors and shared styles work', () => {
  const rect = new Rect('r', 0, 0, 1, 1);
  assert.equal(Object.hasOwn(rect.getAttributes(), 'fill'), false);
  assert.equal(Object.hasOwn(rect.getAttributes(), 'stroke'), false);
  assert.equal(new Circle('c',0,0,1,'red').getAttributes().fill, 'red');
  assert.equal(new Ellipse('e',0,0,1,2,'blue').getAttributes().fill, 'blue');
  assert.equal(new Line('l',0,0,1,1,'black').getAttributes().stroke, 'black');
  for (const shape of [rect, new Group('g')]) {
    shape.setAttribute('fill', '#fff');
    shape.setAttribute('stroke', 'black');
    shape.setAttribute('stroke-width', '1.5');
    shape.scale(2);
    assert.equal(shape.getAttributes().fill, '#fff');
    assert.equal(shape.getAttributes()['stroke-width'], 1.5);
  }
});

test('group style changes do not overwrite explicit child colors', () => {
  const explicit = new Rect('r', 0, 0, 1, 1, 'red');
  const inheriting = new Circle('c', 0, 0, 1);
  const group = new Group('g', [explicit, inheriting]);
  group.setAttribute('fill', 'blue');
  assert.equal(group.getAttributes().fill, 'blue');
  assert.equal(explicit.getAttributes().fill, 'red');
  assert.equal(Object.hasOwn(inheriting.getAttributes(), 'fill'), false);
});

test('each shape supports its own geometry whitelist', () => {
  const cases = [
    [new Rect('r',0,0,1,1), ['x','y','width','height']],
    [new Circle('c',0,0,1), ['cx','cy','r']],
    [new Ellipse('e',0,0,1,2), ['cx','cy','rx','ry']],
    [new Line('l',0,0,1,1), ['x1','y1','x2','y2']],
    [new TextShape('t',0,0,''), ['x','y']]
  ];
  for (const [shape, names] of cases) {
    for (const name of names) {
      shape.setAttribute(name, '2.5');
      assert.equal(shape.getAttributes()[name], 2.5);
    }
    const before = shape.getAttributes();
    assert.throws(() => shape.setAttribute('transform', 'scale(2)'), /unknown attribute/);
    assert.deepEqual(shape.getAttributes(), before);
  }
  assert.throws(() => new Group('g').setAttribute('width', 5), /unknown attribute: width/);
  assert.throws(() => new Circle('c',0,0,1).setAttribute('x', 5), /unknown attribute: x/);
  assert.throws(() => new Rect('r',0,0,1,1).setAttribute('text', 'x'), /unknown attribute: text/);
});

test('text content preserves whitespace, empty strings and XML-sensitive characters', () => {
  const text = new TextShape('t', 0, 0, '  A & B < C "quoted"  ');
  assert.equal(text.getAttributes().text, '  A & B < C "quoted"  ');
  text.setAttribute('text', '');
  assert.equal(text.getAttributes().text, '');
  assert.throws(() => text.setAttribute('text', 12), /text must be a string/);
  assert.equal(text.getAttributes().text, '');
});

test('fractional and negative coordinates are supported; zero sizes are permitted', () => {
  const rect = new Rect('r', -1.5, -2, 0, 0);
  rect.move(0.25, -0.5);
  rect.scale(0.5);
  assert.deepEqual(rect.getAttributes(), {x:-0.625, y:-1.25, width:0, height:0});
  const line = new Line('l', -5, -6, -1, -2);
  line.scale(2);
  assert.deepEqual(line.getAttributes(), {x1:-10,y1:-12,x2:-2,y2:-4});
});

test('invalid constructor geometry is rejected', () => {
  for (const create of [
    () => new Rect('r',0,0,-1,1), () => new Rect('r',0,0,1,-1),
    () => new Circle('c',0,0,-1), () => new Ellipse('e',0,0,-1,1),
    () => new Ellipse('e',0,0,1,-1), () => new Line('l',0,NaN,1,1),
    () => new TextShape('t',Infinity,0,'')
  ]) assert.throws(create, DomainError);
});

test('IDs must be nonempty and whitespace-free', () => {
  for (const id of ['', 'a b', 'a\nb', '\t']) {
    assert.throws(() => new Group(id), /id must be non-empty/);
  }
});

test('invalid attribute values preserve previous state', () => {
  const rect = new Rect('r', 1, 2, 3, 4, 'red');
  rect.setAttribute('stroke-width', 2);
  for (const [name, value] of [
    ['width',-1], ['height',NaN], ['x',''], ['x','   '], ['x','12px'],
    ['x','Infinity'], ['x','0x10'], ['y',Infinity], ['stroke-width',-1], ['fill',42]
  ]) {
    const before = rect.getAttributes();
    assert.throws(() => rect.setAttribute(name, value), DomainError);
    assert.deepEqual(rect.getAttributes(), before);
  }
  rect.setAttribute('x', '-1.25e2');
  assert.equal(rect.getAttributes().x, -125);
});

test('invalid transform arguments fail for both leaves and empty groups', () => {
  for (const shape of [new Rect('r',1,2,3,4), new Group('g')]) {
    const before = shape.getAttributes();
    for (const factor of [0, -1, NaN, Infinity, -Infinity]) {
      assert.throws(() => shape.scale(factor), /^DomainError: scale factor must be positive$/);
    }
    assert.throws(() => shape.move(NaN, 1), /dx must be a finite number/);
    assert.throws(() => shape.move(1, Infinity), /dy must be a finite number/);
    assert.deepEqual(shape.getAttributes(), before);
  }
});

test('leaf overflow does not partially update earlier coordinates', () => {
  const line = new Line('l', 1, 2, Number.MAX_VALUE, 4);
  const before = line.getAttributes();
  assert.throws(() => line.scale(2), /x2 must be a finite number/);
  assert.deepEqual(line.getAttributes(), before);
  assert.throws(() => line.move(Number.MAX_VALUE, 5), /x2 must be a finite number/);
  assert.deepEqual(line.getAttributes(), before);
});

test('nested subtree overflow leaves every earlier sibling unchanged', () => {
  const normal = new Rect('r', 1, 2, 3, 4);
  const huge = new Circle('c', Number.MAX_VALUE, 10, 3);
  const root = new Group('root', [normal, new Group('inner', [huge])]);
  const before = [normal.getAttributes(), huge.getAttributes()];
  assert.throws(() => root.scale(2), /finite number/);
  assert.deepEqual([normal.getAttributes(), huge.getAttributes()], before);
  assert.throws(() => root.move(Number.MAX_VALUE, 2), /finite number/);
  assert.deepEqual([normal.getAttributes(), huge.getAttributes()], before);
});

test('attribute snapshots cannot mutate model and do not change retroactively', () => {
  const rect = new Rect('r', 1, 2, 3, 4);
  const snapshot = rect.getAttributes();
  assert.throws(() => { snapshot.x = 999; }, TypeError);
  rect.move(10, 0);
  assert.equal(snapshot.x, 1);
  assert.equal(rect.getAttributes().x, 11);
});

test('groups copy constructor arrays and expose immutable ordered children', () => {
  const rect = new Rect('r',0,0,1,1);
  const input = [rect];
  const group = new Group('g', input);
  input.length = 0;
  assert.deepEqual(group.getChildren(), [rect]);
  assert.throws(() => group.getChildren().push(group), TypeError);
  assert.throws(() => rect.getChildren().push(group), TypeError);
});

test('duplicate object references fail without assigning any parent', () => {
  const rect = new Rect('r',0,0,1,1);
  assert.throws(() => new Group('g', [rect, rect]), /duplicate child/);
  assert.equal(rect.getParent(), undefined);
});

test('sharing a child between groups fails atomically', () => {
  const owned = new Circle('owned',0,0,1);
  const owner = new Group('owner', [owned]);
  const free = new Circle('free',0,0,1);
  assert.throws(() => new Group('invalid', [free, owned]), /already has a parent/);
  assert.equal(free.getParent(), undefined);
  assert.equal(owned.getParent(), owner);
});

test('selecting an ancestor and its descendant cannot build an aliased tree', () => {
  const leaf = new Circle('leaf',0,0,1);
  const inner = new Group('inner', [leaf]);
  assert.throws(() => new Group('outer', [inner, leaf]), /already has a parent/);
  assert.equal(inner.getParent(), undefined);
  assert.equal(leaf.getParent(), inner);
});
