const QUnit = require('qunitjs');
const resolver = require('amd-name-resolver').moduleResolve;
const babel = require('babel-core');
const Nukable = require('./index');

function stripTight(strings) {
  return strings[0].split('\n').map(s => s.trim()).join('');
}

let transform;
QUnit.module('Strip stackCheck', {
  beforeEach() {
    transform = function(code, options = {}) {
      return babel.transform(code, {
        filename: 'test',
        moduleId: true,
        getModuleId: resolver,
        plugins: [[Nukable, Object.assign({
          source: '@glimmer/debug'
        }, options)]]
      }).code;
    }
  }
});

QUnit.test('strips imports', (assert) => {
  let transformed = transform(stripTight`
    import { a, b } from '@glimmer/debug';
    let stack = [{value() {}}];
    a(stack);
    b(stack[0]);
  `);

  assert.equal(transformed, stripTight`
    let stack = [{ value() {} }];
  `)
});

QUnit.test('assigns param one as assignment by default', (assert) => {
  let transformed = transform(stripTight`
    import { a } from '@glimmer/debug';
    let stack = [{value() {}}];
    let bStack = a(stack);
  `);

  assert.equal(transformed, stripTight`
    let stack = [{ value() {} }];
    let bStack = stack;
  `)
});

QUnit.test('something expressions', (assert) => {
  let transformed = transform(stripTight`
    import { a } from '@glimmer/debug';
    let stack = [{value() {}}];
    let foo = 1;
    let bStack = a(stack) - foo;
  `);

  assert.equal(transformed, stripTight`
    let stack = [{ value() {} }];
    let foo = 1;
    let bStack = stack - foo;
  `)
});

QUnit.test('handles AssignmentExpression', (assert) => {
  let transformed = transform(stripTight`
    import { a } from '@glimmer/debug';
    let stack = [{value() {}}];
    let bStack;
    bStack = a(1);
  `);

  assert.equal(transformed, stripTight`
    let stack = [{ value() {} }];
    let bStack;
    bStack = 1;
  `)
});

QUnit.test('handles strippable as argument', (assert) => {
  let transformed = transform(stripTight`
    import { a } from '@glimmer/debug';
    const id = int => int;
    id(a(1));
  `);

  assert.equal(transformed, stripTight`
    const id = int => int;
    id(1);
  `)
});

QUnit.test('handles recursive removals', (assert) => {
  let transformed = transform(stripTight`
    import { a, b } from '@glimmer/debug';
    let A = 1 + 1;
    a('wat');
    a('lol', b);
  `);

  assert.equal(transformed, stripTight`
    let A = 1 + 1;
  `)
});

QUnit.test('follows aliases', (assert) => {
  let transformed = transform(stripTight`
    import { a, b as inyoface } from '@glimmer/debug';
    let A = 1 + 1;
    a('wat');
    a('lol', inyoface);
  `);

  assert.equal(transformed, stripTight`
    let A = 1 + 1;
  `)
});

QUnit.test('cleans unused imports', (assert) => {
  let transformed = transform(stripTight`
    import { a, b } from '@glimmer/debug';
    import bar from './bar';
    let A = 1 + 1;
    a('wat');
    a('lol', bar);
  `);

  assert.equal(transformed, stripTight`
    let A = 1 + 1;
  `)
});

QUnit.test('retains member expressions', (assert) => {
  let transformed = transform(stripTight`
    import { a, b } from '@glimmer/debug';
    import bar from './bar';
    let A = 1 + 1;
    a('wat').split('').forEach(l => console.log(l));
  `);

  assert.equal(transformed, stripTight`
    let A = 1 + 1;
    'wat'.split('').forEach(l => console.log(l));
  `)
});

QUnit.test('retains member expressions recursive', (assert) => {
  let transformed = transform(stripTight`
    import { a, b } from '@glimmer/debug';
    import bar from './bar';
    let A = 1 + 1;
    a('wat', b).split('').forEach(l => console.log(l));
  `);

  assert.equal(transformed, stripTight`
    let A = 1 + 1;
    'wat'.split('').forEach(l => console.log(l));
  `)
});

QUnit.test('handles bindings in nested object literals', (assert) => {
  let transformed = transform(stripTight`
    import { a, bro } from '@glimmer/debug';
    let A = 1 + 1;
    a('really wycats', { yes: bro });
  `);

  assert.equal(transformed, stripTight`
    let A = 1 + 1;
  `)
});

QUnit.test('prunes exports', (assert) => {
  let transformed = transform(stripTight`
    export { a, bro } from '@glimmer/debug';
    let A = 1 + 1;
  `);

  assert.equal(transformed, stripTight`
    let A = 1 + 1;
  `)
});

QUnit.test('delegates removals of call expressions', (assert) => {
  let transformed = transform(stripTight`
    import { a, bro } from '@glimmer/debug';
    let A = 1 + 1;
    bro('wat');
    a(1);
  `, {
    delegate(name, path) {
      if (name !== 'bro') {
        path.parentPath.remove();
      }
    }
  });

  assert.equal(transformed, stripTight`
    import { bro } from '@glimmer/debug';
    let A = 1 + 1;
    bro('wat');
  `)
});

QUnit.test('delegates removals of identifiers', (assert) => {
  let transformed = transform(stripTight`
    import { a, bro } from '@glimmer/debug';
    let A = 1 + 1;
    let meta = bro[A];
    meta ? a(1) : null;
  `, {
    delegate(name, path, t) {
      if (name !== 'a') {
        path.parentPath.replaceWith(t.nullLiteral())
      }
    }
  });

  assert.equal(transformed, stripTight`
    import { a } from '@glimmer/debug';
    let A = 1 + 1;
    let meta = null;
    meta ? a(1) : null;
  `)
});

QUnit.test('return values are retained', (assert) => {
  let transformed = stripTight([transform(stripTight`
    import { check } from '@glimmer/debug';

    export default class PositionalArguments {
      at(position) {
        let stack = this.stack;
        return check(stack.get(position), true);
      }
    }
  `)]);

  assert.equal(transformed, stripTight`
    export default class PositionalArguments {
      at(position) {
        let stack = this.stack;
        return stack.get(position);
      }
    }
  `);
});