[![Build Status](https://travis-ci.org/chadhietala/babel-plugin-nukable-import.svg?branch=master)](https://travis-ci.org/chadhietala/babel-plugin-nukable-import)

Allows you to remove bindings from a specific import declaration source. The source is also used to remove any exports as well.

## Example

```js
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

```js
APPEND_OPCODES.app(123, (vm) => {
  let { stack } = vm;
  let mgr = stack.pop();
  mgr.didRenderLayout();
  stack.pop();
});
```

## Basic Usage

```
{
  moduleIds: true,
  getModuleId() { ... },
  plugins: [
    ['nukable-import', { source: '@glimmer/debug' }]
  ]
}
```

## Advanced Usage

If you need fine grain control over the bindings, you can implement a delegate that will be shown all the bindings that are `CallExpressions` and `Identifiers`. Note, this should be used for one-offs like removing a specific binding from from a specific source.

```
{
  moduleIds: true,
  getModuleId() { ... },
  plugins: [
    ['nukable-import', {
      source: '@glimmer/vm',
      delegate(bindingName, path, types) {
        if (bindingName === 'META_DATA') {
          path.remove();
        }
      }
    }]
  ]
}
```
