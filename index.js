function nukable(babel) {
  const { types: t } = babel;

  return {
    name: "nukable-import",
    visitor: {
      Program(path, state) {
        let { bindings } = path.scope;
        let { opts } = state;

        let bindingsToStrip = Object.keys(bindings).filter(b => {
          let binding = bindings[b];
          return binding.kind === 'module' && binding.path.parentPath.node.source.value === opts.source;
        });

        bindingsToStrip.forEach(b => {
          let binding = bindings[b];
          binding.referencePaths.forEach(p => {
            if (t.isVariableDeclarator(p.parentPath.parentPath)) {
              if (opts.delegate && opts.delegate[p.node.name]) {
                opts.delegate[p.node.name](p, t);
              } else {
                p.parentPath.replaceWith(p.parentPath.node.arguments[0]);
              }
            } else {
              if (t.isCallExpression(p.parentPath)) {
                let _hasNestedBinding = hasNestedBinding(p.parentPath, bindingsToStrip);
                if (!_hasNestedBinding || !isCallee(p)) {
                  p.parentPath.remove();
                }
              } else {
                p.remove();
              }
            }
          });
        });
      },

      ImportDeclaration(path, state) {
        if (path.node.source.value === state.opts.source) {
          path.remove();
        }
      }
    }
  };
}

function isCallee(path) {
  return path.parentPath.node.callee.name === path.node.name
}

function hasNestedBinding(path, bindingsToStrip) {
  let { arguments } = path.node;
  return arguments.some(arg => bindingsToStrip.indexOf(arg.name) > -1)
}

nukable.baseDir = function() {
  return __dirname;
}

module.exports = nukable;
