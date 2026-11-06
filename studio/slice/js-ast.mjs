// Zero-dependency JavaScript Lexer, Stratified Bundle Indexer & Recursive-Descent ESTree Parser.
// Built for minified/obfuscated LayaAir Web/JS bundles with exact UTF-8 byte-offset tracking.
import { createHash } from 'node:crypto';

const sha256 = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

const KEYWORDS = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
  'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 'function', 'if',
  'import', 'in', 'instanceof', 'let', 'new', 'return', 'super', 'switch', 'this',
  'throw', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield', 'async', 'await',
  'of', 'static', 'get', 'set', 'from', 'as',
]);

const REGEX_PREV_KEYWORDS = new Set([
  'return', 'throw', 'case', 'delete', 'void', 'typeof', 'in', 'instanceof',
  'new', 'else', 'do', 'yield', 'await', 'of',
]);

const REGEX_PREV_PUNCT = new Set([
  '=', '+=', '-=', '*=', '/=', '%=', '**=', '<<=', '>>=', '>>>=', '&=', '|=', '^=',
  '&&=', '||=', '??=', '(', '[', '{', ',', ':', ';', '?', '!', '~', '+', '-', '*',
  '/', '%', '**', '<', '<=', '>', '>=', '==', '!=', '===', '!==', '&', '|', '^',
  '&&', '||', '??', '<<', '>>', '>>>', '=>', '...',
]);

function isIdStart(ch) {
  const c = ch.charCodeAt(0);
  return (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95 || c === 36 || c >= 128;
}

function isIdPart(ch) {
  const c = ch.charCodeAt(0);
  return isIdStart(ch) || (c >= 48 && c <= 57);
}

const MULTI_PUNCT = [
  '>>>=', '===', '!==', '>>>', '**=', '<<=', '>>=', '&&=', '||=', '??=', '...',
  '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '==', '!=', '<=', '>=',
  '&&', '||', '??', '<<', '>>', '++', '--', '=>', '**', '?.',
];

export function tokenizeJs(source, { baseOffset = 0, baseLine = 1, maxTokens = 400000 } = {}) {
  const tokens = [];
  const len = source.length;
  let i = 0;
  let line = baseLine;
  let lineStart = 0;

  const canStartRegex = () => {
    if (!tokens.length) return true;
    const prev = tokens[tokens.length - 1];
    if (prev.type === 'punct') return REGEX_PREV_PUNCT.has(prev.value);
    if (prev.type === 'keyword') return REGEX_PREV_KEYWORDS.has(prev.value);
    return false;
  };

  while (i < len) {
    const ch = source[i];
    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\v' || ch === '\f') {
      i++;
      continue;
    }
    if (ch === '\n') {
      line++;
      i++;
      lineStart = i;
      continue;
    }
    // Line comment
    if (ch === '/' && source[i + 1] === '/') {
      i += 2;
      while (i < len && source[i] !== '\n') i++;
      continue;
    }
    // Block comment
    if (ch === '/' && source[i + 1] === '*') {
      i += 2;
      while (i < len && !(source[i] === '*' && source[i + 1] === '/')) {
        if (source[i] === '\n') {
          line++;
          lineStart = i + 1;
        }
        i++;
      }
      i += 2;
      continue;
    }

    const start = i;
    const col = i - lineStart + 1;

    // String literal
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let val = '';
      i++;
      while (i < len && source[i] !== quote) {
        if (source[i] === '\\') {
          i++;
          if (i < len) {
            const esc = source[i];
            if (esc === 'n') val += '\n';
            else if (esc === 'r') val += '\r';
            else if (esc === 't') val += '\t';
            else if (esc === '\n') { line++; lineStart = i + 1; }
            else val += esc;
            i++;
          }
        } else {
          if (source[i] === '\n') { line++; lineStart = i + 1; }
          val += source[i++];
        }
      }
      i++;
      tokens.push({ type: 'string', value: val, raw: source.slice(start, i), start: baseOffset + start, end: baseOffset + i, line, col });
      if (tokens.length > maxTokens) throw Error('JS token limit exceeded');
      continue;
    }

    // Template literal (flattened or expression-aware raw capture)
    if (ch === '`') {
      i++;
      let rawText = '';
      let depth = 0;
      while (i < len) {
        const c = source[i];
        if (c === '\\') {
          rawText += source.slice(i, i + 2);
          i += 2;
          continue;
        }
        if (c === '$' && source[i + 1] === '{') {
          depth++;
          rawText += '${';
          i += 2;
          continue;
        }
        if (c === '}' && depth > 0) {
          depth--;
          rawText += '}';
          i++;
          continue;
        }
        if (c === '`' && depth === 0) {
          i++;
          break;
        }
        if (c === '\n') { line++; lineStart = i + 1; }
        rawText += c;
        i++;
      }
      tokens.push({ type: 'template', value: rawText, raw: source.slice(start, i), start: baseOffset + start, end: baseOffset + i, line, col });
      if (tokens.length > maxTokens) throw Error('JS token limit exceeded');
      continue;
    }

    // Regex literal
    if (ch === '/' && canStartRegex()) {
      i++;
      let inClass = false;
      while (i < len) {
        const c = source[i];
        if (c === '\\') { i += 2; continue; }
        if (c === '[') { inClass = true; i++; continue; }
        if (c === ']') { inClass = false; i++; continue; }
        if (c === '/' && !inClass) { i++; break; }
        if (c === '\n') break;
        i++;
      }
      while (i < len && /[dgimsuvy]/.test(source[i])) i++;
      tokens.push({ type: 'regex', value: source.slice(start, i), raw: source.slice(start, i), start: baseOffset + start, end: baseOffset + i, line, col });
      if (tokens.length > maxTokens) throw Error('JS token limit exceeded');
      continue;
    }

    // Number literal
    if ((ch >= '0' && ch <= '9') || (ch === '.' && source[i + 1] >= '0' && source[i + 1] <= '9')) {
      if (ch === '0' && (source[i + 1] === 'x' || source[i + 1] === 'X')) {
        i += 2;
        while (i < len && /[0-9a-fA-F_]/.test(source[i])) i++;
      } else if (ch === '0' && (source[i + 1] === 'b' || source[i + 1] === 'B')) {
        i += 2;
        while (i < len && /[01_]/.test(source[i])) i++;
      } else if (ch === '0' && (source[i + 1] === 'o' || source[i + 1] === 'O')) {
        i += 2;
        while (i < len && /[0-7_]/.test(source[i])) i++;
      } else {
        while (i < len && /[0-9_]/.test(source[i])) i++;
        if (source[i] === '.' && source[i + 1] !== '.') {
          i++;
          while (i < len && /[0-9_]/.test(source[i])) i++;
        }
        if ((source[i] === 'e' || source[i] === 'E') && /[0-9+-]/.test(source[i + 1] ?? '')) {
          i++;
          if (source[i] === '+' || source[i] === '-') i++;
          while (i < len && /[0-9_]/.test(source[i])) i++;
        }
      }
      if (source[i] === 'n') i++;
      const raw = source.slice(start, i);
      const numVal = Number(raw.replaceAll('_', '').replace(/n$/, ''));
      tokens.push({ type: 'number', value: numVal, raw, start: baseOffset + start, end: baseOffset + i, line, col });
      if (tokens.length > maxTokens) throw Error('JS token limit exceeded');
      continue;
    }

    // Identifier / Keyword / Boolean / Null
    if (isIdStart(ch)) {
      i++;
      while (i < len && isIdPart(source[i])) i++;
      const word = source.slice(start, i);
      if (word === 'true' || word === 'false') {
        tokens.push({ type: 'boolean', value: word === 'true', raw: word, start: baseOffset + start, end: baseOffset + i, line, col });
      } else if (word === 'null') {
        tokens.push({ type: 'null', value: null, raw: word, start: baseOffset + start, end: baseOffset + i, line, col });
      } else if (KEYWORDS.has(word)) {
        tokens.push({ type: 'keyword', value: word, raw: word, start: baseOffset + start, end: baseOffset + i, line, col });
      } else {
        tokens.push({ type: 'id', value: word, raw: word, start: baseOffset + start, end: baseOffset + i, line, col });
      }
      if (tokens.length > maxTokens) throw Error('JS token limit exceeded');
      continue;
    }

    // Punctuators
    let matched = null;
    for (const p of MULTI_PUNCT) {
      if (source.startsWith(p, i)) {
        matched = p;
        break;
      }
    }
    const punct = matched ?? ch;
    i += punct.length;
    tokens.push({ type: 'punct', value: punct, raw: punct, start: baseOffset + start, end: baseOffset + i, line, col });
    if (tokens.length > maxTokens) throw Error('JS token limit exceeded');
  }

  tokens.push({ type: 'eof', value: null, raw: '', start: baseOffset + len, end: baseOffset + len, line, col: 1 });
  return tokens;
}

