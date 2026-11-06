// Intra/Inter-Procedural AST Dataflow, Taint Graph & Semantic Role Inference for LayaAir Web/JS.
import { createHash } from 'node:crypto';
import { parseJsSlice, walkAst, formatAstExpr } from './js-ast.mjs';
import { parseNumeric, emitJava } from '../../numeric-ast.mjs';

const sha256 = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

const ACTION_PRESETS = {
  'gem-transform': {
    keywords: ['sendSwitch', 'C_ITEM_TRANSFORM', 't_s_transformtemplate', 'itemTarget', 'itemCurrent', 'Transform'],
    catalogTables: ['t_s_transformtemplate', 't_s_itemtemplate'],
  },
  'luck-stone-compose': {
    keywords: ['Compose', 'sendCompose', 'onCompose', 'C_ITEM_COMPOSE', 'S_ITEM_COMPOSE', 't_s_compose', 't_s_itemtemplate'],
    catalogTables: ['t_s_compose', 't_s_itemtemplate'],
  },
  'enchant-filter': {
    keywords: ['Enchant', 'Strengthen', 'checkCanEnchant', 'onStrengthen', 'C_ITEM_STRENGTHEN', 't_s_strengthen', 't_s_itemtemplate'],
    catalogTables: ['t_s_strengthen', 't_s_itemtemplate'],
  },
  'troop-recruit': {
    keywords: ['Recruit', 'Army', 'Troop', 'C_ARMY', 't_s_pawn'],
    catalogTables: ['t_s_pawn'],
  },
  'chest-open': {
    keywords: ['Chest', 'openChest', 'Box', 'C_OPEN_CHEST', 't_s_drop'],
    catalogTables: ['t_s_drop', 't_s_itemtemplate'],
  },
  'map-settle': {
    keywords: ['Campaign', 'Map', 'Settle', 'C_CAMPAIGN', 't_s_campaign'],
    catalogTables: ['t_s_campaign'],
  },
  'bonus-apply': {
    keywords: ['Bonus', 'Buff', 'FightingCapacity', 'Property', 't_s_skilltemplate'],
    catalogTables: ['t_s_skilltemplate', 't_s_itemtemplate'],
  },
};

function paramName(param) {
  if (!param) return null;
  if (param.type === 'Identifier') return param.name;
  if (param.type === 'AssignmentPattern') return paramName(param.left);
  if (param.type === 'RestElement') return paramName(param.argument);
  return formatAstExpr(param);
}

function collectExprIdentifiers(node, out = new Set()) {
  walkAst(node, (n) => {
    if (n.type === 'Identifier') out.add(n.name);
    if (n.type === 'MemberExpression') out.add(formatAstExpr(n));
  });
  return [...out];
}

function inferRoleFromChain(fieldName, chainExprs, protoField) {
  const joined = [fieldName, ...chainExprs].join(' ').toLowerCase();
  if (/(?:src|source|targetitem|itemtarget|material1|from|consume)/.test(joined) && !/(?:pos|slot|bag|count|num|qty)/.test(fieldName.toLowerCase())) {
    if (/(?:id|template)/.test(joined)) return { role: 'SOURCE_ITEM_TEMPLATE', unit: 'templateId', type: protoField?.scalarType ?? 'int32' };
    return { role: 'SOURCE_ITEM_INSTANCE', unit: 'instanceId', type: protoField?.scalarType ?? 'int64' };
  }
  if (/(?:des|dst|dest|target|itemcurrent|material2|to)/.test(joined) && !/(?:pos|slot|bag|count|num|qty)/.test(fieldName.toLowerCase())) {
    return { role: 'DEST_ITEM_TEMPLATE', unit: 'templateId', type: protoField?.scalarType ?? 'int32' };
  }
  if (/(?:count|num|qty|amount)/.test(joined)) {
    return { role: 'QUANTITY', unit: 'itemCount', type: protoField?.scalarType ?? 'int32' };
  }
  if (/(?:pos|slot|index|grid)/.test(joined)) {
    return { role: 'SOURCE_SLOT_POS', unit: 'slotIndex', type: protoField?.scalarType ?? 'int32' };
  }
  if (/(?:bagtype|bag)/.test(joined)) {
    return { role: 'BAG_TYPE', unit: 'bagEnum', type: protoField?.scalarType ?? 'int32' };
  }
  if (/(?:bind|bound)/.test(joined)) {
    return { role: 'BIND_FLAG', unit: 'boolean', type: protoField?.scalarType ?? 'bool' };
  }
  if (/(?:gold|coin|diamond|cost|price)/.test(joined)) {
    return { role: 'CURRENCY_COST', unit: 'currency', type: protoField?.scalarType ?? 'int64' };
  }
  if (/(?:level|grade|strengthen)/.test(joined)) {
    return { role: 'ITEM_LEVEL', unit: 'level', type: protoField?.scalarType ?? 'int32' };
  }
  if (/(?:pawn|troop|army|soldier)/.test(joined)) {
    return { role: 'TROOP_TEMPLATE_ID', unit: 'pawnId', type: protoField?.scalarType ?? 'int32' };
  }
  if (/(?:chest|box|drop)/.test(joined)) {
    return { role: 'CHEST_ENTITY_ID', unit: 'chestId', type: protoField?.scalarType ?? 'int32' };
  }
  if (/(?:campaign|map|stage|dungeon)/.test(joined)) {
    return { role: 'MAP_NODE_ID', unit: 'mapId', type: protoField?.scalarType ?? 'int32' };
  }
  if (/(?:grid|formation|heroslot)/.test(joined)) {
    return { role: 'FORMATION_SLOT', unit: 'slotIndex', type: protoField?.scalarType ?? 'int32' };
  }
  if (/(?:bonus|rate|percent|weight)/.test(joined)) {
    return { role: 'BONUS_COEFFICIENT', unit: 'basisPoints', type: protoField?.scalarType ?? 'int32' };
  }
  return { role: `FIELD_${fieldName.toUpperCase()}`, unit: 'scalar', type: protoField?.scalarType ?? 'int32' };
}

