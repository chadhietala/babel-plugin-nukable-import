const QUnit = require('qunitjs');
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

QUnit.test('delegates for VariableAssignments', (assert) => {

  let transformed = transform(stripTight`
    import { a } from '@glimmer/debug';
    let stack = [{value() {}}];
    let bStack = a(1);
  `, {
    delegate: {
      a(path) {
        path.parentPath.parentPath.remove();
      }
    }
  });

  assert.equal(transformed, stripTight`
    let stack = [{ value() {} }];
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