// Fast stratified scanner for multi-megabyte LayaAir bundles.
// Safely skips strings, regexes, and comments to locate classes, functions, opcodes, and send/listener sites.
export function indexBundleRegions(source, filePath = 'bundle.js') {
  const tokens = tokenizeJs(source, { maxTokens: 6000000 });
  const classes = [];
  const functions = [];
  const opcodes = [];
  const sendSites = [];
  const listenerSites = [];
  const catalogRefs = [];

  const findMatchingBrace = (openIdx) => {
    let depth = 0;
    for (let k = openIdx; k < tokens.length - 1; k++) {
      if (tokens[k].type === 'punct' && tokens[k].value === '{') depth++;
      else if (tokens[k].type === 'punct' && tokens[k].value === '}') {
        depth--;
        if (depth === 0) return k;
      }
    }
    return -1;
  };

  const findMatchingParen = (openIdx) => {
    let depth = 0;
    for (let k = openIdx; k < tokens.length - 1; k++) {
      if (tokens[k].type === 'punct' && tokens[k].value === '(') depth++;
      else if (tokens[k].type === 'punct' && tokens[k].value === ')') {
        depth--;
        if (depth === 0) return k;
      }
    }
    return -1;
  };

  const classStack = [];
  let braceDepth = 0;

  for (let idx = 0; idx < tokens.length - 1; idx++) {
    const t = tokens[idx];

    if (t.type === 'punct' && t.value === '{') {
      braceDepth++;
      continue;
    }
    if (t.type === 'punct' && t.value === '}') {
      braceDepth = Math.max(0, braceDepth - 1);
      while (classStack.length && braceDepth < classStack[classStack.length - 1].bodyDepth) {
        classStack.pop();
      }
      continue;
    }

    // Detect `class Foo [extends Bar] { ... }`
    if (t.type === 'keyword' && t.value === 'class') {
      let name = '<anonymous>';
      let cursor = idx + 1;
      if (tokens[cursor]?.type === 'id') {
        name = tokens[cursor].value;
        cursor++;
      }
      let superClass = null;
      if (tokens[cursor]?.type === 'keyword' && tokens[cursor].value === 'extends') {
        cursor++;
        const parts = [];
        while (tokens[cursor] && !(tokens[cursor].type === 'punct' && tokens[cursor].value === '{')) {
          parts.push(tokens[cursor].raw);
          cursor++;
        }
        superClass = parts.join('');
      }
      if (tokens[cursor]?.type === 'punct' && tokens[cursor].value === '{') {
        const endTokIdx = findMatchingBrace(cursor);
        if (endTokIdx > cursor) {
          const startByte = t.start;
          const endByte = tokens[endTokIdx].end;
          const slice = source.slice(startByte, endByte);
          const entry = {
            name,
            superClass,
            filePath,
            startByte,
            endByte,
            line: t.line,
            endLine: tokens[endTokIdx].line,
            sha256: sha256(slice),
            methods: [],
            bodyDepth: braceDepth + 1,
          };
          classes.push(entry);
          classStack.push(entry);
        }
      }
      continue;
    }

    // Detect class methods: `[static] [async] name(...) { ... }`
    const currentClass = classStack[classStack.length - 1];
    if (currentClass && braceDepth === currentClass.bodyDepth) {
      let cursor = idx;
      let isStatic = false;
      let isAsync = false;
      if (tokens[cursor]?.type === 'keyword' && tokens[cursor].value === 'static') {
        isStatic = true;
        cursor++;
      }
      if (tokens[cursor]?.type === 'keyword' && tokens[cursor].value === 'async') {
        isAsync = true;
        cursor++;
      }
      if (tokens[cursor]?.type === 'id' && tokens[cursor + 1]?.type === 'punct' && tokens[cursor + 1].value === '(') {
        const methodName = tokens[cursor].value;
        const closeParen = findMatchingParen(cursor + 1);
        if (closeParen > 0 && tokens[closeParen + 1]?.type === 'punct' && tokens[closeParen + 1].value === '{') {
          const closeBrace = findMatchingBrace(closeParen + 1);
          if (closeBrace > closeParen) {
            const startByte = t.start;
            const endByte = tokens[closeBrace].end;
            const slice = source.slice(startByte, endByte);
            const mEntry = {
              className: currentClass.name,
              name: methodName,
              qualifiedName: `${currentClass.name}.${methodName}`,
              isStatic,
              isAsync,
              filePath,
              startByte,
              endByte,
              line: t.line,
              endLine: tokens[closeBrace].line,
              sha256: sha256(slice),
            };
            currentClass.methods.push(mEntry);
            functions.push(mEntry);
            idx = closeParen;
            continue;
          }
        }
      }
    }

    // Detect ES5 prototype/static method assignments: `Foo.prototype.bar = function(...) { ... }` or `Foo.bar = function(...) { ... }`
    if (
      t.type === 'id' &&
      tokens[idx + 1]?.type === 'punct' &&
      tokens[idx + 1].value === '.' &&
      tokens[idx + 2]?.type === 'id'
    ) {
      let cursor = idx + 2;
      let isStatic = true;
      if (tokens[cursor].value === 'prototype' && tokens[cursor + 1]?.type === 'punct' && tokens[cursor + 1].value === '.' && tokens[cursor + 2]?.type === 'id') {
        isStatic = false;
        cursor += 2;
      }
      const methodName = tokens[cursor].value;
      if (tokens[cursor + 1]?.type === 'punct' && tokens[cursor + 1].value === '=') {
        let fnIdx = cursor + 2;
        let isAsync = false;
        if (tokens[fnIdx]?.type === 'keyword' && tokens[fnIdx].value === 'async') {
          isAsync = true;
          fnIdx++;
        }
        if (tokens[fnIdx]?.type === 'keyword' && tokens[fnIdx].value === 'function') {
          let pIdx = fnIdx + 1;
          if (tokens[pIdx]?.type === 'id') pIdx++;
          if (tokens[pIdx]?.type === 'punct' && tokens[pIdx].value === '(') {
            const closeParen = findMatchingParen(pIdx);
            if (closeParen > 0 && tokens[closeParen + 1]?.type === 'punct' && tokens[closeParen + 1].value === '{') {
              const closeBrace = findMatchingBrace(closeParen + 1);
              if (closeBrace > closeParen) {
                const startByte = t.start;
                const endByte = tokens[closeBrace].end;
                functions.push({
                  className: t.value,
                  name: methodName,
                  qualifiedName: `${t.value}.${methodName}`,
                  isStatic,
                  isAsync,
                  filePath,
                  startByte,
                  endByte,
                  line: t.line,
                  endLine: tokens[closeBrace].line,
                  sha256: sha256(source.slice(startByte, endByte)),
                });
              }
            }
          }
        }
      }
    }

    // Detect standalone `function foo(...) { ... }`
    if (t.type === 'keyword' && t.value === 'function') {
      let cursor = idx + 1;
      if (tokens[cursor]?.type === 'punct' && tokens[cursor].value === '*') cursor++;
      if (tokens[cursor]?.type === 'id' && tokens[cursor + 1]?.type === 'punct' && tokens[cursor + 1].value === '(') {
        const fnName = tokens[cursor].value;
        const closeParen = findMatchingParen(cursor + 1);
        if (closeParen > 0 && tokens[closeParen + 1]?.type === 'punct' && tokens[closeParen + 1].value === '{') {
          const closeBrace = findMatchingBrace(closeParen + 1);
          if (closeBrace > closeParen) {
            const startByte = t.start;
            const endByte = tokens[closeBrace].end;
            functions.push({
              className: currentClass?.name ?? null,
              name: fnName,
              qualifiedName: currentClass ? `${currentClass.name}.${fnName}` : fnName,
              isStatic: false,
              isAsync: tokens[idx - 1]?.type === 'keyword' && tokens[idx - 1].value === 'async',
              filePath,
              startByte,
              endByte,
              line: t.line,
              endLine: tokens[closeBrace].line,
              sha256: sha256(source.slice(startByte, endByte)),
            });
          }
        }
      }
      continue;
    }

    // Detect opcode constant definitions: `Bn.C_ITEM_TRANSFORM = 8538` or `C_ITEM_TRANSFORM: 8538`
    if (
      t.type === 'id' &&
      /^(?:[CS]2?[SC]?_[A-Z0-9_]{3,}|OP_[A-Z0-9_]{3,})$/.test(t.value) &&
      tokens[idx + 1]?.type === 'punct' &&
      (tokens[idx + 1].value === '=' || tokens[idx + 1].value === ':') &&
      tokens[idx + 2]?.type === 'number' &&
      Number.isInteger(tokens[idx + 2].value)
    ) {
      const namespace =
        tokens[idx - 1]?.type === 'punct' && tokens[idx - 1].value === '.' && tokens[idx - 2]?.type === 'id'
          ? tokens[idx - 2].value
          : null;
      opcodes.push({
        name: t.value,
        namespace,
        fullName: namespace ? `${namespace}.${t.value}` : t.value,
        value: tokens[idx + 2].value,
        direction: /^S/.test(t.value) ? 'S2C' : 'C2S',
        filePath,
        startByte: namespace ? tokens[idx - 2].start : t.start,
        endByte: tokens[idx + 2].end,
        line: t.line,
      });
    }

    // Detect transport send call sites: `.send(OPCODE, msg)` / `.sendMessage(OPCODE, msg)` / `.sendPacket(...)`
    if (
      t.type === 'id' &&
      /^(?:send|sendMessage|sendPacket|sendProto|emitPacket)$/.test(t.value) &&
      tokens[idx + 1]?.type === 'punct' &&
      tokens[idx + 1].value === '('
    ) {
      const closeParen = findMatchingParen(idx + 1);
      if (closeParen > idx + 1) {
        const enclosingFn = [...functions].reverse().find((f) => f.startByte <= t.start && f.endByte >= tokens[closeParen].end) ?? null;
        sendSites.push({
          method: t.value,
          callText: source.slice(Math.max(0, t.start - 24), tokens[closeParen].end),
          argTokens: tokens.slice(idx + 2, closeParen).map((x) => x.raw),
          enclosingClass: currentClass?.name ?? enclosingFn?.className ?? null,
          enclosingFunction: enclosingFn?.qualifiedName ?? null,
          filePath,
          startByte: t.start,
          endByte: tokens[closeParen].end,
          line: t.line,
        });
      }
    }

    // Detect S2C listener registrations: `.on(S2C, ...)` / `.addListener(...)` / `.addEventListener(...)` / `.registerHandler(...)`
    if (
      t.type === 'id' &&
      /^(?:on|once|addListener|addEventListener|registerHandler|bindHandler|listen)$/.test(t.value) &&
      tokens[idx + 1]?.type === 'punct' &&
      tokens[idx + 1].value === '('
    ) {
      const closeParen = findMatchingParen(idx + 1);
      if (closeParen > idx + 1) {
        const argPreview = source.slice(tokens[idx + 1].end, Math.min(tokens[closeParen].start, tokens[idx + 1].end + 80));
        if (/(?:S2?C|_[A-Z0-9_]{3,}|^\s*\d{3,5}\b)/.test(argPreview)) {
          const enclosingFn = [...functions].reverse().find((f) => f.startByte <= t.start && f.endByte >= tokens[closeParen].end) ?? null;
          listenerSites.push({
            method: t.value,
            argPreview: argPreview.trim(),
            enclosingClass: currentClass?.name ?? enclosingFn?.className ?? null,
            enclosingFunction: enclosingFn?.qualifiedName ?? null,
            filePath,
            startByte: t.start,
            endByte: tokens[closeParen].end,
            line: t.line,
          });
        }
      }
    }

    // Detect catalog table references: `t_s_transformtemplate`, `t_s_itemtemplate`, etc.
    if ((t.type === 'string' || t.type === 'id') && /^t_[a-z]_[a-z0-9_]{3,}$/i.test(String(t.value))) {
      const enclosingFn = [...functions].reverse().find((f) => f.startByte <= t.start && f.endByte >= t.end) ?? null;
      catalogRefs.push({
        table: String(t.value),
        enclosingClass: currentClass?.name ?? enclosingFn?.className ?? null,
        enclosingFunction: enclosingFn?.qualifiedName ?? null,
        filePath,
        startByte: t.start,
        endByte: t.end,
        line: t.line,
      });
    }
  }

  return { filePath, sha256: sha256(source), byteLength: Buffer.byteLength(source, 'utf8'), classes, functions, opcodes, sendSites, listenerSites, catalogRefs };
}

