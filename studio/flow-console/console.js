// V1 console navigation adapted to the V2 package. Source text always uses textContent.
let loaded;
let currentSection = 'stage';
let currentStage;
let selectedFilter = 'Tudo';
const get = id => document.getElementById(id);
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function button(label, action, active = false) {
  const node = element('button', label, active ? 'action active' : 'action');
  node.addEventListener('click', action);
  return node;
}
function pretty(value) { return typeof value === 'string' ? value : JSON.stringify(value, null, 2); }
function showFile(path) {
  const file = loaded.files.find(file => file.path === path);
  get('source').textContent = file?.content ?? '';
  get('file-hash').textContent = file ? 'SHA-256 ' + file.sha256 : '';
}
function card(value, title) {
  const article = element('article', undefined, 'fact');
  article.append(element('b', title ?? value.title ?? value.id ?? 'Registro'));
  if (value.status) article.append(element('small', value.status, 'mono'));
  article.append(element('pre', pretty(value), 'sheet'));
  return article;
}
function renderDetails() {
  const flow = loaded.documents['flow.json'];
  const details = get('details');
  details.replaceChildren();
  let records = [];
  if (currentSection === 'stage') {
    get('title').textContent = currentStage?.title ?? 'Etapa';
    records = currentStage ? [currentStage] : [];
  } else if (currentSection === 'variables') {
    get('title').textContent = 'Variáveis e sua procedência';
    records = loaded.documents['variables.json']?.variables ?? [];
  } else if (currentSection === 'protocol') {
    get('title').textContent = 'Protocolo e consumidores';
    records = [loaded.documents['protocol.json'] ?? {}];
  } else if (currentSection === 'rules') {
    get('title').textContent = 'Regras e catálogos';
    records = [loaded.documents['rules.json'] ?? {}];
  } else if (currentSection === 'captures') {
    get('title').textContent = 'Perguntas de captura';
    records = flow.captureQuestions ?? [];
  } else {
    get('title').textContent = 'Divergências e candidatos de investigação';
    records = (flow.stages ?? []).flatMap(stage => (stage.defects ?? stage.findings ?? []).map(defect => ({stage: stage.id, ...defect})));
    records.push(...(loaded.documents['validation.json']?.repro?.scenarios ?? []).filter(s => /FAIL|DETECT|DIVERG/i.test(pretty(s))));
  }
  if (selectedFilter !== 'Tudo') records = records.filter(record => selectedFilter === 'Captura' ? /CAPTURE|UNRESOLVED|UNVERIFIED/i.test(pretty(record)) : /DEFECT|FAIL|DIVERG|MISMATCH|SWAP/i.test(pretty(record)));
  if (!records.length) details.append(element('p', 'Nenhum registro nesta seleção. Consulte a cobertura e as perguntas pendentes.'));
  for (const record of records) details.append(card(record));
}
function render() {
  const manifest = loaded.manifest;
  const flow = loaded.documents['flow.json'];
  const validation = loaded.documents['validation.json'];
  get('identity').textContent = (manifest.actionQuery ?? 'Ação') + ' · Java ' + (manifest.sources?.backend?.commit ?? 'sem commit identificado');
  get('summary').textContent = 'Cobertura estática: ' + manifest.coverage.status + '. Integridade dos arquivos conferida.';
  get('validation').replaceChildren(
    element('p', 'Execução real do jogo: consultar artefatos independentes.', 'unk'),
    element('p', 'Aplicação automática de patch: desabilitada.', 'mono'),
    card(validation.claims ?? validation.repro?.summary ?? {}, 'Validação registrada'),
    card(validation.remainingChecks ?? [], 'Verificações restantes'),
  );
  currentStage = flow.stages?.find(stage => stage.id === currentStage?.id) ?? flow.stages?.[0];
  get('stages').replaceChildren(...(flow.stages ?? []).map(stage => {
    const labels = {ui_control:'Controle da tela',selection_and_quantity:'Seleção e quantidade',client_validation:'Validação e filtros',catalog_lookup:'Catálogos',request_build:'Pedido',protobuf_encode:'Protobuf',c2s_dispatch:'Envio C2S',java_decode_and_handler:'Decoder e handler',java_transaction_and_sql:'Transação e banco',s2c_response_emit:'Respostas S2C',client_model_update:'Modelo do cliente',ui_refresh_and_unlock:'Refresh e desbloqueio'};
    const node = button(labels[stage.id] ?? stage.title ?? stage.id, () => { currentStage = stage; currentSection = 'stage'; render(); }, stage.id === currentStage?.id && currentSection === 'stage');
    node.className = stage.id === currentStage?.id && currentSection === 'stage' ? 'stage active' : 'stage';
    node.append(element('small', stage.status, 'mono'));
    return node;
  }));
  const sections = [['stage', 'Etapa selecionada'], ['variables', 'Variáveis e evidências'], ['protocol', 'Protobuf e respostas'], ['rules', 'Regras e catálogos'], ['defects', 'Divergências'], ['captures', 'Perguntas de captura']];
  get('sections').replaceChildren(...sections.map(([id, label]) => button(label, () => { currentSection = id; render(); }, currentSection === id)));
  get('filters').replaceChildren(...['Tudo', 'Divergência', 'Captura'].map(label => {
    const node = button(label, () => { selectedFilter = label; render(); }, selectedFilter === label);
    node.className = selectedFilter === label ? 'chip on' : 'chip';
    return node;
  }));
  get('files').replaceChildren(...loaded.files.map(file => button(file.path, () => showFile(file.path))));
  get('download').disabled = false;
  renderDetails();
}
async function reload() {
  get('error').textContent = '';
  try {
    const response = await fetch('/api/package');
    const body = await response.json();
    if (!response.ok) throw Error(body.error ?? 'Falha ao abrir pacote');
    loaded = body;
    render();
    showFile('ARENA.txt');
  } catch (error) {
    loaded = null;
    for (const id of ['stages', 'validation', 'sections', 'details', 'files']) get(id).replaceChildren();
    get('source').textContent = '';
    get('download').disabled = true;
    get('error').textContent = error.message;
    get('identity').textContent = 'Pacote indisponível ou alterado';
  }
}
get('reload').addEventListener('click', reload);
get('download').addEventListener('click', () => {
  if (!loaded) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(loaded, null, 2)], {type: 'application/json'}));
  const link = element('a');
  link.href = url;
  link.download = 'autoforge-action-package.json';
  link.click();
  URL.revokeObjectURL(url);
});
reload();
