// LayaAir protobufjs AST Schema Extractor & Zero-Dependency Binary Wire Codec.
import { createHash } from 'node:crypto';
import { parseJsSlice, walkAst, formatAstExpr } from './js-ast.mjs';

const sha256 = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

const WIRE_TYPE_NAMES = {
  0: 'varint',
  1: 'fixed64',
  2: 'length-delimited',
  3: 'start-group',
  4: 'end-group',
  5: 'fixed32',
};

function unwrapOptionalCall(expr) {
  if (!expr) return null;
  if (expr.type === 'SequenceExpression' && expr.expressions.length) {
    return unwrapOptionalCall(expr.expressions[expr.expressions.length - 1]);
  }
  return expr;
}

// Extracts fields from an AST of `encode(message, writer)`
function extractFieldsFromEncodeAst(fnNode, sourceText) {
  const fields = [];
  const seenFieldNums = new Set();

  function recordField({ tag, scalarType, fieldName, repeated, nestedType, node }) {
    if (!Number.isInteger(tag) || tag <= 0) return;
    const fieldNumber = tag >>> 3;
    const wireType = tag & 7;
    if (fieldNumber <= 0) return;
    const key = `${fieldNumber}:${fieldName}`;
    if (seenFieldNums.has(key)) return;
    seenFieldNums.add(key);
    fields.push({
      fieldNumber,
      wireTag: tag,
      wireType,
      wireTypeName: WIRE_TYPE_NAMES[wireType] ?? `unknown(${wireType})`,
      scalarType,
      fieldName,
      repeated: !!repeated,
      nestedType: nestedType ?? null,
      startByte: node.start,
      endByte: node.end,
      line: node.line,
      snippet: sourceText.slice(node.start, Math.min(node.end, node.start + 160)),
    });
  }

  function extractMemberName(node) {
    if (!node) return null;
    if (node.type === 'MemberExpression') {
      if (!node.computed && node.property?.type === 'Identifier') return node.property.name;
      if (node.computed && node.property?.type === 'Literal') return String(node.property.value);
    }
    if (node.type === 'Identifier') return node.name;
    return formatAstExpr(node);
  }

  walkAst(fnNode.body, (node, parent) => {
    // Pattern 1: `writer.uint32(TAG).int32(message.fieldName)`
    if (
      node.type === 'CallExpression' &&
      node.callee?.type === 'MemberExpression' &&
      node.callee.object?.type === 'CallExpression' &&
      node.callee.object.callee?.type === 'MemberExpression' &&
      node.callee.object.callee.property?.name === 'uint32'
    ) {
      const tagArg = node.callee.object.arguments?.[0];
      const tag = tagArg?.type === 'Literal' && typeof tagArg.value === 'number' ? tagArg.value : null;
      const scalarType = node.callee.property?.name ?? 'unknown';
      const valArg = node.arguments?.[0];
      let fieldName = extractMemberName(valArg);
      let repeated = false;
      // Check repeated loop: `message.items[i]`
      if (valArg?.type === 'MemberExpression' && valArg.computed && valArg.object?.type === 'MemberExpression') {
        fieldName = extractMemberName(valArg.object);
        repeated = true;
      }
      if (tag !== null && fieldName && scalarType !== 'fork' && scalarType !== 'ldelim') {
        recordField({ tag, scalarType, fieldName, repeated, node });
      }
    }

    // Pattern 2: Nested message `NestedType.encode(message.sub, writer.uint32(TAG).fork()).ldelim()`
    if (
      node.type === 'CallExpression' &&
      node.callee?.type === 'MemberExpression' &&
      node.callee.property?.name === 'encode' &&
      node.arguments?.length >= 2
    ) {
      const nestedType = formatAstExpr(node.callee.object);
      const valArg = node.arguments[0];
      const writerArg = node.arguments[1];
      let tag = null;
      walkAst(writerArg, (inner) => {
        if (
          inner.type === 'CallExpression' &&
          inner.callee?.type === 'MemberExpression' &&
          inner.callee.property?.name === 'uint32' &&
          inner.arguments?.[0]?.type === 'Literal'
        ) {
          tag = inner.arguments[0].value;
        }
      });
      let fieldName = extractMemberName(valArg);
      let repeated = false;
      if (valArg?.type === 'MemberExpression' && valArg.computed && valArg.object?.type === 'MemberExpression') {
        fieldName = extractMemberName(valArg.object);
        repeated = true;
      }
      if (tag !== null && fieldName) {
        recordField({ tag, scalarType: 'message', fieldName, repeated, nestedType, node });
      }
    }

    // Pattern 3: Packed repeated `if (message.ids != null && message.ids.length) { writer.uint32(TAG).fork(); ... }`
    if (
      node.type === 'CallExpression' &&
      node.callee?.type === 'MemberExpression' &&
      node.callee.property?.name === 'fork' &&
      node.callee.object?.type === 'CallExpression' &&
      node.callee.object.callee?.type === 'MemberExpression' &&
      node.callee.object.callee.property?.name === 'uint32'
    ) {
      const tagArg = node.callee.object.arguments?.[0];
      const tag = tagArg?.type === 'Literal' && typeof tagArg.value === 'number' ? tagArg.value : null;
      if (tag !== null && parent && parent.type === 'ExpressionStatement') {
        // Look ahead in enclosing block for `writer.<type>(message.<field>[i])`
        // Handled by enclosing block inspection if needed
      }
    }
  });

  return fields.sort((a, b) => a.fieldNumber - b.fieldNumber);
}