// Recursive-descent + Pratt operator-precedence ESTree AST parser for bounded JS slices.
export function parseJsSlice(source, { baseOffset = 0, baseLine = 1 } = {}) {
  const tokens = tokenizeJs(source, { baseOffset, baseLine });
  let pos = 0;

  const peek = (offset = 0) => tokens[Math.min(pos + offset, tokens.length - 1)];
  const next = () => tokens[pos++];
  const isPunct = (val, offset = 0) => peek(offset).type === 'punct' && peek(offset).value === val;
  const isKw = (val, offset = 0) => peek(offset).type === 'keyword' && peek(offset).value === val;
  const eatPunct = (val) => {
    if (isPunct(val)) { next(); return true; }
    return false;
  };
  const eatKw = (val) => {
    if (isKw(val)) { next(); return true; }
    return false;
  };
  const expectPunct = (val) => {
    if (!eatPunct(val)) {
      const t = peek();
      throw Error(`Expected '${val}' near line ${t.line}, got '${t.raw}'`);
    }
  };
  const eatSemicolon = () => { eatPunct(';'); };

  const node = (type, startTok, endTok, props) => ({
    type,
    start: startTok.start,
    end: (endTok ?? startTok).end,
    line: startTok.line,
    ...props,
  });

  function parsePattern() {
    const start = peek();
    if (eatPunct('{')) {
      const properties = [];
      while (!isPunct('}') && peek().type !== 'eof') {
        if (eatPunct('...')) {
          properties.push({ type: 'RestElement', argument: parsePattern() });
        } else {
          const key = parsePropertyName();
          let value = key;
          if (eatPunct(':')) value = parsePattern();
          if (eatPunct('=')) {
            const def = parseAssignment();
            value = { type: 'AssignmentPattern', left: value, right: def };
          }
          properties.push({ type: 'Property', key, value, computed: false });
        }
        if (!eatPunct(',')) break;
      }
      const end = peek();
      expectPunct('}');
      return node('ObjectPattern', start, end, { properties });
    }
    if (eatPunct('[')) {
      const elements = [];
      while (!isPunct(']') && peek().type !== 'eof') {
        if (eatPunct(',')) { elements.push(null); continue; }
        if (eatPunct('...')) elements.push({ type: 'RestElement', argument: parsePattern() });
        else {
          let elem = parsePattern();
          if (eatPunct('=')) elem = { type: 'AssignmentPattern', left: elem, right: parseAssignment() };
          elements.push(elem);
        }
        if (!eatPunct(',')) break;
      }
      const end = peek();
      expectPunct(']');
      return node('ArrayPattern', start, end, { elements });
    }
    const idTok = next();
    if (idTok.type !== 'id' && idTok.type !== 'keyword') {
      throw Error(`Expected identifier in pattern near line ${idTok.line}`);
    }
    return node('Identifier', idTok, idTok, { name: idTok.value });
  }

  function parsePropertyName() {
    const t = peek();
    if (eatPunct('[')) {
      const expr = parseAssignment();
      expectPunct(']');
      return expr;
    }
    if (t.type === 'string' || t.type === 'number') {
      next();
      return node('Literal', t, t, { value: t.value, raw: t.raw });
    }
    next();
    return node('Identifier', t, t, { name: String(t.value) });
  }

  function parseParams() {
    expectPunct('(');
    const params = [];
    while (!isPunct(')') && peek().type !== 'eof') {
      if (eatPunct('...')) {
        const restStart = peek();
        const arg = parsePattern();
        params.push(node('RestElement', restStart, arg, { argument: arg }));
      } else {
        let p = parsePattern();
        if (eatPunct('=')) {
          const right = parseAssignment();
          p = node('AssignmentPattern', p, right, { left: p, right });
        }
        params.push(p);
      }
      if (!eatPunct(',')) break;
    }
    expectPunct(')');
    return params;
  }

  function parseBlock() {
    const start = peek();
    expectPunct('{');
    const body = [];
    while (!isPunct('}') && peek().type !== 'eof') {
      body.push(parseStatement());
    }
    const end = peek();
    expectPunct('}');
    return node('BlockStatement', start, end, { body });
  }

  function parseFunctionBodyOrExpr(isArrow) {
    if (isArrow && !isPunct('{')) {
      const expr = parseAssignment();
      return { body: expr, expression: true };
    }
    return { body: parseBlock(), expression: false };
  }

  function parseClass(isDeclaration) {
    const start = next(); // 'class'
    let id = null;
    if (peek().type === 'id') {
      const idTok = next();
      id = node('Identifier', idTok, idTok, { name: idTok.value });
    }
    let superClass = null;
    if (eatKw('extends')) {
      superClass = parseLeftHandSide();
    }
    const bodyStart = peek();
    expectPunct('{');
    const body = [];
    while (!isPunct('}') && peek().type !== 'eof') {
      if (eatPunct(';')) continue;
      const mStart = peek();
      let isStatic = false;
      if (isKw('static') && !isPunct('(', 1) && !isPunct('=', 1)) {
        next();
        isStatic = true;
      }
      let kind = 'method';
      if ((isKw('get') || isKw('set')) && !isPunct('(', 1)) {
        kind = next().value;
      }
      if (isKw('async') && !isPunct('(', 1)) {
        next();
      }
      const computed = isPunct('[');
      const key = parsePropertyName();
      if (isPunct('(')) {
        const params = parseParams();
        const fnBody = parseBlock();
        const fn = node('FunctionExpression', mStart, fnBody, { id: null, params, body: fnBody, async: false });
        body.push(node('MethodDefinition', mStart, fnBody, { key, value: fn, kind, static: isStatic, computed }));
      } else {
        let value = null;
        if (eatPunct('=')) value = parseAssignment();
        eatSemicolon();
        body.push(node('PropertyDefinition', mStart, value ?? key, { key, value, static: isStatic, computed }));
      }
    }
    const end = peek();
    expectPunct('}');
    const classBody = node('ClassBody', bodyStart, end, { body });
    return node(isDeclaration ? 'ClassDeclaration' : 'ClassExpression', start, end, { id, superClass, body: classBody });
  }

  function parseVarDecl(kind) {
    const start = next(); // let/const/var
    const declarations = [];
    while (true) {
      const id = parsePattern();
      let init = null;
      if (eatPunct('=')) init = parseAssignment();
      declarations.push(node('VariableDeclarator', id, init ?? id, { id, init }));
      if (!eatPunct(',')) break;
    }
    eatSemicolon();
    return node('VariableDeclaration', start, declarations[declarations.length - 1], { kind, declarations });
  }

  function isMethodSliceAtCursor() {
    let offset = 0;
    if (isKw('static', offset)) offset++;
    if (isKw('async', offset)) offset++;
    if (peek(offset).type !== 'id' || !isPunct('(', offset + 1)) return false;
    let depth = 0;
    let k = pos + offset + 1;
    while (k < tokens.length - 1) {
      if (tokens[k].type === 'punct' && tokens[k].value === '(') depth++;
      else if (tokens[k].type === 'punct' && tokens[k].value === ')') {
        depth--;
        if (depth === 0) break;
      }
      k++;
    }
    return depth === 0 && tokens[k + 1]?.type === 'punct' && tokens[k + 1].value === '{';
  }

  function parseStatement() {
    const t = peek();
    if (isPunct(';')) { next(); return node('EmptyStatement', t, t, {}); }
    if (isPunct('{')) return parseBlock();
    if (isKw('class')) return parseClass(true);
    if (isMethodSliceAtCursor()) {
      const start = peek();
      const isStatic = eatKw('static');
      const isAsync = eatKw('async');
      const idTok = next();
      const id = node('Identifier', idTok, idTok, { name: idTok.value });
      const params = parseParams();
      const body = parseBlock();
      return node('FunctionDeclaration', start, body, { id, params, body, async: isAsync, static: isStatic });
    }
    if (isKw('async') && isKw('function', 1)) {
      const start = next();
      next();
      let id = null;
      if (peek().type === 'id') { const idT = next(); id = node('Identifier', idT, idT, { name: idT.value }); }
      const params = parseParams();
      const body = parseBlock();
      return node('FunctionDeclaration', start, body, { id, params, body, async: true });
    }
    if (isKw('function')) {
      const start = next();
      eatPunct('*');
      let id = null;
      if (peek().type === 'id') { const idT = next(); id = node('Identifier', idT, idT, { name: idT.value }); }
      const params = parseParams();
      const body = parseBlock();
      return node('FunctionDeclaration', start, body, { id, params, body, async: false });
    }
    if (isKw('let') || isKw('const') || isKw('var')) return parseVarDecl(t.value);
    if (isKw('if')) {
      const start = next();
      expectPunct('(');
      const test = parseExpression();
      expectPunct(')');
      const consequent = parseStatement();
      let alternate = null;
      if (eatKw('else')) alternate = parseStatement();
      return node('IfStatement', start, alternate ?? consequent, { test, consequent, alternate });
    }
    if (isKw('switch')) {
      const start = next();
      expectPunct('(');
      const discriminant = parseExpression();
      expectPunct(')');
      expectPunct('{');
      const cases = [];
      while (!isPunct('}') && peek().type !== 'eof') {
        const cStart = peek();
        let test = null;
        if (eatKw('case')) test = parseExpression();
        else if (eatKw('default')) test = null;
        else break;
        expectPunct(':');
        const consequent = [];
        while (!isKw('case') && !isKw('default') && !isPunct('}') && peek().type !== 'eof') {
          consequent.push(parseStatement());
        }
        cases.push(node('SwitchCase', cStart, consequent[consequent.length - 1] ?? cStart, { test, consequent }));
      }
      const end = peek();
      expectPunct('}');
      return node('SwitchStatement', start, end, { discriminant, cases });
    }
    if (isKw('for')) {
      const start = next();
      eatKw('await');
      expectPunct('(');
      let init = null;
      if (!isPunct(';')) {
        if (isKw('let') || isKw('const') || isKw('var')) {
          const kind = next().value;
          const id = parsePattern();
          if (isKw('of') || isKw('in')) {
            const isOf = next().value === 'of';
            const right = parseExpression();
            expectPunct(')');
            const body = parseStatement();
            const left = node('VariableDeclaration', start, id, { kind, declarations: [node('VariableDeclarator', id, id, { id, init: null })] });
            return node(isOf ? 'ForOfStatement' : 'ForInStatement', start, body, { left, right, body });
          }
          let varInit = null;
          if (eatPunct('=')) varInit = parseAssignment();
          const decls = [node('VariableDeclarator', id, varInit ?? id, { id, init: varInit })];
          while (eatPunct(',')) {
            const nextId = parsePattern();
            const nextInit = eatPunct('=') ? parseAssignment() : null;
            decls.push(node('VariableDeclarator', nextId, nextInit ?? nextId, { id: nextId, init: nextInit }));
          }
          init = node('VariableDeclaration', start, decls[decls.length - 1], { kind, declarations: decls });
        } else {
          init = parseExpression();
          if (isKw('of') || isKw('in')) {
            const isOf = next().value === 'of';
            const right = parseExpression();
            expectPunct(')');
            const body = parseStatement();
            return node(isOf ? 'ForOfStatement' : 'ForInStatement', start, body, { left: init, right, body });
          }
        }
      }
      expectPunct(';');
      const test = isPunct(';') ? null : parseExpression();
      expectPunct(';');
      const update = isPunct(')') ? null : parseExpression();
      expectPunct(')');
      const body = parseStatement();
      return node('ForStatement', start, body, { init, test, update, body });
    }
    if (isKw('while')) {
      const start = next();
      expectPunct('(');
      const test = parseExpression();
      expectPunct(')');
      const body = parseStatement();
      return node('WhileStatement', start, body, { test, body });
    }
    if (isKw('do')) {
      const start = next();
      const body = parseStatement();
      expectPunct('while');
      expectPunct('(');
      const test = parseExpression();
      const end = peek();
      expectPunct(')');
      eatSemicolon();
      return node('DoWhileStatement', start, end, { body, test });
    }
    if (isKw('try')) {
      const start = next();
      const block = parseBlock();
      let handler = null;
      if (eatKw('catch')) {
        const cStart = peek();
        let param = null;
        if (eatPunct('(')) {
          param = parsePattern();
          expectPunct(')');
        }
        const cBody = parseBlock();
        handler = node('CatchClause', cStart, cBody, { param, body: cBody });
      }
      let finalizer = null;
      if (eatKw('finally')) finalizer = parseBlock();
      return node('TryStatement', start, finalizer ?? handler ?? block, { block, handler, finalizer });
    }
    if (isKw('return')) {
      const start = next();
      const argument = isPunct(';') || isPunct('}') || peek().type === 'eof' ? null : parseExpression();
      eatSemicolon();
      return node('ReturnStatement', start, argument ?? start, { argument });
    }
    if (isKw('throw')) {
      const start = next();
      const argument = parseExpression();
      eatSemicolon();
      return node('ThrowStatement', start, argument, { argument });
    }
    if (isKw('break') || isKw('continue')) {
      const kw = next();
      let label = null;
      if (peek().type === 'id' && peek().line === kw.line) {
        const l = next();
        label = node('Identifier', l, l, { name: l.value });
      }
      eatSemicolon();
      return node(kw.value === 'break' ? 'BreakStatement' : 'ContinueStatement', kw, label ?? kw, { label });
    }
    const expr = parseExpression();
    eatSemicolon();
    return node('ExpressionStatement', expr, expr, { expression: expr });
  }

  function parseExpression() {
    const first = parseAssignment();
    if (!isPunct(',')) return first;
    const expressions = [first];
    while (eatPunct(',')) expressions.push(parseAssignment());
    return node('SequenceExpression', first, expressions[expressions.length - 1], { expressions });
  }

  const ASSIGN_OPS = new Set(['=', '+=', '-=', '*=', '/=', '%=', '**=', '<<=', '>>=', '>>>=', '&=', '|=', '^=', '&&=', '||=', '??=']);

  function parseAssignment() {
    // Check single-param arrow function: `x => ...`
    if (peek().type === 'id' && isPunct('=>', 1)) {
      const idT = next();
      next(); // '=>'
      const param = node('Identifier', idT, idT, { name: idT.value });
      const { body, expression } = parseFunctionBodyOrExpr(true);
      return node('ArrowFunctionExpression', idT, body, { params: [param], body, expression, async: false });
    }
    if (isKw('async') && peek(1).type === 'id' && isPunct('=>', 2)) {
      const start = next();
      const idT = next();
      next();
      const param = node('Identifier', idT, idT, { name: idT.value });
      const { body, expression } = parseFunctionBodyOrExpr(true);
      return node('ArrowFunctionExpression', start, body, { params: [param], body, expression, async: true });
    }
    const left = parseConditional();
    const op = peek();
    if (op.type === 'punct' && ASSIGN_OPS.has(op.value)) {
      next();
      const right = parseAssignment();
      return node('AssignmentExpression', left, right, { operator: op.value, left, right });
    }
    return left;
  }

  function parseConditional() {
    const test = parseBinary(1);
    if (!eatPunct('?')) return test;
    const consequent = parseAssignment();
    expectPunct(':');
    const alternate = parseAssignment();
    return node('ConditionalExpression', test, alternate, { test, consequent, alternate });
  }

  const BIN_PREC = new Map([
    ['??', 1], ['||', 1], ['&&', 2],
    ['|', 3], ['^', 4], ['&', 5],
    ['==', 6], ['!=', 6], ['===', 6], ['!==', 6],
    ['<', 7], ['<=', 7], ['>', 7], ['>=', 7], ['in', 7], ['instanceof', 7],
    ['<<', 8], ['>>', 8], ['>>>', 8],
    ['+', 9], ['-', 9],
    ['*', 10], ['/', 10], ['%', 10],
    ['**', 11],
  ]);

  function parseBinary(minPrec) {
    let left = parseUnary();
    while (true) {
      const t = peek();
      const op = (t.type === 'punct' || t.type === 'keyword') ? t.value : null;
      const prec = op ? BIN_PREC.get(op) : undefined;
      if (!prec || prec < minPrec) break;
      next();
      const right = parseBinary(op === '**' ? prec : prec + 1);
      const isLogical = op === '&&' || op === '||' || op === '??';
      left = node(isLogical ? 'LogicalExpression' : 'BinaryExpression', left, right, { operator: op, left, right });
    }
    return left;
  }

  function parseUnary() {
    const t = peek();
    if ((t.type === 'punct' && (t.value === '!' || t.value === '-' || t.value === '+' || t.value === '~' || t.value === '++' || t.value === '--')) ||
        (t.type === 'keyword' && (t.value === 'typeof' || t.value === 'void' || t.value === 'delete' || t.value === 'await'))) {
      next();
      const argument = parseUnary();
      const isUpdate = t.value === '++' || t.value === '--';
      return node(isUpdate ? 'UpdateExpression' : 'UnaryExpression', t, argument, { operator: t.value, argument, prefix: true });
    }
    return parsePostfix();
  }

  function parsePostfix() {
    let expr = parseLeftHandSide();
    if ((isPunct('++') || isPunct('--')) && peek().line === expr.line) {
      const op = next();
      expr = node('UpdateExpression', expr, op, { operator: op.value, argument: expr, prefix: false });
    }
    return expr;
  }

  function parseArgs() {
    expectPunct('(');
    const args = [];
    while (!isPunct(')') && peek().type !== 'eof') {
      if (eatPunct('...')) {
        const s = peek();
        const arg = parseAssignment();
        args.push(node('SpreadElement', s, arg, { argument: arg }));
      } else {
        args.push(parseAssignment());
      }
      if (!eatPunct(',')) break;
    }
    const end = peek();
    expectPunct(')');
    return { args, end };
  }

  function parseLeftHandSide() {
    let expr;
    const t = peek();
    if (eatKw('new')) {
      if (eatPunct('.')) {
        const prop = next();
        expr = node('MetaProperty', t, prop, { meta: { type: 'Identifier', name: 'new' }, property: { type: 'Identifier', name: prop.value } });
      } else {
        const callee = parsePrimaryOrMemberNoCall();
        const args = isPunct('(') ? parseArgs().args : [];
        expr = node('NewExpression', t, args[args.length - 1] ?? callee, { callee, arguments: args });
      }
    } else {
      expr = parsePrimary();
    }

    while (true) {
      if (eatPunct('?.')) {
        if (isPunct('(')) {
          const { args, end } = parseArgs();
          expr = node('CallExpression', expr, end, { callee: expr, arguments: args, optional: true });
        } else if (eatPunct('[')) {
          const property = parseExpression();
          const end = peek();
          expectPunct(']');
          expr = node('MemberExpression', expr, end, { object: expr, property, computed: true, optional: true });
        } else {
          const prop = next();
          const property = node('Identifier', prop, prop, { name: String(prop.value) });
          expr = node('MemberExpression', expr, prop, { object: expr, property, computed: false, optional: true });
        }
      } else if (eatPunct('.')) {
        const prop = next();
        const property = node('Identifier', prop, prop, { name: String(prop.value) });
        expr = node('MemberExpression', expr, prop, { object: expr, property, computed: false, optional: false });
      } else if (eatPunct('[')) {
        const property = parseExpression();
        const end = peek();
        expectPunct(']');
        expr = node('MemberExpression', expr, end, { object: expr, property, computed: true, optional: false });
      } else if (isPunct('(')) {
        const { args, end } = parseArgs();
        expr = node('CallExpression', expr, end, { callee: expr, arguments: args, optional: false });
      } else {
        break;
      }
    }
    return expr;
  }

  function parsePrimaryOrMemberNoCall() {
    let expr = parsePrimary();
    while (true) {
      if (eatPunct('.')) {
        const prop = next();
        expr = node('MemberExpression', expr, prop, { object: expr, property: node('Identifier', prop, prop, { name: String(prop.value) }), computed: false });
      } else if (eatPunct('[')) {
        const property = parseExpression();
        const end = peek();
        expectPunct(']');
        expr = node('MemberExpression', expr, end, { object: expr, property, computed: true });
      } else {
        break;
      }
    }
    return expr;
  }

  function parsePrimary() {
    const t = peek();
    if (isKw('this')) { next(); return node('ThisExpression', t, t, {}); }
    if (isKw('super')) { next(); return node('Super', t, t, {}); }
    if (isKw('class')) return parseClass(false);
    if (isKw('async') && isKw('function', 1)) {
      const start = next();
      next();
      let id = null;
      if (peek().type === 'id') { const idT = next(); id = node('Identifier', idT, idT, { name: idT.value }); }
      const params = parseParams();
      const body = parseBlock();
      return node('FunctionExpression', start, body, { id, params, body, async: true });
    }
    if (isKw('async') && isPunct('(', 1)) {
      const start = next();
      const params = parseParams();
      expectPunct('=>');
      const { body, expression } = parseFunctionBodyOrExpr(true);
      return node('ArrowFunctionExpression', start, body, { params, body, expression, async: true });
    }
    if (isKw('function')) {
      const start = next();
      eatPunct('*');
      let id = null;
      if (peek().type === 'id') { const idT = next(); id = node('Identifier', idT, idT, { name: idT.value }); }
      const params = parseParams();
      const body = parseBlock();
      return node('FunctionExpression', start, body, { id, params, body, async: false });
    }
    if (isPunct('(')) {
      // Disambiguate arrow function `(a, b) => ...` vs parenthesized expression `(a + b)`
      const savedPos = pos;
      let depth = 0;
      let closeIdx = pos;
      while (closeIdx < tokens.length - 1) {
        if (tokens[closeIdx].type === 'punct' && tokens[closeIdx].value === '(') depth++;
        else if (tokens[closeIdx].type === 'punct' && tokens[closeIdx].value === ')') {
          depth--;
          if (depth === 0) break;
        }
        closeIdx++;
      }
      if (tokens[closeIdx + 1]?.type === 'punct' && tokens[closeIdx + 1].value === '=>') {
        const params = parseParams();
        expectPunct('=>');
        const { body, expression } = parseFunctionBodyOrExpr(true);
        return node('ArrowFunctionExpression', t, body, { params, body, expression, async: false });
      }
      pos = savedPos;
      next(); // '('
      const expr = parseExpression();
      expectPunct(')');
      return expr;
    }
    if (eatPunct('[')) {
      const elements = [];
      while (!isPunct(']') && peek().type !== 'eof') {
        if (eatPunct(',')) { elements.push(null); continue; }
        if (eatPunct('...')) {
          const s = peek();
          const arg = parseAssignment();
          elements.push(node('SpreadElement', s, arg, { argument: arg }));
        } else {
          elements.push(parseAssignment());
        }
        if (!eatPunct(',')) break;
      }
      const end = peek();
      expectPunct(']');
      return node('ArrayExpression', t, end, { elements });
    }
    if (eatPunct('{')) {
      const properties = [];
      while (!isPunct('}') && peek().type !== 'eof') {
        if (eatPunct('...')) {
          const s = peek();
          const arg = parseAssignment();
          properties.push(node('SpreadElement', s, arg, { argument: arg }));
        } else {
          const pStart = peek();
          let kind = 'init';
          if ((isKw('get') || isKw('set')) && !isPunct(':', 1) && !isPunct('(', 1) && !isPunct(',', 1) && !isPunct('}', 1)) {
            kind = next().value;
          }
          const computed = isPunct('[');
          const key = parsePropertyName();
          let value = key;
          let shorthand = false;
          let method = false;
          if (isPunct('(')) {
            const params = parseParams();
            const body = parseBlock();
            value = node('FunctionExpression', pStart, body, { id: null, params, body, async: false });
            method = true;
          } else if (eatPunct(':')) {
            value = parseAssignment();
          } else {
            shorthand = true;
          }
          properties.push(node('Property', pStart, value, { key, value, kind, computed, shorthand, method }));
        }
        if (!eatPunct(',')) break;
      }
      const end = peek();
      expectPunct('}');
      return node('ObjectExpression', t, end, { properties });
    }
    if (t.type === 'id') {
      next();
      return node('Identifier', t, t, { name: t.value });
    }
    if (t.type === 'number' || t.type === 'string' || t.type === 'boolean' || t.type === 'null' || t.type === 'regex') {
      next();
      return node('Literal', t, t, { value: t.value, raw: t.raw });
    }
    if (t.type === 'template') {
      next();
      return node('TemplateLiteral', t, t, { rawValue: t.value, raw: t.raw });
    }
    throw Error(`Unexpected token '${t.raw}' (${t.type}) at line ${t.line}`);
  }

  const body = [];
  while (peek().type !== 'eof') {
    body.push(parseStatement());
  }
  return node('Program', tokens[0], tokens[tokens.length - 1], { body });
}

