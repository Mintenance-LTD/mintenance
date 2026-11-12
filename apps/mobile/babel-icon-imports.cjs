// Metro includes every font when it traverses the vector-icons barrel.
// Preserve each local binding while importing only its selected icon family.
module.exports = function iconImports({ types: t }) {
  return {
    visitor: {
      ImportDeclaration(p) {
        if (
          p.node.source.value !== '@expo/vector-icons' ||
          p.node.importKind === 'type'
        )
          return;
        const declarations = [];
        const remaining = [];
        for (const specifier of p.node.specifiers) {
          if (
            !t.isImportSpecifier(specifier) ||
            specifier.importKind === 'type'
          ) {
            remaining.push(specifier);
            continue;
          }
          const family = specifier.imported.name || specifier.imported.value;
          // These exports have equivalent default-export entry points.
          if (
            ![
              'AntDesign',
              'Entypo',
              'EvilIcons',
              'Feather',
              'FontAwesome',
              'FontAwesome5',
              'FontAwesome6',
              'Fontisto',
              'Foundation',
              'Ionicons',
              'MaterialCommunityIcons',
              'MaterialIcons',
              'Octicons',
              'SimpleLineIcons',
              'Zocial',
            ].includes(family)
          ) {
            remaining.push(specifier);
            continue;
          }
          declarations.push(
            t.importDeclaration(
              [t.importDefaultSpecifier(t.cloneNode(specifier.local))],
              t.stringLiteral('@expo/vector-icons/' + family)
            )
          );
        }
        if (!declarations.length) return;
        if (remaining.length)
          declarations.push(
            t.importDeclaration(remaining, t.cloneNode(p.node.source))
          );
        p.replaceWithMultiple(declarations);
      },
    },
  };
};
