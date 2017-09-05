Allows you to remove bindings from a specific import declaration source.

## Example

```
import { expectStackChange, assert } from '@glimmer/util';

APPEND_OPCODES.app(123, (vm) => {
  let { stack } = vm;
  expectStackChange(stack, 0, 'PrimitiveReference');
  let value = assert(stack.pop(), 'Must have a value');
});
```

Will be compiled as:

```
import { expectStackChange, assert } from '@glimmer/util';

APPEND_OPCODES.app(123, (vm) => {
  let { stack } = vm;
  let value = stack.pop();
});
```

## Basic Usage

```
plugins: [
  ['nukable-import', { source: '@glimmer/debug' }]
]
```
