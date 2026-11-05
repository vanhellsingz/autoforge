// Restricted expression grammar for pure numeric rules. Client bytes are data.
const functions = new Map([['Math.floor', 1], ['Math.min', 2], ['Math.pow', 2]]);
const precedence = new Map([['+', 1], ['-', 1], ['*', 2], ['/', 2]]);

export function parseNumeric(source, inputs) {
  const lexer = /\s*(\d+(?:\.\d+)?|[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*|[+*/(),-])/y;
  const tokens = [];
  const text = source.trim();
  while (lexer.lastIndex < text.length) {
    const offset = lexer.lastIndex;
    const match = lexer.exec(text);
    if (!match) throw new Error(`Unsupported token at offset ${offset}`);
    tokens.push(match[1]);
  }
  let cursor = 0;
  function expect(token) {
    if (tokens[cursor++] !== token) throw new Error(`Expected ${token}`);
  }
  function atom() {
    const token = tokens[cursor++];
    if (token === '(') {
      const value = expression();
      expect(')');
      return value;
    }
    if (token && /^\d/.test(token)) {
      if (!Number.isFinite(Number(token))) throw new Error(`Invalid number ${token}`);
      return { kind: 'literal', value: token };
    }
    if (functions.has(token)) {
      expect('(');
      const args = [];
      for (let i = 0; i < functions.get(token); i++) {
        if (i > 0) expect(',');
        args.push(expression());
      }
      expect(')');
      return { kind: 'call', name: token, args };
    }
    if (inputs.has(token)) return { kind: 'input', name: inputs.get(token) };
    throw new Error(`Unsupported expression atom ${token}`);
  }
  function expression(minimum = 1) {
    let left = atom();
    while ((precedence.get(tokens[cursor]) ?? 0) >= minimum) {
      const op = tokens[cursor++];
      const right = expression(precedence.get(op) + 1);
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }
  const ast = expression();
  if (cursor !== tokens.length) throw new Error(`Unexpected token ${tokens[cursor]}`);
  return ast;
}

export function emitJava(node) {
  switch (node.kind) {
    case 'literal': {
      const value = String(Number(node.value));
      return /^\d+$/.test(value) ? `${value}.0` : value;
    }
    case 'input': return node.name;
    case 'call': return `${node.name}(${node.args.map(emitJava).join(', ')})`;
    case 'binary': return `(${emitJava(node.left)} ${node.op} ${emitJava(node.right)})`;
    default: throw new Error(`Unsupported AST node ${node.kind}`);
  }
}
