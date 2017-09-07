const nameResolver = require('amd-name-resolver').moduleResolve;

function nukable(babel) {
  const { types: t } = babel;

  return {
    name: "nukable-import",
    visitor: {
      Program: {
        enter(path, state) {
          let { bindings } = path.scope;
          let { opts } = state;
          let bindingsToStrip = state.opts.bindingsToStrip = Object.keys(bindings).filter(b => {
            let binding = bindings[b];
            return binding.kind === 'module' && binding.path.parentPath.node.source.value === opts.source;
          });
          state.opts.bindingPaths = bindingsToStrip.map((b) => bindings[b].referencePaths).reduce((a, b) => { return b.concat(a)}, []);
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

      Identifier(path, state) {
        let { delegate, bindingPaths } = state.opts;
        if (delegate && bindingPaths.indexOf(path) > -1) {
          delegate(path.node.name, path, t);
        }
      },

      CallExpression(path, state) {
        let { delegate } = state.opts;
        let removable = path.find((p) => {
          return state.opts.bindingPaths.indexOf(p.get('callee')) > -1;
        });

        if (removable) {
          let { container } = removable;
          if (t.isVariableDeclarator(container) ||
              t.isMemberExpression(container) ||
              t.isAssignmentExpression(container)) {
              if (delegate) {
                delegate(path.node.callee.name, path.get('callee'), t);
              } else {
                path.replaceWith(path.node.arguments[0]);
              }
          } else {
            if (t.isCallExpression(removable.parent) && state.opts.bindingsToStrip.indexOf(removable.parent.callee.name) === -1) {
              if (delegate) {
                delegate(path.node.callee.name, path.get('callee'), t);
              } else {
                path.replaceWith(path.node.arguments[0]);
              }
            } else {
              if (delegate) {
                delegate(path.node.callee.name, path.get('callee'), t);
              } else {
                path.remove();
              }
            }
          }
        }
      },

      ExportDeclaration(path, state) {
        if (path.node.source) {
          let resolvedName = nameResolver(path.node.source.value, this.getModuleName());
          if (resolvedName === state.opts.source) {
            path.remove();
          }
        }
      },

      ImportDeclaration(path, state) {
        let source = path.node.source.value;

        if (source.charAt(0) === '.') {
          source = nameResolver(source, this.getModuleName());
        }

        if (source === state.opts.source && path.node.specifiers.length === 0) {
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

function isArgument(path, t) {
  return (t.isCallExpression(path.parentPath) ||
         t.isMemberExpression(path.parentPath)) && path.parentPath.node.arguments.indexOf(path.node) > -1;
}

nukable.baseDir = function() {
  return __dirname;
}

module.exports = nukable;