function classifyQuantitySource(exprText) {
  if (!exprText) return { mode: 'UNKNOWN', isWholeStack: false, isUnitLiteral: false };
  const trimmed = exprText.trim();
  if (trimmed === '1') {
    return { mode: 'UNIT_CONSTANT', isWholeStack: false, isUnitLiteral: true };
  }
  if (/(?:txtNum|numInput|stepper|slider|inputCount|selectCount)/i.test(trimmed)) {
    return { mode: 'USER_INPUT_CONTROL', isWholeStack: false, isUnitLiteral: false };
  }
  if (/(?:itemCurrent|itemTarget|selectItem|curItem|srcItem).*\.count\b/i.test(trimmed)) {
    return { mode: 'STACK_SIZE_PROPERTY', isWholeStack: true, isUnitLiteral: false };
  }
  return { mode: 'DERIVED_EXPRESSION', isWholeStack: false, isUnitLiteral: false };
}

function matchProtobufSchema(constructedClass, assignedFields, allSchemas) {
  if (!allSchemas?.length) return null;
  if (constructedClass) {
    const exact = allSchemas.filter((s) => s.name === constructedClass || s.fullSymbol?.endsWith('.' + constructedClass));
    if (exact.length === 1) return { schema: exact[0], matchKind: 'EXACT_SYMBOL' };
    if (exact.length > 1) return null;
  }
  // Structural field-set bijection (survives minification of class `$q` -> `StoreReqMsg`)
  const fieldNames = Object.keys(assignedFields);
  if (!fieldNames.length) return null;
  const matches = [];
  for (const s of allSchemas) {
    const sNames = new Set(s.fields.map((f) => f.fieldName));
    const overlap = fieldNames.filter((n) => sNames.has(n)).length;
    if (overlap === fieldNames.length && overlap > 0) {
      matches.push(s);
    }
  }
  if (!matches.length) return null;
  const smallest = Math.min(...matches.map((schema) => schema.fields.length));
  const best = matches.filter((schema) => schema.fields.length === smallest);
  return best.length === 1 ? { schema: best[0], matchKind: 'STRUCTURAL_FIELD_SET_INFERENCE' } : null;
}