// Extracts fields from an AST of `decode(reader, length)`
function extractFieldsFromDecodeAst(fnNode, sourceText) {
  const fields = [];
  const seen = new Set();

  walkAst(fnNode.body, (node) => {
    if (node.type === 'SwitchStatement') {
      for (const c of node.cases ?? []) {
        if (c.test?.type === 'Literal' && typeof c.test.value === 'number') {
          const fieldNumber = c.test.value;
          for (const stmt of c.consequent ?? []) {
            walkAst(stmt, (inner) => {
              if (
                inner.type === 'AssignmentExpression' &&
                inner.left?.type === 'MemberExpression'
              ) {
                const fieldName = inner.left.property?.name ?? String(inner.left.property?.value ?? '');
                let scalarType = 'unknown';
                let wireType = 0;
                if (inner.right?.type === 'CallExpression' && inner.right.callee?.type === 'MemberExpression') {
                  const m = inner.right.callee.property?.name;
                  if (m === 'decode') {
                    scalarType = 'message';
                    wireType = 2;
                  } else if (m) {
                    scalarType = m;
                    wireType = m === 'string' || m === 'bytes' ? 2 : m === 'double' || m === 'fixed64' || m === 'sfixed64' ? 1 : m === 'float' || m === 'fixed32' || m === 'sfixed32' ? 5 : 0;
                  }
                }
                const key = `${fieldNumber}:${fieldName}`;
                if (!seen.has(key) && fieldName) {
                  seen.add(key);
                  fields.push({
                    fieldNumber,
                    wireTag: (fieldNumber << 3) | wireType,
                    wireType,
                    wireTypeName: WIRE_TYPE_NAMES[wireType],
                    scalarType,
                    fieldName,
                    repeated: false,
                    nestedType: null,
                    startByte: inner.start,
                    endByte: inner.end,
                    line: inner.line,
                    snippet: sourceText.slice(inner.start, Math.min(inner.end, inner.start + 160)),
                  });
                }
              }
            });
          }
        }
      }
    }
  });

  return fields.sort((a, b) => a.fieldNumber - b.fieldNumber);
}

export function extractProtobufSchemas(protoSource, filePath = 'protobuf-bundles.js') {
  const schemas = new Map();
  const fileHash = sha256(protoSource);

  // Locate all `.encode = function` and `.decode = function` blocks in the bundle
  const re = /([A-Za-z_$][\w$.]*)\.(encode|decode)\s*=\s*function\b/g;
  for (const match of protoSource.matchAll(re)) {
    const fullSymbol = match[1];
    const kind = match[2];
    const shortName = fullSymbol.split('.').at(-1);
    const fnStart = match.index + match[0].indexOf('function');

    // Find matching brace for this function body
    const openBrace = protoSource.indexOf('{', fnStart);
    if (openBrace < 0) continue;
    let depth = 0;
    let inStr = null;
    let endBrace = -1;
    for (let i = openBrace; i < protoSource.length; i++) {
      const ch = protoSource[i];
      if (inStr) {
        if (ch === '\\') { i++; continue; }
        if (ch === inStr) inStr = null;
        continue;
      }
      if (ch === '"' || ch === "'") { inStr = ch; continue; }
      if (ch === '/' && protoSource[i + 1] === '*') {
        const close = protoSource.indexOf('*/', i + 2);
        if (close < 0) break;
        i = close + 1;
        continue;
      }
      if (ch === '/' && protoSource[i + 1] === '/') {
        const nl = protoSource.indexOf('\n', i + 2);
        if (nl < 0) break;
        i = nl;
        continue;
      }
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) { endBrace = i; break; }
      }
    }
    if (endBrace < 0) continue;

    const fnText = protoSource.slice(fnStart, endBrace + 1);
    const baseLine = protoSource.slice(0, fnStart).split('\n').length;
    let ast;
    try {
      ast = parseJsSlice(`(${fnText})`, { baseOffset: fnStart, baseLine });
    } catch {
      continue;
    }
    const fnExpr = unwrapOptionalCall(ast.body?.[0]?.expression);
    if (!fnExpr) continue;

    const fields = kind === 'encode'
      ? extractFieldsFromEncodeAst(fnExpr, protoSource)
      : extractFieldsFromDecodeAst(fnExpr, protoSource);

    let entry = schemas.get(shortName);
    if (!entry) {
      entry = {
        name: shortName,
        fullSymbol,
        filePath,
        fileSha256: fileHash,
        encode: null,
        decode: null,
        fields: [],
      };
      schemas.set(shortName, entry);
    }
    entry[kind] = {
      startByte: fnStart,
      endByte: endBrace + 1,
      line: baseLine,
      sha256: sha256(fnText),
      fields,
    };
    if (kind === 'encode' && fields.length) {
      entry.fields = fields;
    } else if (!entry.fields.length && fields.length) {
      entry.fields = fields;
    }
  }

  return {
    filePath,
    fileSha256: fileHash,
    messages: [...schemas.values()],
  };
}

