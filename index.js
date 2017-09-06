function nukable(babel) {
  const { types: t } = babel;

  return {
    name: "nukable-import",
    visitor: {
      Program: {
        enter(path, state) {
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
                    if (t.isMemberExpression(p.parentPath.parentPath)) {
                      p.parentPath.replaceWith(p.parentPath.node.arguments[0])
                    } else {
                      p.parentPath.remove();
                    }
                  }
                } else {
                  p.remove();
                }
              }
            });
          });
        },
        exit(path) {
          path.scope.crawl();
          let sourcesToClean = [];

          Object.keys(path.scope.bindings).forEach(b => {
            let binding = path.scope.bindings[b];
            if (!binding.referenced && binding.kind === 'module') {
              let source = binding.path.parentPath.node.source.value;
              if (sourcesToClean.indexOf(source) === -1) {
                sourcesToClean.push(source);
              }
              binding.path.remove();
            }
          });

          path.traverse({
            ImportDeclaration(path) {
              let source = path.node.source.value;
              if (sourcesToClean.indexOf(source) > -1 && path.node.specifiers.length === 0) {
                path.remove();
              }
            }
          });
        },
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
  let { arguments: args } = path.node;
  return args.some(arg => bindingsToStrip.indexOf(arg.name) > -1)
}

nukable.baseDir = function() {
  return __dirname;
}

module.exports = nukable;
