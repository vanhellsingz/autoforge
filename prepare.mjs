import {sha256} from './assets.mjs';
import {enrichPlan} from './queue-details.mjs';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {verifyBundle} from './verify.mjs';
import {scanBackend} from './backend-map.mjs';
import {buildCausalContext,renderCausalContext} from './causal-context.mjs';
import {integrate} from './integrate.mjs';
import {captureBackendSnapshot,assertBackendSnapshot} from './backend-guard.mjs';
import {scanExternalEditors,parseEditorRoot,assertExternalEditorSnapshot} from './external-editors.mjs';
const here=dirname(fileURLToPath(import.meta.url));
const profiles={
 'forge.common.enhancement.gold': {title:'01 — Custo do encantamento',className:'ForgeEnhancementCost',contract:['Usar NeedGrades e Profile do template resolvido e strengthenGrade do item persistido.','Conectar gold(...) à cobrança e ao valor exibido; manter distinção do ramo de equipamento de mudança de classe.','Validar ouro, posse, limite e custo antes de alterar o equipamento, na transação existente.'],checks:['ouro insuficiente não altera item nem saldo','custo debitado corresponde à fórmula','repetição do pacote não duplica cobrança']},
 'forge.common.enhancement.rate': {title:'02 — Chance e limites do encantamento',className:'ForgeEnhancementRules',contract:['Usar successRate(grade,property1), canIntensify(cost,gold,grade,max) e needsRiskConfirm(rate) conforme o ramo suportado.','Property1 do material deve vir do slot persistido da forja. Pacote sem corpo não prova material ausente.','RNG deve ser uma dependência controlável do serviço; fórmula de chance não implementa sorteio ou consumo.'],checks:['sucesso e falha com RNG controlado','material consumido uma vez','limite e ouro insuficiente sem mutação']},
 'attributes.fighting-capacity': {title:'03 — FightingCapacity',className:'ClientFightCapacity',contract:['Resolver os três vetores conforme INPUTS.md; não preencher coeficientes ausentes com valores presumidos.','O método player faz conversões e ponderações: confira a origem de cada atributo para não converter ou somar bônus duas vezes.','Conectar a projeção única usada pela batalha e pelos snapshots do herói/PlayerInfo; comparar equipado, sem equipamento e com passivas.'],checks:['equipar e retirar atualiza poder e atributos','mesmo estado produz mesmo poder após F5','guardião e arma rara usam o método correspondente']},
 'quest.condition.vocabulary': {title:'04 — Vocabulário de condições de missão',className:'QuestConditionType',contract:['O enum recupera nomes/IDs; não avalia condições.','IDs desconhecidos e Para1..Para4 precisam de evidência no dispatcher específico.','Não marcar quest concluída só porque seu tipo foi nomeado; confirmar evento, quantidade, recompensa e persistência.'],checks:['tipo desconhecido não concede recompensa','evento correto atualiza apenas a condição correspondente','conclusão/recompensa idempotente após relogin']}
};
const save=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const escape=s=>String(s).replaceAll('`','\\`').replaceAll('\n',' ');
function pointers(list) {return list?.length?list.map(x=>`- ${escape(x.path)}:${x.line} — ${escape(x.kind)} — SHA256 ${x.sha256}\n  \`${escape(x.snippet)}\``).join('\n'):'- Nenhum ponto localizado. Pesquisar o serviço correspondente antes de editar.';}
export function prepare({from,backend,client,assessment,editorRoots}) {
 from=resolve(from);
 if(editorRoots===undefined&&existsSync(join(from,'external-editor-snapshot.json')))editorRoots=JSON.parse(readFileSync(join(from,'external-editor-snapshot.json'),'utf8')).roots;
 editorRoots??=[];
 const criticalSnapshot=backend?captureBackendSnapshot(backend):null;
 const externalEditors=scanExternalEditors(editorRoots);
 // Planning does not assert that imports/candidates implement runtime behavior.
 const verified=verifyBundle({from,client});
 const scan=backend?scanBackend(backend):null;
 const installation=backend?integrate({from,backend}):null;
 const tasks=[];
 mkdirSync(join(from,'tasks'),{recursive:true});
 for(const [id,p] of Object.entries(profiles)) {
  const evidence=verified.evidence.find(e=>e.rule===id);
  if(!evidence)throw Error(`Missing evidence for ${id}`);
  const report=evidence.report,refs=scan?.rules.find(r=>r.id===id);
  const file=verified.files.find(f=>f.className===p.className);
  if(!file)throw Error(`Missing class ${p.className}`);
  const methods=readFileSync(join(from,file.path),'utf8').split(/\r?\n/).filter(l=>/public static/.test(l)).map(l=>l.trim());
  const task={id,title:p.title,status:'TO_IMPLEMENT',generated:file,evidence:evidence.path,methods,backend:refs??{status:'BACKEND_PATH_REQUIRED',references:[],candidates:[]},contract:['Comparar com implementações existentes; preservar métodos equivalentes corretos e evitar duplicação de sistemas ou bônus.',...p.contract],acceptance:p.checks};
  tasks.push(task);
  const text=`# ${p.title}\n\nEstado: TO_IMPLEMENT. Referências de código são pontos de investigação, não prova de integração.\n\n## Classe e evidência\n\n- ${file.path}\n- ${evidence.path}\n\nMétodos gerados:\n\n\`\`\`java\n${methods.join('\n')}\n\`\`\`\n\n## Referências encontradas\n\n${pointers(refs?.references)}\n\n## Candidatos de serviço\n\n${pointers(refs?.candidates)}\n\n## Implementação em ordem\n\n${task.contract.map((s,i)=>`${i+1}. ${s}`).join('\n')}\n\n## Aceitação\n\n${p.checks.map(s=>'- [ ] '+s).join('\n')}\n\n## Lacunas declaradas pela extração\n\n${(report.gaps??report.limitations??[]).map(s=>'- '+s).join('\n')}\n`;
  writeFileSync(join(from,'tasks',p.title.slice(0,2)+'-'+p.className+'.md'),text);
 }
 const capacity=verified.evidence.find(e=>e.rule==='attributes.fighting-capacity').report;
 const names={stats:'stats',basePercentWeights:'base',rates:'rates'};
 const inputs='# Contrato de entradas do FightingCapacity\n\nA ordem vem da extração do cliente. Os valores devem vir de estado resolvido. As tabelas não atribuem valores padrão. O vetor base contém pesos percentuais; rates contém taxas de conversão.\n\n'+Object.entries(capacity.inputs).map(([group,fields])=>`## ${group}\n\n| Posição Java | Campo do cliente |\n| --- | --- |\n`+fields.map((f,i)=>`| ${names[group]}[${i}] | ${f} |`).join('\n')).join('\n\n')+'\n\nAntes de conectar, verificar no serviço a origem e a etapa de cada atributo. Não passar um atributo já convertido para um campo que a função converte novamente.\n';
 writeFileSync(join(from,'INPUTS.md'),inputs);
 const plan={version:'2.2',status:!backend?'BACKEND_PATH_REQUIRED':installation.conflicts?'CONFLICTS_TO_RESOLVE':'READY_FOR_IMPLEMENTATION',verification:'VERIFIED',sourceVerification:client?'CLIENT_HASHES_CHECKED':'NOT_REQUESTED',backend:backend?resolve(backend):null,installation,tasks,backendMap:scan,runtime:'NOT_VERIFIED',deployment:'NOT_RUN'};
 enrichPlan(plan,{from,backend,verified,scan,assessment,client,externalEditors});
 if(backend){
  const context=buildCausalContext(backend,{commit:criticalSnapshot.commit,expectedSources:scan.sources});
  save(join(from,'causal-context.json'),context);
  writeFileSync(join(from,'CAUSAL_CONTEXT.md'),renderCausalContext(context));
  plan.causalContext={path:'causal-context.json',sha256:sha256(JSON.stringify(context,null,2)+'\n'),guide:'CAUSAL_CONTEXT.md',status:'STATIC_CANDIDATES_NOT_RUNTIME_PROOF'};
 }
 if(backend){assertBackendSnapshot(backend,criticalSnapshot);criticalSnapshot.externalEditorSnapshotHash=sha256(JSON.stringify(externalEditors,null,2)+'\n');save(join(from,'backend-snapshot.json'),criticalSnapshot);}
 save(join(from,'external-editor-snapshot.json'),externalEditors);
 plan.installation=backend?integrate({from,backend}):null;
 save(join(from,'arena-plan.json'),plan);
 const start=`# Comece aqui — Arena\n\n1. Abra tasks/01-ForgeEnhancementCost.md e siga a fila 01 → 02 → 03 → 04. Cada arquivo inclui métodos, fontes, locais do backend, lacunas e critérios de aceitação.\n2. Confira arena-plan.json: ${plan.status}.\n3. Use INPUTS.md para os índices exatos dos vetores. Leia MYSQL_ADMIN.md, MYSQL_PREFLIGHT.sql, IMPLEMENTATION_STATES.md e ARTIFACTS.md. analysis-snapshot.json registra commit e hashes; EVIDENCE_LINEAGE.md separa commit/ambiente/teste de cada evidência; cada tarefa traz método, dependências e testes no jogo.\n4. Execute os comandos abaixo no checkout que contém a ferramenta. Primeiro a prévia; --apply só instala os tipos gerados.\n\n\`\`\`powershell\nnode tools/autoforge-v2/verify.mjs --from "CAMINHO_DA_ENTREGA" --client "CLIENTE_REAL"\nnode tools/autoforge-v2/prepare.mjs --from "CAMINHO_DA_ENTREGA" --backend "JAVA_V1" --client "CLIENTE_REAL"\nnode tools/autoforge-v2/integrate.mjs --from "CAMINHO_DA_ENTREGA" --backend "JAVA_V1"\nnode tools/autoforge-v2/integrate.mjs --from "CAMINHO_DA_ENTREGA" --backend "JAVA_V1" --apply\n\`\`\`\n\nAtalho Windows: arena-steps.ps1 recebe -ToolRoot, -Backend e opcionalmente -Client; por padrão só verifica e mostra a prévia. -ApplyGenerated instala as classes.\n\n5. Conecte os serviços conforme as tarefas, compile e valide persistência/protocolo. Depois use o procedimento autorizado de aplicação do projeto; confira caminhos efetivos, migrações e compatibilidade do rollback. O script apply-local-game.ps1 de outro checkout pode conter diretórios fixos diferentes do servidor atual: revisar antes de executar.\n6. Copie RESULTADO_ARENA.md para seu relatório e preencha somente evidências efetivamente obtidas.\n\nReferência ou import encontrado não comprova integração funcional. Não trocar pacotes/imports automaticamente sem revisar o contrato. O gerador não altera a conta nem reinicia o servidor.\n`;
 writeFileSync(join(from,'COMECE_AQUI.md'),start);
 if(backend)writeFileSync(join(from,'COMECE_AQUI.md'),start+'\nAntes de alterar fluxos de inventário, equipamentos, venda, forja, tropas, campanha ou poder, leia CAUSAL_CONTEXT.md e causal-context.json. São atalhos com métodos/linhas/hashes e chamadas candidatas; localizar um símbolo não prova execução. Trace a primeira fronteira que falhou, preserve o fluxo existente e registre esperado/obtido por commit, ambiente e teste.\n');
 writeFileSync(join(from,'ARTIFACTS.md'),'# Artefatos verificáveis\n\nAvaliações funcionais exigem arquivos reais com SHA256 e identidade correspondente. artifacts:[{path,sha256,format}] usa caminhos relativos ao JSON de avaliação. opaque confere apenas integridade; junit confere resultados e contagens; json-report confere commit, ambiente, testId e, no runtime, commit/hash do JAR. Nenhum formato sozinho prova execução real ou gameplay. Consulte a run Actions e seus artefatos, sem transferir um sucesso de outra branch.\n\nO backend-snapshot.json bloqueia --apply desatualizado. Regere antes da aplicação se código, migrations, painel, build ou commit mudarem. As fontes externas configuradas permanecem somente leitura e são rechecadas.\n');
 if(!existsSync(join(from,'RESULTADO_ARENA.md')))writeFileSync(join(from,'RESULTADO_ARENA.md'),'# Resultado a preencher pelo Arena\n\n- Commit/backend utilizado:\n- Tarefas conectadas e arquivos alterados:\n- Origem dos coeficientes e atributos:\n- Testes de serviço/protocolo executados:\n- Persistência após relogin:\n- JAR construído (SHA256):\n- Processo/porta/diretório efetivos:\n- Flyway antes/depois e rollback compatível:\n- Funcionalidades verificadas no cliente:\n- Falhas e pendências:\n\nEstado inicial deste modelo: NÃO PREENCHIDO; nenhum deploy é comprovado por este arquivo.\n');
 const script=String.raw`param(
 [Parameter(Mandatory=$true)][string]$ToolRoot,
 [Parameter(Mandatory=$true)][string]$Backend,
 [string]$Client,
 [string]$Assessment,
 [string[]]$EditorRoot,
 [switch]$ApplyGenerated
)
$ErrorActionPreference='Stop'
if($ApplyGenerated -and ($Assessment -or $EditorRoot)){throw 'Planeje a avaliacao/editores antes de ApplyGenerated; a aplicacao nao regenera o snapshot.'}
$verifyArgs=@((Join-Path $ToolRoot 'verify.mjs'),'--from',$PSScriptRoot)
if($Client){$verifyArgs+=@('--client',$Client)}
& node @verifyArgs
if($LASTEXITCODE -ne 0){throw 'Evidence verification failed'}
$planArgs=@((Join-Path $ToolRoot 'prepare.mjs'),'--from',$PSScriptRoot,'--backend',$Backend)
if($Client){$planArgs+=@('--client',$Client)}
if($Assessment){$planArgs+=@('--assessment',$Assessment)}
if($EditorRoot){foreach($root in $EditorRoot){$planArgs+=@('--editor-root',$root)}}
if(-not $ApplyGenerated){ & node @planArgs }
if(-not $ApplyGenerated -and $LASTEXITCODE -ne 0){throw 'Arena preparation failed'}
$installArgs=@((Join-Path $ToolRoot 'integrate.mjs'),'--from',$PSScriptRoot,'--backend',$Backend)
if($ApplyGenerated){$installArgs+='--apply'}
& node @installArgs
if($LASTEXITCODE -ne 0){throw 'Generated class integration failed'}
Write-Output 'Abra COMECE_AQUI.md e as quatro tarefas. Os servicos ainda precisam ser conectados; nenhum deploy foi executado.'
`;
 writeFileSync(join(from,'arena-steps.ps1'),script);
 return plan;
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{const opts={};for(let i=2;i<process.argv.length;i++){const a=process.argv[i];if(a==='--editor-root'){const value=process.argv[++i];if(!value)throw Error('--editor-root requires name=path');(opts.editorRoots??=[]).push(parseEditorRoot(value));continue;}if(!['--from','--backend','--client','--assessment'].includes(a)||!process.argv[i+1]||process.argv[i+1].startsWith('--'))throw Error('Usage: node prepare.mjs --from OUTPUT [--backend JAVA_V1] [--client CLIENT_ROOT] [--assessment REVIEW.json]');opts[a.slice(2)]=process.argv[++i];}if(!opts.from)throw Error('--from required');const plan=prepare(opts);console.log(JSON.stringify({status:plan.status,tasks:plan.tasks.length,entry:join(resolve(opts.from),'COMECE_AQUI.md')},null,2));if(plan.installation?.conflicts)process.exitCode=2;}
 catch(error){console.error('Arena preparation: '+error.message);process.exitCode=1;}
}