// Generic AST walker + member-path formatter
export function walkAst(node, visitor, parent = null) {
  if (!node || typeof node !== 'object') return;
  visitor(node, parent);
  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'start' || key === 'end' || key === 'line' || key === 'raw') continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) if (item && typeof item.type === 'string') walkAst(item, visitor, node);
    } else if (child && typeof child.type === 'string') {
      walkAst(child, visitor, node);
    }
  }
}

export function formatAstExpr(node) {
  if (!node) return '';
  switch (node.type) {
    case 'ThisExpression': return 'this';
    case 'Super': return 'super';
    case 'Identifier': return node.name;
    case 'Literal': return node.raw ?? JSON.stringify(node.value);
    case 'TemplateLiteral': return '`' + node.rawValue + '`';
    case 'MemberExpression': {
      const obj = formatAstExpr(node.object);
      const prop = formatAstExpr(node.property);
      const sep = node.optional ? '?.' : '.';
      return node.computed ? `${obj}${node.optional ? '?.' : ''}[${prop}]` : `${obj}${sep}${prop}`;
    }
    case 'CallExpression': {
      const callee = formatAstExpr(node.callee);
      const args = (node.arguments ?? []).map(formatAstExpr).join(', ');
      return `${callee}(${args})`;
    }
    case 'NewExpression': {
      const callee = formatAstExpr(node.callee);
      const args = (node.arguments ?? []).map(formatAstExpr).join(', ');
      return `new ${callee}(${args})`;
    }
    case 'BinaryExpression':
    case 'LogicalExpression':
      return `(${formatAstExpr(node.left)} ${node.operator} ${formatAstExpr(node.right)})`;
    case 'UnaryExpression':
      return `${node.operator}${node.operator.length > 1 ? ' ' : ''}${formatAstExpr(node.argument)}`;
    case 'UpdateExpression':
      return node.prefix ? `${node.operator}${formatAstExpr(node.argument)}` : `${formatAstExpr(node.argument)}${node.operator}`;
    case 'AssignmentExpression':
      return `${formatAstExpr(node.left)} ${node.operator} ${formatAstExpr(node.right)}`;
    case 'ConditionalExpression':
      return `(${formatAstExpr(node.test)} ? ${formatAstExpr(node.consequent)} : ${formatAstExpr(node.alternate)})`;
    case 'ArrayExpression':
      return `[${(node.elements ?? []).map((e) => (e ? formatAstExpr(e) : '')).join(', ')}]`;
    case 'ObjectExpression':
      return `{${(node.properties ?? []).map((p) => (p.type === 'SpreadElement' ? '...' + formatAstExpr(p.argument) : `${formatAstExpr(p.key)}: ${formatAstExpr(p.value)}`)).join(', ')}}`;
    default:
      return `<${node.type}>`;
  }
}
