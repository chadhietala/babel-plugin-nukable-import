[![Build Status](https://travis-ci.org/chadhietala/babel-plugin-nukable-import.svg?branch=master)](https://travis-ci.org/chadhietala/babel-plugin-nukable-import)

Allows you to remove bindings from a specific import declaration source.

## Example

```
import {
  expectStackChange,
  assert,
  check,
  CheckInterface,
  CheckFunction
} from '@glimmer/debug';

APPEND_OPCODES.app(123, (vm) => {
  let { stack } = vm;
  let mgr = check(stack.pop(), CheckInterface({ didRenderLayout: CheckFunction }));
  mgr.didRenderLayout();
  assert(stack.pop(), 'Must have a value');
  expectStackChange(stack, -2, 'PrimitiveReference');
});
```

Will be compiled as:

```
APPEND_OPCODES.app(123, (vm) => {
  let { stack } = vm;
  let mgr = stack.pop();
  mgr.didRenderLayout();
  stack.pop();
});
```

## Basic Usage

```
plugins: [
  ['nukable-import', { source: '@glimmer/debug' }]
]
```
