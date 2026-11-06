// Symbolic wire analysis only. Checkout JavaScript and Java are never executed.
import { createHash } from 'node:crypto';
import { encodeWireMessage, decodeWireMessage } from './protobuf-extractor.mjs';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const pending = () => ({ status: 'UNVERIFIED', executed: false, jvmCompiledAndExecuted: false,
  reason: 'Patch not applied or executed; runtime evidence is required.' });

function symbolicClientWire(clientSlice, inputs) {
  const schema = clientSlice.protobufSchema;
  if (!schema || !clientSlice.senderFunction) {
    return { executed: false, mode: 'SYMBOLIC_FIELD_MAPPING', status: 'UNVERIFIED', reason: 'Sender or protobuf schema unresolved.' };
  }
  const roleValues = { SOURCE_ITEM_TEMPLATE: inputs.sourceTemplateId, DEST_ITEM_TEMPLATE: inputs.destinationTemplateId, QUANTITY: inputs.count };
  const message = {};
  for (const variable of clientSlice.recoveredVariables ?? []) {
    if (variable.protobufField && Object.hasOwn(roleValues, variable.recoveredRole)) message[variable.protobufField] = roleValues[variable.recoveredRole];
  }
  const unresolvedFields = schema.fields.filter((field) => !Object.hasOwn(message, field.fieldName)).map((field) => field.fieldName);
  if (unresolvedFields.length) {
    return { executed: false, mode: 'SYMBOLIC_FIELD_MAPPING', status: 'UNVERIFIED', message, unresolvedFields, reason: 'No synthetic default values were assigned to unresolved fields.' };
  }
  try {
    const packet = encodeWireMessage(schema, message);
    const { decoded, unknownFields } = decodeWireMessage(schema, packet);
    return { executed: false, mode: 'SYMBOLIC_FIELD_MAPPING', status: 'SYMBOLIC_WIRE_ENCODED',
      opcode: clientSlice.c2sOpcode?.value ?? null, message, decoded, unknownFields,
      packetHex: packet.toString('hex'), packetSha256: sha256(packet),
      note: 'Packet synthesized from recovered roles; original client sender was not executed.' };
  } catch (error) {
    return { executed: false, mode: 'SYMBOLIC_FIELD_MAPPING', status: 'UNVERIFIED', reason: error.message };
  }
}

function compareDecoderBindings(bindings, schema, packetHex, inputs) {
  if (!bindings.length || packetHex === undefined) return { status: 'UNVERIFIED', javaDecoded: null };
  const { decoded } = decodeWireMessage(schema, packetHex);
  const fields = new Map(schema.fields.map((field) => [field.fieldNumber, field.fieldName]));
  const javaDecoded = {};
  const comparisons = [];
  for (const binding of bindings) {
    const value = decoded[fields.get(binding.wireFieldNumber)] ?? null;
    javaDecoded[binding.javaParamName] = value;
    const name = binding.javaParamName.toLowerCase();
    const expected = /(?:src|source|consume|from)/.test(name) ? inputs.sourceTemplateId
      : /(?:target|des|dst|dest|to)/.test(name) ? inputs.destinationTemplateId
        : /(?:count|qty|amount|num)/.test(name) ? inputs.count : undefined;
    if (expected !== undefined) comparisons.push(Number(value) === expected);
  }
  return { status: comparisons.length === 0 ? 'UNVERIFIED' : comparisons.every(Boolean) ? 'STATIC_MATCH' : 'STATIC_MISMATCH',
    javaDecoded, executed: false, note: 'Decoder bindings interpreted from static extraction; Java code was not run.' };
}

export function runDifferentialRepro({ clientSlice, javaSlice }) {
  const catalog = clientSlice.catalogBindings?.find((entry) => entry.tableName === 't_s_transformtemplate');
  const row = catalog?.sampleRows?.[0];
  const inputs = { sourceTemplateId: Number(row?.Material1 ?? 2050101), destinationTemplateId: Number(row?.Material2 ?? 2050201), count: 1 };
  const scenarios = [];
  if (clientSlice.protobufSchema && clientSlice.senderFunction) {
    const clientWire = symbolicClientWire(clientSlice, inputs);
    scenarios.push({ id: 'wire-bijection-unit-1', title: 'Symbolic client-to-Java wire binding comparison', inputs, clientWire,
      beforePatch: compareDecoderBindings(javaSlice?.decoderAnalysis?.wireBindings ?? [], clientSlice.protobufSchema, clientWire.packetHex, inputs), afterPatch: pending() });
  }
  const groups = [
    ['unit-vs-stack-quantity', 'Single-unit selection and stack consumption', ['CLIENT_STACK_QUANTITY_FORCED']],
    ['level-12-atomicity-conservation', 'Level 12 rejection and unrelated stack conservation', ['JAVA_CONSUME_BEFORE_VALIDATION']],
    ['s2c-ui-refresh-and-filter', 'S2C model refresh and item eligibility', ['MISSING_UI_REFRESH_AFTER_MODEL_MUTATION', 'JAVA_MISSING_S2C_UI_SYNC', 'UI_FILTER_EXCLUDES_VALID_CATALOG_ITEM']],
  ];
  const findings = [...(clientSlice.clientDefects ?? []), ...(javaSlice?.findings ?? [])];
  for (const [id, title, findingIds] of groups) {
    const staticFindings = findings.filter((finding) => findingIds.includes(finding.id));
    scenarios.push({ id, title, beforePatch: { status: staticFindings.length ? 'STATIC_FINDING' : 'UNVERIFIED', executed: false, staticFindings }, afterPatch: pending() });
  }
  return { schemaVersion: 'autoforge.differential-repro.v1',
    executionEnvironment: { nodeVersion: process.version, jdkAvailable: null, sandboxMode: 'STATIC_ANALYSIS_ONLY', clientExecuted: false, javaExecuted: false, patchApplied: false, liveGameRuntimeCapture: 'UNVERIFIED' },
    scenarios,
    summary: { totalScenarios: scenarios.length, beforePatchFailuresDetected: 0, staticFindingsDetected: findings.length, afterPatchPassed: 0, overallStatus: 'STATIC_ANALYSIS_ONLY' } };
}
