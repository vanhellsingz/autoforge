import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { main as studioMain } from '../../autoforge.mjs';
import { generateImplementation } from '../../contract-generator.mjs';
import { extractProtobufSchemas, encodeWireMessage, decodeWireMessage } from '../protobuf-extractor.mjs';
import { runDifferentialRepro } from '../differential-repro.mjs';

const sha256 = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

function createFixtureCheckout(t) {
  const root = mkdtempSync(join(tmpdir(), 'af-slice-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const client = join(root, 'client');
  const backend = join(root, 'backend');
  mkdirSync(join(client, 'js'), { recursive: true });
  mkdirSync(join(client, 'libs'), { recursive: true });
  mkdirSync(join(client, 'res/release/config'), { recursive: true });

  // 1. Obfuscated/Minified LayaAir Bundle covering Gem Transform, Luck Stone Compose, and Enchant Filter
  const bundleJs = `
var Bn = {};
Bn.C_ITEM_TRANSFORM = 8538;
Bn.S_ITEM_TRANSFORM = 8539;
Bn.C_ITEM_COMPOSE = 8540;
Bn.S_ITEM_COMPOSE = 8541;
Bn.C_ITEM_STRENGTHEN = 8550;

class iz {
  static sendSwitch(t, e, i) {
    let a = t;
    let s = new $q();
    s.desItemid = e;
    s.srcItemid = a;
    s.count = i;
    vZ.Instance.send(Bn.C_ITEM_TRANSFORM, s);
  }
  static sendCompose(t, e) {
    let s = new ComposeReqMsg();
    s.recipeId = t;
    s.count = e;
    vZ.Instance.send(Bn.C_ITEM_COMPOSE, s);
  }
}

class GemTransformView extends Laya.View {
  onSelectTarget(hr) {
    this.itemTarget = hr;
    this._itemDic.add("0_0_" + hr.Hide, this.itemTarget);
  }
  onSelectDest(t) {
    this.itemCurrent = t;
    this.txtDstItemName.text = t.TemplateNameLang;
  }
  onSwitchClick() {
    if (!this.itemTarget || !this.itemCurrent) return;
    let cost = this.itemCurrent.info.count * 100;
    iz.sendSwitch(this.itemTarget.info.templateId, this.itemCurrent.info.templateId, this.itemCurrent.info.count);
  }
  initEvents() {
    vZ.Instance.on(Bn.S_ITEM_TRANSFORM, this, this.onTransformResp);
  }
  onTransformResp(msg) {
    BagModel.Instance.updateItem(msg);
    this._list.refresh();
  }
}

class LuckComposeView extends Laya.View {
  initEvents() {
    vZ.Instance.on(Bn.S_ITEM_COMPOSE, this, this.onComposeResp);
  }
  onComposeClick() {
    iz.sendCompose(this.selectedRecipeId, 1);
  }
  onComposeResp(msg) {
    // Bug: updates BagModel without refreshing LayaAir list or dispatching BagEvent!
    BagModel.Instance.addItem(msg.item);
  }
}

class EnchantView extends Laya.View {
  checkCanEnchant(item) {
    return item && item.templateInfo && item.templateInfo.SonType === 101;
  }
  getAvailableMaterials(bagItems) {
    return bagItems.filter((it) => this.checkCanEnchant(it));
  }
}
`;

  const protoJs = `
$root.store = (function() {
  function StoreReqMsg(p) { if (p) for (var k = Object.keys(p), i = 0; i < k.length; ++i) this[k[i]] = p[k[i]]; }
  StoreReqMsg.encode = function encode(message, writer) {
    if (!writer) writer = $Writer.create();
    if (message.srcItemid != null && Object.hasOwnProperty.call(message, "srcItemid"))
      writer.uint32(/* id 1, wireType 0 =*/8).int32(message.srcItemid);
    if (message.desItemid != null && Object.hasOwnProperty.call(message, "desItemid"))
      writer.uint32(/* id 2, wireType 0 =*/16).int32(message.desItemid);
    if (message.count != null && Object.hasOwnProperty.call(message, "count"))
      writer.uint32(/* id 3, wireType 0 =*/24).int32(message.count);
    return writer;
  };
  StoreReqMsg.decode = function decode(reader, length) {
    var end = length === undefined ? reader.len : reader.pos + length, message = new StoreReqMsg();
    while (reader.pos < end) {
      var tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: message.srcItemid = reader.int32(); break;
        case 2: message.desItemid = reader.int32(); break;
        case 3: message.count = reader.int32(); break;
        default: reader.skipType(tag & 7); break;
      }
    }
    return message;
  };

  function ComposeReqMsg(p) {}
  ComposeReqMsg.encode = function encode(message, writer) {
    if (!writer) writer = $Writer.create();
    if (message.recipeId != null) writer.uint32(8).int32(message.recipeId);
    if (message.count != null) writer.uint32(16).int32(message.count);
    return writer;
  };
  return { StoreReqMsg: StoreReqMsg, ComposeReqMsg: ComposeReqMsg };
})();
`;

  const transformCatalog = {
    t_s_transformtemplate: [
      { TransformId: 1, Material1: 2050101, Material2: 2050201, NeedGold: 100, NeedGrades: 1 },
      { TransformId: 12, Material1: 2051201, Material2: 2051202, NeedGold: 5000, NeedGrades: 12 },
    ],
  };

  const itemCatalog = {
    t_s_itemtemplate: [
      { TemplateId: 2051201, TemplateNameLang: 'Gema de ATQ Nv.12', MasterType: 5, SonType: 101, NeedGrades: 12 },
      { TemplateId: 3010101, TemplateNameLang: 'Pedra da Sorte Nv.1', MasterType: 12, SonType: 102, NeedGrades: 1 },
    ],
  };

  writeFileSync(join(client, 'js/bundle_release-ad60bfe795.js'), bundleJs);
  writeFileSync(join(client, 'libs/protobuf-bundles-1f16c1f251.js'), protoJs);
  writeFileSync(join(client, 'res/release/config/t_s_transformtemplate-25d3586f0e.json'), JSON.stringify(transformCatalog, null, 2));
  writeFileSync(join(client, 'res/release/config/t_s_itemtemplate-99aabbcc11.json'), JSON.stringify(itemCatalog, null, 2));

  // 2. Java 21 Backend Checkout
  const protoDir = join(backend, 'modules/protocol-legacy/src/main/java/com/wartuneultra/protocol');
  const srvDir = join(backend, 'apps/game-server/src/main/java/com/wartuneultra/server/inventory');
  const loginDir = join(backend, 'apps/game-server/src/main/java/com/wartuneultra/server/login');
  mkdirSync(protoDir, { recursive: true });
  mkdirSync(srvDir, { recursive: true });
  mkdirSync(loginDir, { recursive: true });

  writeFileSync(join(protoDir, 'Opcodes.java'), `package com.wartuneultra.protocol;
public final class Opcodes {
    public static final int C_ITEM_TRANSFORM = 8538;
    public static final int S_ITEM_TRANSFORM = 8539;
    public static final int C_ITEM_COMPOSE = 8540;
    public static final int S_ITEM_COMPOSE = 8541;
    public static final int U_C_BAG_MOVE_UPDATE = 113;
}
`);

  writeFileSync(join(loginDir, 'GameLoginHandler.java'), `package com.wartuneultra.server.login;
import com.wartuneultra.protocol.Opcodes;
public class GameLoginHandler {
    public void dispatch(int opcode, Object frame) {
        switch (opcode) {
            case Opcodes.C_ITEM_TRANSFORM -> handleItemTransform(frame);
            case Opcodes.C_ITEM_COMPOSE -> handleItemCompose(frame);
            default -> {}
        }
    }
    private void handleItemTransform(Object frame) {
        // Delegates to ForgeTransformService
    }
    private void handleItemCompose(Object frame) {
        // Delegates to ItemComposeService
    }
}
`);

  writeFileSync(join(srvDir, 'ForgeTransformService.java'), `package com.wartuneultra.server.inventory;
import com.wartuneultra.protocol.Opcodes;
public class ForgeTransformService {
    public record Request(int sourceTemplateId, int targetTemplateId, int count) {
        public static Request decode(ProtoReader reader) {
            int wire9 = 0;
            int wire10 = 0;
            int count = 0;
            while (reader.nextField()) {
                switch (reader.fieldNumber()) {
                    case 1 -> wire9 = reader.readInt32();
                    case 2 -> wire10 = reader.readInt32();
                    case 3 -> count = reader.readInt32();
                }
            }
            return new Request(wire10, wire9, count);
        }
    }

    public void handleItemTransform(long playerId, Request req) {
        // Bug: consumes before validating Lv.12 template & capacity!
        consumeItem(playerId, req.sourceTemplateId(), req.count());
        validateTransform(req.sourceTemplateId(), req.targetTemplateId());
        grantItem(playerId, req.targetTemplateId(), req.count());
        respond(playerId, Opcodes.S_ITEM_TRANSFORM);
    }

    private void consumeItem(long p, int tpl, int c) {}
    private void validateTransform(int s, int t) {}
    private void grantItem(long p, int tpl, int c) {}
    private void respond(long p, int op) {}
}
`);

  writeFileSync(join(srvDir, 'ItemComposeService.java'), `package com.wartuneultra.server.inventory;
public class ItemComposeService {
    public void handleItemCompose(long playerId, int recipeId, int count) {
        validateCompose(recipeId, count);
        consumeMaterials(playerId, recipeId, count);
        saveItemToDatabase(playerId, 3010101, count);
        // Bug: missing respond(..., S_ITEM_COMPOSE / U_C_BAG_MOVE_UPDATE)!
    }
    private void validateCompose(int r, int c) {}
    private void consumeMaterials(long p, int r, int c) {}
    private void saveItemToDatabase(long p, int tpl, int c) {}
}
`);

  execFileSync('git', ['init', backend], { stdio: 'pipe' });
  execFileSync('git', ['-C', backend, '-c', 'user.name=AutoForge', '-c', 'user.email=test@autoforge.local', 'add', '.'], { stdio: 'pipe' });
  execFileSync('git', ['-C', backend, '-c', 'user.name=AutoForge', '-c', 'user.email=test@autoforge.local', 'commit', '-m', 'Initial Wartune fixture'], { stdio: 'pipe' });

  return { root, client, backend };
}

test('binary protobuf wire codec round-trips varint, negative int32, sint32, int64, and utf8 strings', () => {
  const protoText = `
    TestMsg.encode = function encode(m, w) {
      w.uint32(8).int32(m.srcId);
      w.uint32(16).sint32(m.delta);
      w.uint32(26).string(m.opId);
      w.uint32(32).bool(m.bound);
      return w;
    };
  `;
  const extracted = extractProtobufSchemas(protoText, 'proto.js');
  assert.equal(extracted.messages.length, 1);
  const schema = extracted.messages[0];
  const payload = { srcId: 2051201, delta: -42, opId: 'gem-lv12-op', bound: true };
  const wire = encodeWireMessage(schema, payload);
  const { decoded, unknownFields } = decodeWireMessage(schema, wire);
  assert.deepEqual(decoded, payload);
  assert.equal(unknownFields.length, 0);
});

test('wire codec preserves signed fixed32 and fixed64 and rejects unsupported or incompatible schemas', () => {
  const schema = { fields: [
    { fieldNumber: 1, fieldName: 'delta', scalarType: 'sfixed32', wireType: 5 },
    { fieldNumber: 2, fieldName: 'large', scalarType: 'sfixed64', wireType: 1 },
  ] };
  const payload = { delta: -42, large: '-9007199254740993' };
  assert.deepEqual(decodeWireMessage(schema, encodeWireMessage(schema, payload)).decoded, payload);
  assert.throws(() => encodeWireMessage({ fields: [{ fieldNumber: 1, fieldName: 'child', scalarType: 'message', wireType: 2 }] }, { child: {} }), /Unsupported/);
  assert.throws(() => encodeWireMessage({ fields: [{ fieldNumber: 1, fieldName: 'x', scalarType: 'int32', wireType: 2 }] }, { x: 1 }), /wire type mismatch/);
  assert.throws(() => decodeWireMessage(schema, Buffer.from('0801', 'hex')), /wire type mismatch/);
});

test('symbolic repro never executes sender snippets and never claims a patch passed', () => {
  const result = runDifferentialRepro({
    clientSlice: {
      senderFunction: { snippet: 'function sender() { throw new Error("SOURCE_CODE_EXECUTED"); }' },
      protobufSchema: { fields: [{ fieldNumber: 1, fieldName: 'count', scalarType: 'int32', wireType: 0 }] },
      recoveredVariables: [{ protobufField: 'count', recoveredRole: 'QUANTITY' }], catalogBindings: [], clientDefects: [],
    },
    javaSlice: { findings: [], decoderAnalysis: null },
  });
  assert.equal(result.executionEnvironment.clientExecuted, false);
  assert.equal(result.executionEnvironment.javaExecuted, false);
  assert.equal(result.executionEnvironment.patchApplied, false);
  assert.equal(result.summary.overallStatus, 'STATIC_ANALYSIS_ONLY');
  assert.equal(result.summary.afterPatchPassed, 0);
  assert.ok(result.scenarios.every((scenario) => scenario.afterPatch.status === 'UNVERIFIED'));
});

test('extract-flow maps gem-transform, flags static candidates and emits review-only patches and honest artifact checks', async (t) => {
  const { root, client, backend } = createFixtureCheckout(t);
  const out = join(root, 'arena-gem-pack');

  const res = await studioMain([
    'extract-flow',
    '--client', client,
    '--backend', backend,
    '--action', 'gem-transform',
    '--out', out,
  ]);

  assert.equal(res.c2sOpcode, 8538);
  assert.ok(res.defectsFound.some((d) => d.id === 'JAVA_WIRE_FIELD_SWAP'), 'Must detect wire9/wire10 swap');
  assert.ok(res.defectsFound.some((d) => d.id === 'JAVA_CONSUME_BEFORE_VALIDATION'), 'Must detect consume before validation');
  assert.ok(res.defectsFound.some((d) => d.id === 'CLIENT_STACK_QUANTITY_FORCED'), 'Must detect stack quantity forced on unit action');

  // Verify all 9 Arena deliverables exist
  for (const rel of [
    'manifest.json',
    'flow.json',
    'flow.md',
    'variables.json',
    'protocol.json',
    'rules.json',
    'implementation.patch',
    'validation.json',
    'ARENA.txt',
    'tests/gem-transform.repro.test.mjs',
    'tests/GemTransformDifferentialTest.java',
    'tests/cases.json',
  ]) {
    assert.equal(existsSync(join(out, rel)), true, `Missing deliverable ${rel}`);
  }

  // Verify manifest SHA-256 digests match every emitted artifact
  const manifest = JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8'));
  assert.equal(manifest.schemaVersion, 'autoforge.vertical-slice.v1');
  assert.equal(manifest.sources.backend.dirty, false);
  for (const [relPath, expectedDigest] of Object.entries(manifest.artifacts)) {
    const actualDigest = sha256(readFileSync(join(out, relPath), 'utf8'));
    assert.equal(actualDigest, expectedDigest, `Artifact SHA-256 mismatch for ${relPath}`);
  }

  // Verify implementation.patch fixes `return new Request(wire10, wire9, count);` -> `return new Request(wire9, wire10, count);`
  const patchText = readFileSync(join(out, 'implementation.patch'), 'utf8');
  assert.match(patchText, /-            return new Request\(wire10, wire9, count\);/);
  assert.match(patchText, /\+            return new Request\(wire9, wire10, count\);/);
  assert.doesNotMatch(patchText, /\+.*validateTransform/);
  assert.doesNotMatch(patchText, /bundle_release/);

  const validation = JSON.parse(readFileSync(join(out, 'validation.json'), 'utf8'));
  assert.equal(validation.claims.patchApplication, 'NOT_RUN');
  assert.equal(validation.claims.database, 'NOT_RUN');
  assert.equal(validation.repro.summary.afterPatchPassed, 0);
  assert.ok(validation.repro.scenarios.every((scenario) => scenario.afterPatch.status === 'UNVERIFIED'));
  assert.equal(readFileSync(join(backend, 'apps/game-server/src/main/java/com/wartuneultra/server/inventory/ForgeTransformService.java'), 'utf8').includes('return new Request(wire10, wire9, count);'), true);

  // Verify synthesizedContract inside rules.json is accepted by studio/contract-generator.mjs!
  const rules = JSON.parse(readFileSync(join(out, 'rules.json'), 'utf8'));
  assert.equal(rules.synthesizedContract.valid, true);
  const genOut = join(root, 'generated-java');
  const genResult = generateImplementation({
    contract: rules.synthesizedContract.contract,
    backend,
    out: genOut,
  });
  assert.equal(genResult.status, 'READY_FOR_REVIEW');
  assert.equal(genResult.backend.status, 'BOUND_TO_EXACT_CHECKOUT');

  // Execute the generated Node differential repro test inside `out/tests/`!
  const childEnv = { ...process.env };
  delete childEnv.NODE_TEST_CONTEXT;
  const testOut = execFileSync(process.execPath, ['--test', '--test-reporter=tap', join(out, 'tests/gem-transform.repro.test.mjs')], {
    encoding: 'utf8',
    env: childEnv,
    timeout: 15000,
  });
  assert.match(testOut, /# fail 0/);
  assert.match(testOut, /# skipped 1/);
});

test('extract-flow diagnoses Luck Stone synthesis missing UI refresh AND missing enchant picker item', async (t) => {
  const { root, client, backend } = createFixtureCheckout(t);

  const composeOut = join(root, 'arena-compose-pack');
  const composeRes = await studioMain([
    'extract-flow',
    '--client', client,
    '--backend', backend,
    '--action', 'luck-stone-compose',
    '--out', composeOut,
  ]);
  assert.equal(composeRes.c2sOpcode, 8540);
  assert.ok(
    composeRes.defectsFound.some((d) => d.id === 'MISSING_UI_REFRESH_AFTER_MODEL_MUTATION'),
    'Must detect BagModel mutation without LayaAir list.refresh() / BagEvent'
  );
  assert.ok(
    composeRes.defectsFound.some((d) => d.id === 'JAVA_MISSING_S2C_UI_SYNC'),
    'Must detect Java DB mutation without S2C bag sync response'
  );

  const enchantOut = join(root, 'arena-enchant-pack');
  const enchantRes = await studioMain([
    'extract-flow',
    '--client', client,
    '--backend', backend,
    '--action', 'enchant-filter',
    '--out', enchantOut,
  ]);
  assert.ok(
    enchantRes.defectsFound.some((d) => d.id === 'UI_FILTER_EXCLUDES_VALID_CATALOG_ITEM' && d.message.includes('3010101')),
    'Must detect EnchantView.checkCanEnchant excluding Pedra da Sorte (TemplateId 3010101, SonType 102)'
  );
});

test('explicit opcode cannot fall back to another action and ambiguous protobuf schemas stay unresolved', async (t) => {
  const { root, client } = createFixtureCheckout(t);
  const missingOut = join(root, 'missing-opcode');
  const missing = await studioMain(['extract-flow', '--client', client, '--action', 'gem-transform', '--opcode', '99999', '--out', missingOut]);
  assert.equal(missing.c2sOpcode, null);
  const unresolvedRules = JSON.parse(readFileSync(join(missingOut, 'rules.json'), 'utf8'));
  assert.equal(unresolvedRules.synthesizedContract.valid, false);
  assert.equal(unresolvedRules.synthesizedContract.contract, null);
  const invalidOut = join(root, 'invalid-opcode');
  await assert.rejects(() => studioMain(['extract-flow', '--client', client, '--action', 'gem-transform', '--opcode', '0', '--out', invalidOut]), /positive integer/);
  assert.equal(existsSync(invalidOut), false);

  writeFileSync(join(client, 'libs/protobuf-other.js'), 'OtherReqMsg.encode=function encode(m,w){w.uint32(8).int32(m.srcItemid);w.uint32(16).int32(m.desItemid);w.uint32(24).int32(m.count);return w;};');
  const ambiguousOut = join(root, 'ambiguous-schema');
  const ambiguous = await studioMain(['extract-flow', '--client', client, '--action', 'gem-transform', '--out', ambiguousOut]);
  assert.ok(ambiguous.captureQuestions.some((question) => question.id === 'Q_PROTOBUF_SCHEMA_UNRESOLVED'));
  assert.equal(JSON.parse(readFileSync(join(ambiguousOut, 'protocol.json'), 'utf8')).protobufMessage, null);
});

test('extract-flow emits targeted captureQuestions for unresolved dynamic dispatch and refuses unsafe paths', async (t) => {
  const { root, client, backend } = createFixtureCheckout(t);
  const out = join(root, 'arena-unknown-pack');

  const res = await studioMain([
    'extract-flow',
    '--client', client,
    '--action', 'nonexistent-dynamic-action',
    '--out', out,
  ]);
  assert.equal(res.status, 'PARTIAL_NEEDS_CAPTURE');
  assert.ok(res.captureQuestions.length >= 1, 'Must emit explicit captureQuestions when anchor is missing');

  const partialOut = join(root, 'arena-partial-pack');
  const partialRes = await studioMain([
    'extract-flow',
    '--client', client,
    '--action', 'gem-transform',
    '--out', partialOut,
  ]);
  assert.equal(partialRes.status, 'PARTIAL_NEEDS_CAPTURE');
  assert.ok(partialRes.captureQuestions.some((q) => q.id === 'Q_BACKEND_MISSING'));

  // Refuse writing inside client or backend directories
  await assert.rejects(
    () => studioMain(['extract-flow', '--client', client, '--backend', backend, '--action', 'gem-transform', '--out', join(client, 'inside')]),
    /outside|protected/i
  );

  // Refuse symlinked client root
  const sym = join(root, 'client-link');
  symlinkSync(client, sym, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(
    () => studioMain(['extract-flow', '--client', sym, '--action', 'gem-transform', '--out', join(root, 'out-sym')]),
    /refused|link/i
  );
});

test('extract-flow handles ES5 prototype-compiled >1 MiB single-line LayaAir bundles and troop/chest actions', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'af-slice-es5-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const client = join(root, 'client');
  mkdirSync(join(client, 'js'), { recursive: true });
  mkdirSync(join(client, 'libs'), { recursive: true });

  // >1 MiB single-line minified ES5 bundle with prototype methods at the very end
  const padding = '/*pad*/var _x=' + JSON.stringify('a'.repeat(1024 * 1024)) + ';';
  const tailCode = 'var Bn={};Bn.C_ARMY_RECRUIT=9101;Bn.S_ARMY_RECRUIT=9102;function ArmyNet(){}ArmyNet.sendRecruit=function(t,e){var s=new RecruitReqMsg();s.pawnId=t;s.count=e;vZ.Instance.send(Bn.C_ARMY_RECRUIT,s);};function ArmyView(){}ArmyView.prototype.onRecruitClick=function(){ArmyNet.sendRecruit(this.selectedPawn.pawnId,Number(this.txtNum.text));};';
  writeFileSync(join(client, 'js/bundle_es5.js'), padding + tailCode);
  writeFileSync(join(client, 'libs/protobuf-bundles.js'), 'RecruitReqMsg.encode=function encode(m,w){w.uint32(8).int32(m.pawnId);w.uint32(16).int32(m.count);return w;};');

  const out = join(root, 'out-troop');
  const res = await studioMain([
    'extract-flow',
    '--client', client,
    '--action', 'troop-recruit',
    '--out', out,
  ]);
  assert.equal(res.c2sOpcode, 9101);
  const vars = JSON.parse(readFileSync(join(out, 'variables.json'), 'utf8'));
  assert.ok(vars.variables.some((v) => v.recoveredRole === 'TROOP_TEMPLATE_ID'));
  assert.ok(vars.variables.some((v) => v.recoveredRole === 'QUANTITY' && v.quantitySourceMode === 'USER_INPUT_CONTROL'));
});