// Traces S2C response consumers, BagModel mutations, LayaAir UI refresh triggers, and item selection filters.
function analyzeUiConsumersAndFilters({ sourcesByFile, indexedFiles, actionKeywords, s2cOpcodes }) {
  const s2cConsumers = [];
  const uiFilters = [];
  const uiRefreshGaps = [];

  for (const idx of indexedFiles) {
    const src = sourcesByFile.get(idx.filePath);
    if (!src) continue;

    // 1. Inspect S2C listener sites & methods handling S2C opcodes or bag/compose/enchant updates
    for (const listener of idx.listenerSites) {
      const matchesOpcode = s2cOpcodes.some((op) =>
        listener.argPreview.includes(op.name) ||
        listener.argPreview.includes(String(op.value))
      );
      const matchesAction = actionKeywords.some((kw) => listener.argPreview.toLowerCase().includes(kw.toLowerCase()));
      if (!matchesOpcode && !matchesAction) continue;

      // Follow LayaAir callback reference `this.onComposeResp` if present in `.on(OPCODE, this, this.onComposeResp)`
      const cbMatch = listener.argPreview.match(/,\s*(?:this\.)?([A-Za-z_$][\w$]*)\s*$/);
      const callbackFn = cbMatch
        ? idx.functions.find((f) =>
            (listener.enclosingClass && f.qualifiedName === `${listener.enclosingClass}.${cbMatch[1]}`) ||
            f.name === cbMatch[1]
          )
        : null;
      const enclosingFn = callbackFn
        ?? idx.functions.find((f) => f.qualifiedName === listener.enclosingFunction)
        ?? idx.classes.find((c) => c.name === listener.enclosingClass);
      const regionText = enclosingFn ? src.slice(enclosingFn.startByte, enclosingFn.endByte) : src.slice(Math.max(0, listener.startByte - 200), Math.min(src.length, listener.endByte + 600));
      const baseLine = enclosingFn ? enclosingFn.line : listener.line;
      const baseOffset = enclosingFn ? enclosingFn.startByte : Math.max(0, listener.startByte - 200);

      const modelMutations = [];
      const uiRefreshCalls = [];
      const modalUnlocks = [];
      let hasWaitLock = false;

      try {
        const ast = parseJsSlice(regionText, { baseOffset, baseLine });
        walkAst(ast, (node) => {
          if (node.type === 'CallExpression') {
            const calleeStr = formatAstExpr(node.callee);
            if (/(?:addItem|removeItem|updateItem|setItemList|updateCount|syncBag|delItem)/i.test(calleeStr)) {
              modelMutations.push({ call: calleeStr, line: node.line, startByte: node.start, endByte: node.end });
            }
            if (/(?:refresh|updateView|renderList|invalidate|BagEvent|CHANGE|UPDATE|dispatchEvent|\.event\s*\()/i.test(calleeStr) ||
                /\.array\s*=/.test(regionText.slice(Math.max(0, node.start - baseOffset - 30), node.end - baseOffset))) {
              uiRefreshCalls.push({ call: calleeStr, line: node.line, startByte: node.start, endByte: node.end });
            }
            if (/(?:LoadingManager|WaitView|MaskLayer)\.(?:show|lock|open)/i.test(calleeStr)) {
              hasWaitLock = true;
            }
            if (/(?:LoadingManager|WaitView|MaskLayer)\.(?:hide|unlock|close)/i.test(calleeStr)) {
              modalUnlocks.push({ call: calleeStr, line: node.line, startByte: node.start, endByte: node.end });
            }
          }
          if (node.type === 'AssignmentExpression' && /\.array$/.test(formatAstExpr(node.left))) {
            uiRefreshCalls.push({ call: formatAstExpr(node), line: node.line, startByte: node.start, endByte: node.end });
          }
        });
      } catch {
        // Fallback lexical check on bounded slice
      }

      if (modelMutations.length && !uiRefreshCalls.length) {
        uiRefreshGaps.push({
          kind: 'MISSING_UI_REFRESH_AFTER_MODEL_MUTATION',
          filePath: idx.filePath,
          line: listener.line,
          enclosingFunction: listener.enclosingFunction,
          detail: 'S2C consumer mutates bag/item model without dispatching a LayaAir list.refresh() or BagEvent.UPDATE notification.',
        });
      }
      if (hasWaitLock && !modalUnlocks.length) {
        uiRefreshGaps.push({
          kind: 'MISSING_MODAL_UNLOCK_IN_RESPONSE',
          filePath: idx.filePath,
          line: listener.line,
          enclosingFunction: listener.enclosingFunction,
          detail: 'Wait/Loading spinner is locked without a guaranteed unlock in the S2C handler.',
        });
      }

      s2cConsumers.push({
        listenerMethod: listener.method,
        argPreview: listener.argPreview,
        enclosingClass: listener.enclosingClass,
        enclosingFunction: listener.enclosingFunction,
        filePath: idx.filePath,
        line: listener.line,
        startByte: listener.startByte,
        endByte: listener.endByte,
        modelMutations,
        uiRefreshCalls,
        modalUnlocks,
      });
    }

    // 2. Inspect item selection filter predicates (e.g., `checkCanEnchant`, `.filter(...)`, `getEnchantList`)
    for (const fn of idx.functions) {
      const fnText = src.slice(fn.startByte, fn.endByte);
      const isFilterCandidate = /(?:filter|checkCan|canEnchant|canUse|canTransform|getValidItems|isMaterial)/i.test(fn.name)
        || (actionKeywords.some((kw) => fnText.includes(kw)) && /\.filter\s*\(/.test(fnText));
      if (!isFilterCandidate) continue;

      try {
        const ast = parseJsSlice(fnText, { baseOffset: fn.startByte, baseLine: fn.line });
        const checkedProperties = new Set();
        const predicates = [];

        walkAst(ast, (node) => {
          if (node.type === 'MemberExpression') {
            const exprStr = formatAstExpr(node);
            if (/(?:templateInfo|info|item)\.[A-Za-z_$][\w$]*/.test(exprStr)) {
              checkedProperties.add(exprStr);
            }
          }
          if (node.type === 'IfStatement' || node.type === 'ConditionalExpression' ||
              node.type === 'ReturnStatement' ||
              (node.type === 'CallExpression' && node.callee?.property?.name === 'filter')) {
            const condNode = node.type === 'CallExpression'
              ? node.arguments?.[0]
              : node.type === 'ReturnStatement'
                ? node.argument
                : node.test;
            if (condNode) {
              predicates.push({
                expression: formatAstExpr(condNode),
                line: condNode.line,
                startByte: condNode.start,
                endByte: condNode.end,
              });
            }
          }
        });

        if (checkedProperties.size || predicates.length) {
          uiFilters.push({
            functionName: fn.qualifiedName,
            filePath: idx.filePath,
            line: fn.line,
            endLine: fn.endLine,
            startByte: fn.startByte,
            endByte: fn.endByte,
            sha256: fn.sha256,
            checkedProperties: [...checkedProperties],
            predicates,
          });
        }
      } catch {
        // Ignore unparseable fragment
      }
    }
  }

  return { s2cConsumers, uiFilters, uiRefreshGaps };
}

export function analyzeClientActionSlice({ clientIndex, actionQuery, targetOpcode = null, catalogs = [], protoSchemas = [] }) {
  const preset = ACTION_PRESETS[actionQuery] ?? null;
  const queryTokens = actionQuery
    .split(/[^A-Za-z0-9_]+/)
    .filter((t) => t.length >= 2);
  const actionKeywords = [...new Set([
    ...(preset?.keywords ?? []),
    ...queryTokens,
    actionQuery,
  ])];

  const sourcesByFile = new Map(clientIndex.jsFiles.map((f) => [f.relPath, f.text]));
  const indexedFiles = clientIndex.jsFiles.map((f) => f.regionIndex);

  // Collect all opcodes across client bundle
  const allOpcodes = indexedFiles.flatMap((idx) => idx.opcodes);
  const opcodeByName = new Map(allOpcodes.map((o) => [o.fullName, o]));
  const opcodeByShortName = new Map(allOpcodes.map((o) => [o.name, o]));
  const opcodeByValue = new Map(allOpcodes.map((o) => [o.value, o]));

  // Find candidate send sites matching targetOpcode or actionKeywords
  const candidates = [];
  for (const idx of indexedFiles) {
    const src = sourcesByFile.get(idx.filePath);
    for (const site of idx.sendSites) {
      const fnObj = idx.functions.find((f) => f.qualifiedName === site.enclosingFunction);
      const clsObj = idx.classes.find((c) => c.name === site.enclosingClass);
      const contextText = fnObj
        ? src.slice(fnObj.startByte, fnObj.endByte)
        : clsObj
          ? src.slice(clsObj.startByte, clsObj.endByte)
          : site.callText;

      let score = 0;
      const commaIdx = site.argTokens.indexOf(',');
      const firstArgExpr = (commaIdx >= 0 ? site.argTokens.slice(0, commaIdx) : site.argTokens).join('').trim();
      const exactOpcode = firstArgExpr === String(targetOpcode) || opcodeByName.get(firstArgExpr)?.value === Number(targetOpcode) || opcodeByShortName.get(firstArgExpr.split('.').at(-1))?.value === Number(targetOpcode);
      if (targetOpcode !== null && !exactOpcode) continue;
      if (targetOpcode !== null && exactOpcode) {
        score += 100;
      }
      for (const kw of actionKeywords) {
        if (site.enclosingFunction?.toLowerCase().includes(kw.toLowerCase())) score += 25;
        if (site.callText.toLowerCase().includes(kw.toLowerCase())) score += 20;
        if (contextText.toLowerCase().includes(kw.toLowerCase())) score += 5;
      }
      if (score > 0) {
        candidates.push({ score, site, idx, fnObj, clsObj });
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score || a.site.startByte - b.site.startByte);

  const captureQuestions = [];
  const clientDefects = [];
  const recoveredVariables = [];
  const validationGuards = [];
  const numericFormulas = [];
  const catalogBindings = [];

  if (!candidates.length) {
    captureQuestions.push({
      id: 'Q_ANCHOR_MISSING',
      stage: 'ui_control',
      question: `No static transport.send(...) call site matched action "${actionQuery}". Record one CDP click trace on the target button to capture the runtime call stack and C2S opcode.`,
      neededMeasurement: 'CDP Runtime.callFunctionOn / WebSocket binary frame on button click',
    });
  }

  const primary = candidates[0] ?? null;
  let resolvedOpcode = null;
  let resolvedS2cOpcodes = [];
  let matchedProto = null;
  let uiCallSite = null;
  let senderFunction = null;
  const fieldBindings = {};

  if (primary) {
    const { site, idx, fnObj, clsObj } = primary;
    const src = sourcesByFile.get(idx.filePath);

    // Resolve C2S opcode from first argument of `.send(OPCODE, msg)`
    const commaPos = site.argTokens.indexOf(',');
    const firstArg = (commaPos >= 0 ? site.argTokens.slice(0, commaPos) : site.argTokens).join('').trim();
    const opEntry = opcodeByName.get(firstArg)
      ?? opcodeByShortName.get(firstArg.split('.').at(-1))
      ?? (/^\d+$/.test(firstArg) ? (opcodeByValue.get(Number(firstArg)) ?? { name: `OP_${firstArg}`, fullName: firstArg, value: Number(firstArg), direction: 'C2S' }) : null);

    if (opEntry) {
      resolvedOpcode = opEntry;
      // Find paired S2C opcodes sharing suffix (e.g. C_ITEM_TRANSFORM -> S_ITEM_TRANSFORM) or bag update opcodes
      const suffix = opEntry.name.replace(/^[CS]2?[SC]?_/, '');
      resolvedS2cOpcodes = allOpcodes.filter((o) =>
        o.direction === 'S2C' && (o.name.endsWith(suffix) || /BAG_MOVE_UPDATE|PLAYER_INFO|ITEM_/.test(o.name))
      );
    } else {
      captureQuestions.push({
        id: 'Q_DYNAMIC_OPCODE',
        stage: 'c2s_dispatch',
        filePath: idx.filePath,
        line: site.line,
        startByte: site.startByte,
        endByte: site.endByte,
        question: `Opcode expression "${firstArg}" at ${idx.filePath}:${site.line} could not be resolved statically. Capture the outgoing WebSocket frame header.`,
      });
    }

    // Parse the sender function AST (e.g., `static sendSwitch(t, e, i) { let s = new $q; ... }`)
    const senderRegion = fnObj ?? clsObj;
    if (senderRegion) {
      const senderSrc = src.slice(senderRegion.startByte, senderRegion.endByte);
      const senderAst = parseJsSlice(senderSrc, { baseOffset: senderRegion.startByte, baseLine: senderRegion.line });

      let targetFnNode = null;
      walkAst(senderAst, (n) => {
        if (!targetFnNode && (n.type === 'FunctionDeclaration' || n.type === 'FunctionExpression' || n.type === 'MethodDefinition')) {
          const fnInner = n.type === 'MethodDefinition' ? n.value : n;
          if (fnInner.start <= site.startByte && fnInner.end >= site.endByte) {
            targetFnNode = fnInner;
          }
        }
      });

      if (targetFnNode) {
        const params = (targetFnNode.params ?? []).map(paramName);
        const localAliases = new Map();
        let constructedClass = null;
        let messageVarName = null;

        // Second argument of `.send(opcode, msgVar)`
        const secondArgTok = site.argTokens.slice(site.argTokens.indexOf(',') + 1).join('').trim();
        if (secondArgTok) messageVarName = secondArgTok;

        walkAst(targetFnNode.body, (n) => {
          if (n.type === 'VariableDeclarator' && n.id?.type === 'Identifier') {
            if (n.init?.type === 'NewExpression') {
              constructedClass = formatAstExpr(n.init.callee);
              if (!messageVarName) messageVarName = n.id.name;
            } else if (n.init) {
              localAliases.set(n.id.name, formatAstExpr(n.init));
            }
          }
          if (
            n.type === 'AssignmentExpression' &&
            n.left?.type === 'MemberExpression' &&
            n.left.object?.type === 'Identifier' &&
            (!messageVarName || n.left.object.name === messageVarName)
          ) {
            const propName = n.left.property?.name ?? String(n.left.property?.value ?? '');
            const rhsExpr = formatAstExpr(n.right);
            const resolvedAlias = localAliases.get(rhsExpr) ?? rhsExpr;
            const paramIdx = params.indexOf(resolvedAlias);
            fieldBindings[propName] = {
              messageVar: n.left.object.name,
              rhsExpr,
              resolvedLocalExpr: resolvedAlias,
              paramIndex: paramIdx >= 0 ? paramIdx : null,
              paramName: paramIdx >= 0 ? params[paramIdx] : null,
              line: n.line,
              startByte: n.start,
              endByte: n.end,
              snippet: src.slice(n.start, n.end),
            };
          }
        });

        senderFunction = {
          qualifiedName: fnObj?.qualifiedName ?? clsObj?.name,
          filePath: idx.filePath,
          line: senderRegion.line,
          endLine: senderRegion.endLine,
          startByte: senderRegion.startByte,
          endByte: senderRegion.endByte,
          sha256: senderRegion.sha256,
          params,
          constructedClass,
          messageVarName,
          snippet: senderSrc,
        };

        // Match protobuf schema
        matchedProto = matchProtobufSchema(constructedClass, fieldBindings, protoSchemas);

        // Now find UI call sites invoking `sendSwitch(...)` or the sender method across the bundle!
        const shortFnName = fnObj?.name;
        if (shortFnName) {
          for (const searchIdx of indexedFiles) {
            const searchSrc = sourcesByFile.get(searchIdx.filePath);
            for (const candFn of searchIdx.functions) {
              if (candFn.startByte === senderRegion.startByte && candFn.filePath === idx.filePath) continue;
              const candBody = searchSrc.slice(candFn.startByte, candFn.endByte);
              if (!candBody.includes(shortFnName + '(')) continue;

              // Parse caller UI class or method AST
              const parentCls = searchIdx.classes.find((c) => c.startByte <= candFn.startByte && c.endByte >= candFn.endByte);
              const parseTarget = parentCls ?? candFn;
              const parseText = searchSrc.slice(parseTarget.startByte, parseTarget.endByte);
              try {
                const callerAst = parseJsSlice(parseText, { baseOffset: parseTarget.startByte, baseLine: parseTarget.line });
                const thisFieldOrigins = new Map();

                // Collect `this.<prop> = ...` assignments in the UI class
                walkAst(callerAst, (node) => {
                  if (
                    node.type === 'AssignmentExpression' &&
                    node.left?.type === 'MemberExpression' &&
                    node.left.object?.type === 'ThisExpression'
                  ) {
                    const prop = node.left.property?.name ?? formatAstExpr(node.left.property);
                    const rhs = formatAstExpr(node.right);
                    if (!thisFieldOrigins.has(`this.${prop}`)) thisFieldOrigins.set(`this.${prop}`, []);
                    thisFieldOrigins.get(`this.${prop}`).push({
                      expr: rhs,
                      line: node.line,
                      startByte: node.start,
                      endByte: node.end,
                    });
                  }
                });

                // Find the exact CallExpression to `shortFnName(...)`
                walkAst(callerAst, (node) => {
                  if (
                    node.type === 'CallExpression' &&
                    ((node.callee?.type === 'Identifier' && node.callee.name === shortFnName) ||
                     (node.callee?.type === 'MemberExpression' && node.callee.property?.name === shortFnName))
                  ) {
                    const callArgs = (node.arguments ?? []).map((arg, argIdx) => {
                      const exprStr = formatAstExpr(arg);
                      const origins = [];
                      for (const [thisKey, list] of thisFieldOrigins.entries()) {
                        if (exprStr.includes(thisKey)) {
                          origins.push({ symbol: thisKey, writes: list });
                        }
                      }
                      return {
                        argIndex: argIdx,
                        expr: exprStr,
                        line: arg.line,
                        startByte: arg.start,
                        endByte: arg.end,
                        thisOrigins: origins,
                      };
                    });

                    // Extract validation guards & numeric formulas inside the UI class/method
                    walkAst(callerAst, (stmt) => {
                      if (stmt.type === 'IfStatement') {
                        const condText = formatAstExpr(stmt.test);
                        validationGuards.push({
                          side: 'client',
                          condition: condText,
                          filePath: searchIdx.filePath,
                          line: stmt.line,
                          startByte: stmt.start,
                          endByte: stmt.end,
                        });
                      }
                      // Check binary numeric formulas using numeric-ast.mjs
                      if (stmt.type === 'BinaryExpression' && ['+', '-', '*', '/'].includes(stmt.operator)) {
                        const rawFormula = formatAstExpr(stmt).replace(/^\((.*)\)$/, '$1');
                        const ids = collectExprIdentifiers(stmt).filter((id) => !id.includes('.'));
                        if (ids.length >= 1 && ids.length <= 4 && !/["'`]/.test(rawFormula)) {
                          try {
                            const inputMap = new Map(ids.map((id) => [id, id]));
                            const numAst = parseNumeric(rawFormula, inputMap);
                            numericFormulas.push({
                              source: rawFormula,
                              javaExpr: emitJava(numAst),
                              inputs: ids,
                              filePath: searchIdx.filePath,
                              line: stmt.line,
                              startByte: stmt.start,
                              endByte: stmt.end,
                            });
                          } catch {
                            // Not a pure numeric formula; skip
                          }
                        }
                      }
                      // Check computed bracket catalog lookups like `this._switchTemp["Material" + e]`
                      if (stmt.type === 'MemberExpression' && stmt.computed && stmt.property?.type === 'BinaryExpression') {
                        const exprStr = formatAstExpr(stmt);
                        if (/Material|Template|Config|Temp/i.test(exprStr)) {
                          captureQuestions.push({
                            id: `Q_COMPUTED_PROP_${stmt.line}`,
                            stage: 'catalog_lookup',
                            filePath: searchIdx.filePath,
                            line: stmt.line,
                            startByte: stmt.start,
                            endByte: stmt.end,
                            question: `Computed property lookup "${exprStr}" at ${searchIdx.filePath}:${stmt.line} depends on dynamic key "${formatAstExpr(stmt.property)}". Verify runtime index bounds against catalog columns.`,
                          });
                        }
                      }
                    });

                    uiCallSite = {
                      callerFunction: candFn.qualifiedName,
                      uiClass: parentCls?.name ?? null,
                      filePath: searchIdx.filePath,
                      line: node.line,
                      startByte: node.start,
                      endByte: node.end,
                      classSha256: parentCls?.sha256 ?? candFn.sha256,
                      callExpr: formatAstExpr(node),
                      callArgs,
                      thisFieldOrigins: Object.fromEntries(thisFieldOrigins),
                    };
                  }
                });
              } catch {
                // Skip if outer class has syntax outside bounded slice
              }
            }
          }
        }

        // Bind caller arguments -> sender params -> protobuf fields -> semantic roles
        for (const [propName, binding] of Object.entries(fieldBindings)) {
          const protoField = matchedProto?.schema?.fields?.find((f) => f.fieldName === propName) ?? null;
          const callerArg = binding.paramIndex !== null ? uiCallSite?.callArgs?.[binding.paramIndex] ?? null : null;
          const chainExprs = [
            binding.rhsExpr,
            binding.resolvedLocalExpr,
            callerArg?.expr ?? '',
            ...(callerArg?.thisOrigins?.flatMap((o) => o.writes.map((w) => w.expr)) ?? []),
          ].filter(Boolean);

          const inferred = inferRoleFromChain(propName, chainExprs, protoField);

          // Check quantity source mode for QUANTITY role
          if (inferred.role === 'QUANTITY') {
            const qClass = classifyQuantitySource(callerArg?.expr ?? binding.resolvedLocalExpr);
            inferred.quantitySourceMode = qClass.mode;
            if (qClass.isWholeStack) {
              clientDefects.push({
                id: 'CLIENT_STACK_QUANTITY_FORCED',
                severity: 'HIGH',
                stage: 'selection_and_quantity',
                filePath: uiCallSite?.filePath ?? idx.filePath,
                line: callerArg?.line ?? binding.line,
                startByte: callerArg?.startByte ?? binding.startByte,
                endByte: callerArg?.endByte ?? binding.endByte,
                message: `Action sends whole stack count "${callerArg?.expr ?? binding.resolvedLocalExpr}" instead of unit selector (1 or stepper value), causing single-unit selections to consume/convert the entire stack.`,
                suggestedFix: 'Use unit count (1) or validated quantity stepper value when unit mode is active instead of itemCurrent.info.count.',
              });
            }
          }

          recoveredVariables.push({
            originalName: binding.paramName ?? propName,
            protobufField: propName,
            fieldNumber: protoField?.fieldNumber ?? null,
            wireType: protoField?.wireTypeName ?? null,
            recoveredRole: inferred.role,
            inferredType: inferred.type,
            unit: inferred.unit,
            ...(inferred.quantitySourceMode ? { quantitySourceMode: inferred.quantitySourceMode } : {}),
            uiExpression: callerArg?.expr ?? null,
            provenanceChain: [
              ...(callerArg ? [{
                step: 'UI_CALL_ARG',
                filePath: uiCallSite.filePath,
                line: callerArg.line,
                startByte: callerArg.startByte,
                endByte: callerArg.endByte,
                expression: callerArg.expr,
              }] : []),
              {
                step: 'SENDER_ASSIGNMENT',
                filePath: idx.filePath,
                line: binding.line,
                startByte: binding.startByte,
                endByte: binding.endByte,
                expression: binding.snippet,
              },
              ...(protoField ? [{
                step: 'PROTOBUF_WIRE_FIELD',
                filePath: matchedProto.schema.filePath,
                line: protoField.line,
                startByte: protoField.startByte,
                endByte: protoField.endByte,
                expression: `field #${protoField.fieldNumber} (${protoField.scalarType}, wireTag=${protoField.wireTag}) -> ${protoField.fieldName}`,
              }] : []),
            ],
          });
        }
      }
    }
  }

  // Bind relevant JSON catalogs
  const targetTables = new Set(preset?.catalogTables ?? []);
  for (const idx of indexedFiles) {
    for (const ref of idx.catalogRefs) {
      if (actionKeywords.some((kw) => ref.table.toLowerCase().includes(kw.toLowerCase())) || targetTables.has(ref.table)) {
        targetTables.add(ref.table);
      }
    }
  }

  for (const cat of catalogs) {
    if (targetTables.has(cat.tableName) || actionKeywords.some((kw) => cat.tableName.toLowerCase().includes(kw.toLowerCase()))) {
      catalogBindings.push({
        tableName: cat.tableName,
        filePath: cat.relPath,
        sha256: cat.sha256,
        rowCount: cat.rows.length,
        columns: cat.rows.length ? Object.keys(cat.rows[0]) : [],
        sampleRows: cat.rows.slice(0, 5),
      });
    }
  }

  // Analyze S2C consumers, UI refresh triggers, and item selection filters
  const uiConsumerAnalysis = analyzeUiConsumersAndFilters({
    sourcesByFile,
    indexedFiles,
    actionKeywords,
    s2cOpcodes: resolvedS2cOpcodes,
  });

  // Cross-check UI item filters against catalog rows (e.g., Luck Stone / Pedra da Sorte missing in Enchantment picker)
  for (const filter of uiConsumerAnalysis.uiFilters) {
    const itemCat = catalogs.find((c) => c.tableName === 't_s_itemtemplate');
    if (itemCat) {
      const luckRows = itemCat.rows.filter((r) =>
        /sorte|luck/i.test(String(r.TemplateNameLang ?? r.Name ?? ''))
      );
      for (const row of luckRows) {
        // Check if filter checks SonType or Property1 against a value that excludes this Luck Stone
        const filterText = filter.predicates.map((p) => p.expression).join(' && ');
        const sonMatch = filterText.match(/SonType\s*===?\s*(\d+)/);
        if (sonMatch && Number(sonMatch[1]) !== Number(row.SonType)) {
          clientDefects.push({
            id: 'UI_FILTER_EXCLUDES_VALID_CATALOG_ITEM',
            severity: 'HIGH',
            stage: 'ui_selection_filter',
            filePath: filter.filePath,
            line: filter.line,
            startByte: filter.startByte,
            endByte: filter.endByte,
            message: `UI selection filter "${filter.functionName}" requires SonType === ${sonMatch[1]}, excluding catalog item "${row.TemplateNameLang}" (TemplateId=${row.TemplateId}, SonType=${row.SonType}).`,
            suggestedFix: `Confirm intended catalog eligibility first; review SonType ${row.SonType} / MasterType ${row.MasterType} against the action rules before editing ${filter.functionName}.`,
          });
          captureQuestions.push({ id: 'Q_FILTER_ELIGIBILITY_' + row.TemplateId, stage: 'ui_selection_filter', question: `Is catalog item ${row.TemplateId} intended to be eligible for this action? A name containing Luck/Sorte alone does not establish eligibility.` });
        }
      }
    }
  }

  for (const gap of uiConsumerAnalysis.uiRefreshGaps) {
    clientDefects.push({
      id: gap.kind,
      severity: 'HIGH',
      stage: 'ui_refresh_and_unlock',
      filePath: gap.filePath,
      line: gap.line,
      message: gap.detail,
      suggestedFix: 'Dispatch BagEvent.UPDATE / list.refresh() after mutating BagModel in S2C listener.',
    });
  }

  if (senderFunction && !matchedProto) captureQuestions.push({ id: 'Q_PROTOBUF_SCHEMA_UNRESOLVED', stage: 'protobuf_encode', question: 'Resolve the sender message to a unique protobuf schema; missing or ambiguous structural matches do not establish wire bindings.' });

  return {
    actionQuery,
    anchorFound: !!primary,
    candidateCount: candidates.length,
    c2sOpcode: resolvedOpcode,
    s2cOpcodes: resolvedS2cOpcodes,
    uiCallSite,
    senderFunction,
    protobufSchema: matchedProto ? {
      name: matchedProto.schema.name,
      fullSymbol: matchedProto.schema.fullSymbol,
      matchKind: matchedProto.matchKind,
      filePath: matchedProto.schema.filePath,
      fileSha256: matchedProto.schema.fileSha256,
      fields: matchedProto.schema.fields,
    } : null,
    recoveredVariables,
    validationGuards,
    numericFormulas,
    catalogBindings,
    s2cConsumers: uiConsumerAnalysis.s2cConsumers,
    uiFilters: uiConsumerAnalysis.uiFilters,
    clientDefects: clientDefects.map((finding) => ({ ...finding, evidenceKind: 'STATIC_HEURISTIC', requiresConfirmation: true })),
    captureQuestions,
  };
}