// --- Zero-Dependency Spec-Compliant Binary Protobuf Wire Encoder & Decoder ---

function writeVarint64(bytes, value) {
  let v = BigInt.asUintN(64, BigInt(value));
  while (v >= 0x80n) {
    bytes.push(Number((v & 0x7fn) | 0x80n));
    v >>= 7n;
  }
  bytes.push(Number(v));
}

function writeVarint32(bytes, value) {
  const n = Number(value);
  if (n < 0) {
    // Per Protobuf wire specification, negative int32 is encoded as 10-byte two's-complement 64-bit varint
    writeVarint64(bytes, BigInt(n));
    return;
  }
  let v = n >>> 0;
  while (v >= 0x80) {
    bytes.push((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  bytes.push(v);
}

function zigZag32(n) {
  const v = n | 0;
  return ((v << 1) ^ (v >> 31)) >>> 0;
}

function zigZag64(n) {
  const v = BigInt.asIntN(64, BigInt(n));
  return BigInt.asUintN(64, (v << 1n) ^ (v >> 63n));
}

const SCALAR_WIRES = new Map([
  ...['int32', 'uint32', 'sint32', 'int64', 'uint64', 'sint64', 'bool', 'enum'].map((type) => [type, 0]),
  ...['double', 'fixed64', 'sfixed64'].map((type) => [type, 1]),
  ...['string', 'bytes'].map((type) => [type, 2]),
  ...['float', 'fixed32', 'sfixed32'].map((type) => [type, 5]),
]);

function validateWireSchema(schema) {
  if (!schema || !Array.isArray(schema.fields)) throw Error('Valid protobuf message schema required');
  const seen = new Set();
  for (const field of schema.fields) {
    if (!Number.isInteger(field.fieldNumber) || field.fieldNumber <= 0 || field.fieldNumber > 536870911 || seen.has(field.fieldNumber)) throw Error('Invalid or duplicate protobuf field number');
    seen.add(field.fieldNumber);
    if (!SCALAR_WIRES.has(field.scalarType) || field.packed || field.nestedType) throw Error('Unsupported protobuf scalar or packed/nested field: ' + field.scalarType);
    if (SCALAR_WIRES.get(field.scalarType) !== field.wireType) throw Error('Protobuf schema wire type mismatch');
  }
}

export function encodeWireMessage(schema, payload) {
  validateWireSchema(schema);
  const bytes = [];
  for (const field of schema.fields) {
    const rawVal = payload[field.fieldName];
    if (rawVal === undefined || rawVal === null) continue;
    const values = field.repeated && Array.isArray(rawVal) ? rawVal : [rawVal];
    for (const val of values) {
      const tag = (field.fieldNumber << 3) | field.wireType;
      writeVarint32(bytes, tag);
      switch (field.scalarType) {
        case 'int32':
        case 'enum':
          writeVarint32(bytes, Number(val) | 0);
          break;
        case 'uint32':
          writeVarint32(bytes, Number(val) >>> 0);
          break;
        case 'sint32':
          writeVarint32(bytes, zigZag32(Number(val)));
          break;
        case 'int64':
        case 'uint64':
          writeVarint64(bytes, BigInt(val));
          break;
        case 'sint64':
          writeVarint64(bytes, zigZag64(BigInt(val)));
          break;
        case 'bool':
          bytes.push(val ? 1 : 0);
          break;
        case 'string': {
          const utf8 = Buffer.from(String(val), 'utf8');
          writeVarint32(bytes, utf8.length);
          for (const b of utf8) bytes.push(b);
          break;
        }
        case 'bytes': {
          const buf = Buffer.isBuffer(val) ? val : Buffer.from(String(val), 'hex');
          writeVarint32(bytes, buf.length);
          for (const b of buf) bytes.push(b);
          break;
        }
        case 'fixed32': {
          const b = Buffer.allocUnsafe(4);
          b.writeUInt32LE(Number(val) >>> 0, 0);
          bytes.push(...b);
          break;
        }
        case 'sfixed32': {
          const b = Buffer.allocUnsafe(4);
          b.writeInt32LE(Number(val) | 0, 0);
          bytes.push(...b);
          break;
        }
        case 'float': {
          const b = Buffer.allocUnsafe(4);
          b.writeFloatLE(Number(val), 0);
          bytes.push(...b);
          break;
        }
        case 'double': {
          const b = Buffer.allocUnsafe(8);
          b.writeDoubleLE(Number(val), 0);
          bytes.push(...b);
          break;
        }
        case 'fixed64':
        case 'sfixed64': {
          const b = Buffer.allocUnsafe(8);
          if (field.scalarType === 'sfixed64') b.writeBigInt64LE(BigInt(val));
          else b.writeBigUInt64LE(BigInt(val));
          bytes.push(...b);
          break;
        }
        default:
          throw Error('Unsupported protobuf scalar: ' + field.scalarType);
      }
    }
  }
  return Buffer.from(bytes);
}

export function decodeWireMessage(schema, buffer) {
  validateWireSchema(schema);
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(String(buffer), 'hex');
  const fieldsByNum = new Map((schema?.fields ?? []).map((f) => [f.fieldNumber, f]));
  const result = {};
  const unknownFields = [];
  let offset = 0;

  function readVarint64() {
    let shift = 0n;
    let res = 0n;
    while (offset < buf.length) {
      const b = buf[offset++];
      res |= BigInt(b & 0x7f) << shift;
      if ((b & 0x80) === 0) return res;
      shift += 7n;
      if (shift > 63n) throw Error('Malformed varint64');
    }
    throw Error('Truncated varint');
  }

  while (offset < buf.length) {
    const tag = Number(readVarint64());
    const fieldNumber = tag >>> 3;
    const wireType = tag & 7;
    const def = fieldsByNum.get(fieldNumber);
    if (fieldNumber === 0) throw Error('Invalid protobuf field zero');
    if (def && def.wireType !== wireType) throw Error('Protobuf payload wire type mismatch');
    let val;

    if (wireType === 0) {
      const raw64 = readVarint64();
      const s = def?.scalarType ?? 'int32';
      if (s === 'bool') val = raw64 !== 0n;
      else if (s === 'sint32') {
        const u = Number(raw64 & 0xffffffffn);
        val = (u >>> 1) ^ -(u & 1);
      } else if (s === 'sint64') {
        val = ((raw64 >> 1n) ^ -(raw64 & 1n)).toString();
      } else if (s === 'uint32') {
        val = Number(raw64 & 0xffffffffn);
      } else if (s === 'int64' || s === 'uint64') {
        const signed = s === 'int64' ? BigInt.asIntN(64, raw64) : raw64;
        val = signed >= BigInt(Number.MIN_SAFE_INTEGER) && signed <= BigInt(Number.MAX_SAFE_INTEGER)
          ? Number(signed)
          : signed.toString();
      } else {
        val = Number(BigInt.asIntN(32, raw64));
      }
    } else if (wireType === 1) {
      if (offset + 8 > buf.length) throw Error('Truncated fixed64');
      val = def?.scalarType === 'double' ? buf.readDoubleLE(offset)
        : def?.scalarType === 'sfixed64' ? buf.readBigInt64LE(offset).toString() : buf.readBigUInt64LE(offset).toString();
      offset += 8;
    } else if (wireType === 2) {
      const len = Number(readVarint64());
      if (offset + len > buf.length) throw Error('Truncated length-delimited field');
      const slice = buf.subarray(offset, offset + len);
      offset += len;
      val = def?.scalarType === 'bytes' ? slice.toString('hex') : slice.toString('utf8');
    } else if (wireType === 5) {
      if (offset + 4 > buf.length) throw Error('Truncated fixed32');
      val = def?.scalarType === 'float' ? buf.readFloatLE(offset)
        : def?.scalarType === 'sfixed32' ? buf.readInt32LE(offset) : buf.readUInt32LE(offset);
      offset += 4;
    } else {
      throw Error(`Unsupported wireType ${wireType} for field ${fieldNumber}`);
    }

    if (def) {
      if (def.repeated) {
        if (!Array.isArray(result[def.fieldName])) result[def.fieldName] = [];
        result[def.fieldName].push(val);
      } else {
        result[def.fieldName] = val;
      }
    } else {
      unknownFields.push({ fieldNumber, wireType, value: val });
    }
  }

  return { decoded: result, unknownFields };
}
