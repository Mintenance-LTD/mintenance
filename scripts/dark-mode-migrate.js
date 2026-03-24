#!/usr/bin/env node
/**
 * Dark mode color migration script
 * Replaces hardcoded hex colors with theme.colors.X references
 */
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..', 'apps', 'mobile', 'src', 'screens');

// Color mapping: hex -> theme.colors property
const COLOR_MAP = {
  // backgroundColor replacements
  "backgroundColor: '#FFFFFF'": "backgroundColor: theme.colors.surface",
  "backgroundColor: '#F7F7F7'": "backgroundColor: theme.colors.backgroundSecondary",
  "backgroundColor: '#F0F0F0'": "backgroundColor: theme.colors.backgroundTertiary",
  "backgroundColor: '#222222'": "backgroundColor: theme.colors.textPrimary",
  "backgroundColor: '#10B981'": "backgroundColor: theme.colors.primary",
  "backgroundColor: '#059669'": "backgroundColor: theme.colors.primaryDark",
  "backgroundColor: '#D1FAE5'": "backgroundColor: theme.colors.primaryLight",
  "backgroundColor: '#EF4444'": "backgroundColor: theme.colors.error",
  "backgroundColor: '#F59E0B'": "backgroundColor: theme.colors.accent",
  "backgroundColor: '#FEF3C7'": "backgroundColor: theme.colors.accentLight",
  "backgroundColor: '#EBEBEB'": "backgroundColor: theme.colors.border",

  // color (text) replacements
  "color: '#222222'": "color: theme.colors.textPrimary",
  "color: '#717171'": "color: theme.colors.textSecondary",
  "color: '#B0B0B0'": "color: theme.colors.textTertiary",
  "color: '#FFFFFF'": "color: theme.colors.textInverse",
  "color: '#10B981'": "color: theme.colors.primary",
  "color: '#059669'": "color: theme.colors.primaryDark",
  "color: '#EF4444'": "color: theme.colors.error",
  "color: '#F59E0B'": "color: theme.colors.accent",
  "color: '#F0F0F0'": "color: theme.colors.backgroundTertiary",
  "color: '#EBEBEB'": "color: theme.colors.border",
  "color: '#D1FAE5'": "color: theme.colors.primaryLight",
  "color: '#FEF3C7'": "color: theme.colors.accentLight",

  // border colors
  "borderBottomColor: '#EBEBEB'": "borderBottomColor: theme.colors.border",
  "borderTopColor: '#EBEBEB'": "borderTopColor: theme.colors.border",
  "borderColor: '#EBEBEB'": "borderColor: theme.colors.border",
  "borderBottomColor: '#F0F0F0'": "borderBottomColor: theme.colors.borderLight",
  "borderTopColor: '#F0F0F0'": "borderTopColor: theme.colors.borderLight",
  "borderColor: '#F0F0F0'": "borderColor: theme.colors.borderLight",

  // Inline JSX color props (with curly braces)
  'color="#222222"': 'color={theme.colors.textPrimary}',
  'color="#717171"': 'color={theme.colors.textSecondary}',
  'color="#B0B0B0"': 'color={theme.colors.textTertiary}',
  'color="#FFFFFF"': 'color={theme.colors.textInverse}',
  'color="#10B981"': 'color={theme.colors.primary}',
  'color="#059669"': 'color={theme.colors.primaryDark}',
  'color="#EF4444"': 'color={theme.colors.error}',
  'color="#F59E0B"': 'color={theme.colors.accent}',
  'color="#D1FAE5"': 'color={theme.colors.primaryLight}',

  // placeholderTextColor
  'placeholderTextColor="#B0B0B0"': 'placeholderTextColor={theme.colors.textTertiary}',
  'placeholderTextColor="#717171"': 'placeholderTextColor={theme.colors.textSecondary}',
  "placeholderColor: '#B0B0B0'": "placeholderColor: theme.colors.textTertiary",

  // textColor (Stripe CardField)
  "textColor: '#222222'": "textColor: theme.colors.textPrimary",

  // tintColor
  "tintColor: '#10B981'": "tintColor: theme.colors.primary",
  "tintColor: '#222222'": "tintColor: theme.colors.textPrimary",
  'tintColor="#10B981"': 'tintColor={theme.colors.primary}',

  // StatusBar backgroundColor
  'backgroundColor="#F7F7F7"': 'backgroundColor={theme.colors.backgroundSecondary}',
  'backgroundColor="#FFFFFF"': 'backgroundColor={theme.colors.surface}',

  // Ternary patterns in JSX
  "'#10B981' : '#717171'": "theme.colors.primary : theme.colors.textSecondary",
  "'#FFFFFF' : '#717171'": "theme.colors.textInverse : theme.colors.textSecondary",
  "'#10B981' : '#B0B0B0'": "theme.colors.primary : theme.colors.textTertiary",
  "'#FFFFFF' : '#222222'": "theme.colors.textInverse : theme.colors.textPrimary",
  "'#222222' : '#FFFFFF'": "theme.colors.textPrimary : theme.colors.textInverse",
  "'#10B981' : '#222222'": "theme.colors.primary : theme.colors.textPrimary",
  "'#10B981' : '#EBEBEB'": "theme.colors.primary : theme.colors.border",
  "'#EF4444' : '#717171'": "theme.colors.error : theme.colors.textSecondary",
  "'#10B981' : '#F7F7F7'": "theme.colors.primary : theme.colors.backgroundSecondary",
  "'#FFFFFF' : '#F7F7F7'": "theme.colors.textInverse : theme.colors.backgroundSecondary",

  // Inline style objects
  "{ color: '#10B981' }": "{ color: theme.colors.primary }",
  "{ color: '#222222' }": "{ color: theme.colors.textPrimary }",
  "{ color: '#717171' }": "{ color: theme.colors.textSecondary }",
  "{ color: '#FFFFFF' }": "{ color: theme.colors.textInverse }",
  "{ color: '#EF4444' }": "{ color: theme.colors.error }",
  "{ color: '#F59E0B' }": "{ color: theme.colors.accent }",
  "{ backgroundColor: '#D1FAE5' }": "{ backgroundColor: theme.colors.primaryLight }",
  "{ backgroundColor: '#10B981' }": "{ backgroundColor: theme.colors.primary }",
  "{ backgroundColor: '#F7F7F7' }": "{ backgroundColor: theme.colors.backgroundSecondary }",
  "{ backgroundColor: '#FFFFFF' }": "{ backgroundColor: theme.colors.surface }",
  "{ backgroundColor: '#F0F0F0' }": "{ backgroundColor: theme.colors.backgroundTertiary }",
  "{ backgroundColor: '#EF4444' }": "{ backgroundColor: theme.colors.error }",
  "{ backgroundColor: '#FEF3C7' }": "{ backgroundColor: theme.colors.accentLight }",
  "{ borderColor: '#10B981' }": "{ borderColor: theme.colors.primary }",
  "{ borderColor: '#EBEBEB' }": "{ borderColor: theme.colors.border }",

  // RefreshControl colors
  "colors={['#10B981']}": "colors={[theme.colors.primary]}",
  "colors={['#222222']}": "colors={[theme.colors.textPrimary]}",

  // JSX single-quote color props (color='#xxx')
  "color='#222222'": "color={theme.colors.textPrimary}",
  "color='#717171'": "color={theme.colors.textSecondary}",
  "color='#B0B0B0'": "color={theme.colors.textTertiary}",
  "color='#FFFFFF'": "color={theme.colors.textInverse}",
  "color='#10B981'": "color={theme.colors.primary}",
  "color='#059669'": "color={theme.colors.primaryDark}",
  "color='#EF4444'": "color={theme.colors.error}",
  "color='#F59E0B'": "color={theme.colors.accent}",
  "color='#D1FAE5'": "color={theme.colors.primaryLight}",
  "color='#EBEBEB'": "color={theme.colors.border}",
  "color='#F0F0F0'": "color={theme.colors.backgroundTertiary}",
  "color='#FEF3C7'": "color={theme.colors.accentLight}",
  "color='#F7F7F7'": "color={theme.colors.backgroundSecondary}",

  // JSX double-quote color props (already handled above but ensure)
  'color="#222222"': 'color={theme.colors.textPrimary}',
  'color="#717171"': 'color={theme.colors.textSecondary}',
  'color="#B0B0B0"': 'color={theme.colors.textTertiary}',
  'color="#FFFFFF"': 'color={theme.colors.textInverse}',
  'color="#10B981"': 'color={theme.colors.primary}',
  'color="#059669"': 'color={theme.colors.primaryDark}',
  'color="#EF4444"': 'color={theme.colors.error}',
  'color="#F59E0B"': 'color={theme.colors.accent}',
  'color="#D1FAE5"': 'color={theme.colors.primaryLight}',
  'color="#EBEBEB"': 'color={theme.colors.border}',

  // tintColor variants
  'tintColor="#10B981"': 'tintColor={theme.colors.primary}',
  'tintColor="#222222"': 'tintColor={theme.colors.textPrimary}',
  "tintColor: '#10B981'": "tintColor: theme.colors.primary",
  "tintColor: '#222222'": "tintColor: theme.colors.textPrimary",

  // Object property patterns: bg, iconColor, bgColor, iconBg, accentColor
  "bg: '#D1FAE5'": "bg: theme.colors.primaryLight",
  "bg: '#F7F7F7'": "bg: theme.colors.backgroundSecondary",
  "bg: '#FEF3C7'": "bg: theme.colors.accentLight",
  "bg: '#F0F0F0'": "bg: theme.colors.backgroundTertiary",
  "bg: '#FFFFFF'": "bg: theme.colors.surface",

  "iconColor: '#10B981'": "iconColor: theme.colors.primary",
  "iconColor: '#F59E0B'": "iconColor: theme.colors.accent",
  "iconColor: '#EF4444'": "iconColor: theme.colors.error",
  "iconColor: '#717171'": "iconColor: theme.colors.textSecondary",
  "iconColor: '#222222'": "iconColor: theme.colors.textPrimary",
  "iconColor: '#059669'": "iconColor: theme.colors.primaryDark",
  "iconColor: '#B0B0B0'": "iconColor: theme.colors.textTertiary",

  "bgColor: '#D1FAE5'": "bgColor: theme.colors.primaryLight",
  "bgColor: '#FEF3C7'": "bgColor: theme.colors.accentLight",
  "bgColor: '#F7F7F7'": "bgColor: theme.colors.backgroundSecondary",

  "iconBg: '#D1FAE5'": "iconBg: theme.colors.primaryLight",
  "iconBg: '#FEF3C7'": "iconBg: theme.colors.accentLight",
  "iconBg: '#F7F7F7'": "iconBg: theme.colors.backgroundSecondary",

  "accentColor: '#10B981'": "accentColor: theme.colors.primary",
  "accentColor: '#F59E0B'": "accentColor: theme.colors.accent",
  "accentColor: '#EF4444'": "accentColor: theme.colors.error",

  // text/bg in inline objects: text: '#10B981'
  "text: '#10B981'": "text: theme.colors.primary",
  "text: '#EF4444'": "text: theme.colors.error",
  "text: '#717171'": "text: theme.colors.textSecondary",
  "text: '#222222'": "text: theme.colors.textPrimary",
  "text: '#F59E0B'": "text: theme.colors.accent",

  // borderColor in StyleSheet
  "borderColor: '#FFFFFF'": "borderColor: theme.colors.surface",
  "borderColor: '#D1FAE5'": "borderColor: theme.colors.primaryLight",
  "borderColor: '#222222'": "borderColor: theme.colors.textPrimary",
  "borderBottomColor: '#222222'": "borderBottomColor: theme.colors.textPrimary",
  "borderTopColor: '#222222'": "borderTopColor: theme.colors.textPrimary",
  "borderColor: '#B0B0B0'": "borderColor: theme.colors.textTertiary",

  // backgroundColor for B0B0B0 (used as disabled bg)
  "backgroundColor: '#B0B0B0'": "backgroundColor: theme.colors.textTertiary",

  // Status color maps
  "in_progress: '#F59E0B'": "in_progress: theme.colors.accent",
  "completed: '#10B981'": "completed: theme.colors.primary",
  "cancelled: '#EF4444'": "cancelled: theme.colors.error",
  "disputed: '#EF4444'": "disputed: theme.colors.error",
  "active: '#10B981'": "active: theme.colors.primary",
  "inactive: '#717171'": "inactive: theme.colors.textSecondary",
  "former: '#B0B0B0'": "former: theme.colors.textTertiary",

  // Fallback patterns
  "|| '#717171'": "|| theme.colors.textSecondary",
  "?? '#717171'": "?? theme.colors.textSecondary",

  // return statements
  "return '#10B981'": "return theme.colors.primary",
  "return '#F59E0B'": "return theme.colors.accent",
  "return '#EF4444'": "return theme.colors.error",
  "return '#717171'": "return theme.colors.textSecondary",
  "return '#222222'": "return theme.colors.textPrimary",
  "return '#B0B0B0'": "return theme.colors.textTertiary",

  // Switch trackColor patterns
  "true: '#10B981'": "true: theme.colors.primary",
  "true: '#222222'": "true: theme.colors.textPrimary",
  "false: '#EBEBEB'": "false: theme.colors.border",
  "false: '#F7F7F7'": "false: theme.colors.backgroundSecondary",
  'thumbColor="#FFFFFF"': 'thumbColor={theme.colors.surface}',
  "thumbColor: '#FFFFFF'": "thumbColor: theme.colors.surface",

  // category/status maps without space after colon
  "safety: '#EF4444'": "safety: theme.colors.error",
  "compliance: '#F59E0B'": "compliance: theme.colors.accent",
  "business: '#10B981'": "business: theme.colors.primary",
  "fuel: '#F59E0B'": "fuel: theme.colors.accent",
  "insurance: '#10B981'": "insurance: theme.colors.primary",
  "marketing: '#EF4444'": "marketing: theme.colors.error",
  "other: '#717171'": "other: theme.colors.textSecondary",

  // borderColor patterns
  "borderLeftColor: '#10B981'": "borderLeftColor: theme.colors.primary",
  "borderColor: '#10B981'": "borderColor: theme.colors.primary",
  "borderColor: '#F59E0B'": "borderColor: theme.colors.accent",

  // conditional color={expr ? '#X' : '#Y'}
  "? '#10B981' : '#B0B0B0'": "? theme.colors.primary : theme.colors.textTertiary",
  "? '#10B981' : '#F59E0B'": "? theme.colors.primary : theme.colors.accent",
  "? '#F59E0B' : '#B0B0B0'": "? theme.colors.accent : theme.colors.textTertiary",
  "? '#10B981' : '#717171'": "? theme.colors.primary : theme.colors.textSecondary",
  "? '#EF4444' : '#717171'": "? theme.colors.error : theme.colors.textSecondary",
  "? '#10B981' : '#EBEBEB'": "? theme.colors.primary : theme.colors.border",
  "? '#FFFFFF' : '#717171'": "? theme.colors.textInverse : theme.colors.textSecondary",
  "? '#F59E0B' : '#717171'": "? theme.colors.accent : theme.colors.textSecondary",
  "? '#222222'": "? theme.colors.textPrimary",
  "? '#10B981'": "? theme.colors.primary",
  "? '#EF4444'": "? theme.colors.error",
  "? '#F59E0B'": "? theme.colors.accent",
  ": '#222222'": ": theme.colors.textPrimary",
  ": '#717171'": ": theme.colors.textSecondary",
  ": '#B0B0B0'": ": theme.colors.textTertiary",
  ": '#EBEBEB'": ": theme.colors.border",
  ": '#F7F7F7'": ": theme.colors.backgroundSecondary",
  ": '#10B981'": ": theme.colors.primary",
  ": '#EF4444'": ": theme.colors.error",
  ": '#F59E0B'": ": theme.colors.accent",
  ": '#FFFFFF'": ": theme.colors.textInverse",
  ": '#059669'": ": theme.colors.primaryDark",
  ": '#D1FAE5'": ": theme.colors.primaryLight",
  ": '#FEF3C7'": ": theme.colors.accentLight",

  // Curly-brace wrapped JSX props: color={'#XXX'}
  "color={'#222222'}": "color={theme.colors.textPrimary}",
  "color={'#717171'}": "color={theme.colors.textSecondary}",
  "color={'#B0B0B0'}": "color={theme.colors.textTertiary}",
  "color={'#FFFFFF'}": "color={theme.colors.textInverse}",
  "color={'#10B981'}": "color={theme.colors.primary}",
  "color={'#059669'}": "color={theme.colors.primaryDark}",
  "color={'#EF4444'}": "color={theme.colors.error}",
  "color={'#F59E0B'}": "color={theme.colors.accent}",
  "color={'#EBEBEB'}": "color={theme.colors.border}",
  "pinColor={'#222222'}": "pinColor={theme.colors.textPrimary}",
  "pinColor={'#10B981'}": "pinColor={theme.colors.primary}",

  // ternary standalone: ? '#FFFFFF'  (newline before colon)
  "    ? '#FFFFFF'": "    ? theme.colors.textInverse",
  "    ? '#222222'": "    ? theme.colors.textPrimary",
  "    ? '#10B981'": "    ? theme.colors.primary",
};

