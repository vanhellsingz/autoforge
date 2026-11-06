// Reproduce one client-to-Java boundary from two local source checkouts.
import {execFileSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {noLinks, only, options, output, readBounded, requireValue, save} from '../items/lib.mjs';
import {digest} from '../learning/evidence.mjs';

const caseSpec = {
  id: 'gem-wire-direction',
  title: 'Converter uma Gema de ATQ Nv. 1 em uma Gema de DEF Nv. 1',
  priority: 'now',
  steps: [{id: 'decoded', measure: 'json',
    capture: 'IDs da gema consumida e da gema solicitada e quantidade no pacote 8538.',
    symbols: ['decode']}],
};
const inputs = {sourceTemplateId: 2050101, destinationTemplateId: 2050201, count: 1};
const protocolRoot = 'modules/protocol-legacy/src/main/java/com/wartuneultra/protocol/';
const decoderFile = 'apps/game-server/src/main/java/com/wartuneultra/server/inventory/ForgeTransformService.java';
const dependencies = {
  'wire/ProtoReader.java': '8fbe0c44b5593efa4d724ed5d3d65a1e39ea83c04b39dc2b8db3d1974b83a1e8',
  'ProtocolException.java': '6d1304771a11724bc2e33a1236d9ce71c04d53a07c706790bd5043e40e67ee39',
};
const textHash = text => digest(Buffer.from(text));
const lf = text => text.replaceAll('\r\n', '\n');

function reviewed(condition, label) {
  if (!condition) throw Error('Source differs from the reviewed example: ' + label);
}

function varint(number) {
  const bytes = [];
  while (number >= 128) {
    bytes.push((number % 128) + 128);
    number = Math.floor(number / 128);
  }
  return [...bytes, number];
}

function referenceReplay(client) {
  const hashes = {};
  function read(path) {
    const bytes = readBounded(join(client, path));
    hashes[path] = digest(bytes);
    return bytes.toString('utf8');
  }
  const bundle = read('js/bundle_release-ad60bfe795.js');
  const proto = read('libs/protobuf-bundles-1f16c1f251.js');
  const groupData = JSON.parse(read('res/release/config/t_s_transformtemplate-25d3586f0e.json'));
  const group = groupData.t_s_transformtemplate.find(row => row.TransformId === 1);
  reviewed(group?.Material1 === inputs.sourceTemplateId && group.Material2 === inputs.destinationTemplateId,
    'conversion group 1');

  // itemTarget is the staged bag item. itemCurrent is the selected destination.
  const caller = 'iz.sendSwitch(this.itemTarget.info.templateId,this.itemCurrent.info.templateId,this.itemCurrent.info.count)';
  const uiStart = bundle.indexOf(caller);
  reviewed(uiStart >= 0 && bundle.indexOf(caller, uiStart + 1) === -1, 'converter call site');
  const ui = bundle.slice(bundle.lastIndexOf('class ', uiStart), bundle.indexOf('}var ', uiStart) + 1);
  reviewed(ui.includes('this._itemDic.add("0_0_"+hr.Hide,this.itemTarget)') &&
    ui.includes('this.itemCurrent=t') && ui.includes('this.txtDstItemName.text=t.TemplateNameLang') &&
    ui.includes('this._switchTemp["Material"+e]') && ui.includes('s.templateId=i,s.count=t.count'), 'UI slot roles');
  reviewed(bundle.includes('C_ITEM_TRANSFORM=8538'), 'opcode');

  // Interpret only these three assignments from the isolated sendSwitch body.
  const sender = /static sendSwitch\(t,e,i\)\{let s=new \$q;((?:s\.(?:desItemid|srcItemid|count)=[tei],){3})vZ\.Instance\.send\(Bn\.C_ITEM_TRANSFORM,s\)\}/g;
  const matches = [...bundle.matchAll(sender)];
  reviewed(matches.length === 1, 'sendSwitch');
  const args = {t: inputs.sourceTemplateId, e: inputs.destinationTemplateId, i: inputs.count};
  const message = {};
  for (const assignment of matches[0][1].matchAll(/s\.(\w+)=([tei]),/g)) {
    message[assignment[1]] = args[assignment[2]];
  }
  reviewed(Object.keys(message).length === 3, 'sendSwitch field coverage');

  const encoder = proto.match(/\bStoreReqMsg\.encode = function encode\(message, writer\) \{([\s\S]*?)return writer;/);
  reviewed(encoder, 'store.StoreReqMsg encoder');
  const packet = [];
  for (const field of ['srcItemid', 'desItemid', 'count']) {
    const line = encoder[1].match(new RegExp('writer\\.uint32\\(/\\* id (\\d+), wireType 0 =\\*/(\\d+)\\)\\.int32\\(message\\.' + field + '\\);'));
    reviewed(line && Number(line[1]) * 8 === Number(line[2]), 'protobuf field ' + field);
    packet.push(...varint(Number(line[2])), ...varint(message[field]));
  }
  return {
    clientDigest: digest(hashes), packetHex: Buffer.from(packet).toString('hex'),
    decoded: {sourceTemplateId: message.srcItemid, destinationTemplateId: message.desItemid, count: message.count},
  };
}

function javaReplay(backend, packetHex) {
  const git = (...args) => execFileSync('git', ['-C', backend, ...args], {encoding: 'utf8', timeout: 10000});
  const commit = git('rev-parse', '--verify', 'HEAD').trim();
  reviewed(/^[0-9a-f]{40,64}$/.test(commit), 'Java commit');
  const prefix = git('rev-parse', '--show-prefix').trim();
  function source(path) {
    const contents = lf(readBounded(join(backend, path), 256 * 1024).toString('utf8'));
    reviewed(contents === lf(git('show', commit + ':' + prefix + path)), 'working bytes match commit for ' + path);
    return contents;
  }
  const full = source(decoderFile);
  const record = full.match(/^    public record Request\([\s\S]+?^    \}/m)?.[0];
  reviewed(record, 'ForgeTransformService.Request');
  // Compile the reviewed source tokens only. A swap in the two returned IDs
  // is supported so the same example can be run against a corrected decoder.
  const code = record.replace(/\/\/[^\n]*/g, '').replace(/\s+/g, ' ');
  const returnOrder = /return new Request\((wire9|wire10), (wire9|wire10), count\);/;
  const order = code.match(returnOrder);
  reviewed(order && order[1] !== order[2] &&
    textHash(code.replace(returnOrder, 'RETURN')) === 'e3e33c3ef2088cb6f014dcb5762281814f7e24ac157e6ba25f28955f8aa31a32',
  'decoder tokens');
  const copies = {};
  for (const [path, expected] of Object.entries(dependencies)) {
    const contents = source(protocolRoot + path);
    reviewed(textHash(contents) === expected, path);
    copies[path.split('/').at(-1)] = contents;
  }
  copies['GemReplay.java'] = `import com.wartuneultra.protocol.ProtocolException;
import com.wartuneultra.protocol.wire.ProtoReader;
public class GemReplay {
  ${code}
  public static void main(String[] args) throws Exception {
    var result = Request.decode(java.util.HexFormat.of().parseHex(args[0]));
    System.out.println(result.sourceTemplateId() + "," + result.targetTemplateId() + "," + result.count());
  }
}`;
  const temp = mkdtempSync(join(noLinks(tmpdir()), 'autoforge-gem-'));
  try {
    for (const [file, contents] of Object.entries(copies)) writeFileSync(join(temp, file), contents, {flag: 'wx'});
    const env = {...process.env};
    for (const key of Object.keys(env)) {
      if (/^(?:CLASSPATH|JAVA_TOOL_OPTIONS|_JAVA_OPTIONS|JDK_JAVA_OPTIONS|JDK_JAVAC_OPTIONS)$/i.test(key)) delete env[key];
    }
    const run = {cwd: temp, env, timeout: 30000, maxBuffer: 65536, encoding: 'utf8', windowsHide: true};
    execFileSync('javac', ['-proc:none', '-encoding', 'UTF-8', '-classpath', '.', '-d', '.', ...Object.keys(copies)], run);
    const raw = execFileSync('java', ['-cp', '.', 'GemReplay', packetHex], run).trim();
    reviewed(/^\d+,\d+,\d+$/.test(raw), 'Java replay output');
    const [sourceTemplateId, destinationTemplateId, count] = raw.split(',').map(Number);
    return {commit, decoded: {sourceTemplateId, destinationTemplateId, count}};
  } finally {
    rmSync(temp, {recursive: true, force: true});
  }
}

function main() {
  const opts = options(process.argv.slice(2));
  only(opts, ['client', 'backend', 'out']);
  const client = noLinks(requireValue(opts, 'client'));
  const backend = noLinks(requireValue(opts, 'backend'));
  const requestedOut = resolve(requireValue(opts, 'out'));
  const reference = referenceReplay(client);
  const candidate = javaReplay(backend, reference.packetHex);
  const out = output(requestedOut, [client, backend]);
  const evidence = join(out, 'evidence');
  mkdirSync(evidence);
  save(out, 'cases.json', {schemaVersion: 1, cases: [caseSpec]});
  const index = {};
  for (const role of ['reference', 'candidate']) {
    const isRef = role === 'reference';
    const sessionId = 'gem-wire-' + role;
    const operationId = 'convert-1';
    const value = isRef ? reference.decoded : candidate.decoded;
    const record = {
      schemaVersion: 1, role, caseId: caseSpec.id, contractDigest: digest(caseSpec),
      identity: {
        ...(isRef ? {sourceSha256: reference.clientDigest} : {commit: candidate.commit}),
        environment: {name: isRef ? 'isolated-client-sender' : 'isolated-java-decoder', kind: 'SOURCE_REPLAY'},
        testId: caseSpec.id,
      },
      clientDigest: reference.clientDigest, action: {type: 'gem-transform', inputs},
      preconditions: {opcode: 8538, wireHex: reference.packetHex}, sessionId, operationId,
      steps: [{id: 'decoded', sessionId, operationId, value}],
    };
    const path = isRef ? 'ref.json' : 'java.json';
    save(evidence, path, record);
    index[role] = {path, sha256: digest(readBounded(join(evidence, path)))};
  }
  save(evidence, caseSpec.id + '.json', index);
  console.log(JSON.stringify({caseId: caseSpec.id, commit: candidate.commit,
    packetHex: reference.packetHex, reference: reference.decoded, candidate: candidate.decoded}, null, 2));
}

try { main(); } catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
