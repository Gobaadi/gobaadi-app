/**
 * Rewrites `import { Text, TextInput } from 'react-native'` in app source to
 * the language-aware wrappers in src/components/app-text.tsx, so every Text/
 * TextInput inherits the active language font family (Google Sans for en,
 * Noto Sans Bengali for bn) without per-file edits.
 *
 * Skips node_modules. Explicit fontFamily in component styles still wins
 * because the wrapper merges its default before the style prop.
 */
module.exports = function babelPluginAppText({ types: t }) {
  const WRAPPER_MODULE = '@/components/app-text';
  const MAP = { Text: 'AppText', TextInput: 'AppTextInput' };

  return {
    visitor: {
      ImportDeclaration(path, state) {
        const filename = state.file.opts.filename || '';
        if (filename.includes('node_modules')) return;
        // The wrapper must import the real RN components — never rewrite itself.
        if (filename.replace(/\\/g, '/').endsWith('src/components/app-text.tsx')) return;
        if (path.node.source.value !== 'react-native') return;
        if (path.node.importKind === 'type') return;

        const named = path.node.specifiers.filter(
          (s) =>
            s.type === 'ImportSpecifier' &&
            s.importKind !== 'type' &&
            MAP[s.imported.name || s.imported.value]
        );
        if (named.length === 0) return;

        const wrapperSpecs = named.map((s) =>
          t.importSpecifier(t.identifier(s.local.name), t.identifier(MAP[s.imported.name || s.imported.value]))
        );
        path.insertBefore(t.importDeclaration(wrapperSpecs, t.stringLiteral(WRAPPER_MODULE)));

        path.node.specifiers = path.node.specifiers.filter((s) => !named.includes(s));
        if (path.node.specifiers.length === 0) path.remove();
      },
    },
  };
};