function getThemeImportPath(filePath) {
  const SRC = path.join(__dirname, '..', 'apps', 'mobile', 'src');
  const themeDir = path.join(SRC, 'theme');
  const fileDir = path.dirname(filePath);
  let rel = path.relative(fileDir, themeDir).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

function hasThemeImport(content) {
  return /import\s.*\{.*theme.*\}.*from\s+['"].*theme['"]/.test(content);
}

function addThemeImport(content, importPath) {
  // Find last import statement
  const lines = content.split('\n');
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^import\s/.test(lines[i])) {
      // Find end of this import (might be multiline)
      let j = i;
      while (j < lines.length && !lines[j].includes(';')) j++;
      lastImportIdx = j;
    }
  }
  if (lastImportIdx >= 0) {
    lines.splice(lastImportIdx + 1, 0, `import { theme } from '${importPath}';`);
    return lines.join('\n');
  }
  return `import { theme } from '${importPath}';\n` + content;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Check if file has any target colors (case insensitive check)
  const hasTargetColors = /#(FFFFFF|F7F7F7|F0F0F0|222222|717171|B0B0B0|EBEBEB|10B981|059669|D1FAE5|EF4444|F59E0B|FEF3C7)/i.test(content);
  if (!hasTargetColors) return false;

  // Add theme import if not present
  if (!hasThemeImport(content)) {
    const importPath = getThemeImportPath(filePath);
    content = addThemeImport(content, importPath);
  }

  // Apply all replacements
  for (const [find, replace] of Object.entries(COLOR_MAP)) {
    // Use global string replace (all occurrences)
    while (content.includes(find)) {
      content = content.replace(find, replace);
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

function collectFiles() {
  const files = [];
  const SRC = path.join(__dirname, '..', 'apps', 'mobile', 'src');

  function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '__tests__' || entry.name === '__mocks__' || entry.name === 'node_modules') continue;
        walkDir(full);
      } else if ((entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) && !entry.name.includes('.test.') && !entry.name.includes('.spec.')) {
        files.push(full);
      }
    }
  }

  // Cover all screens and components
  walkDir(path.join(SRC, 'screens'));
  walkDir(path.join(SRC, 'components'));

  return files;
}

// Main
const files = collectFiles();
console.log(`Found ${files.length} files to process`);

let modified = 0;
for (const f of files) {
  const relPath = path.relative(path.join(__dirname, '..'), f);
  if (processFile(f)) {
    console.log(`  Modified: ${relPath}`);
    modified++;
  }
}

console.log(`\nDone: ${modified}/${files.length} files modified`);
