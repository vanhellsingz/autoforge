import {evidenceLineage} from './evidence-lineage.mjs';
import {writeFileSync,readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {scanDataAdmin} from './data-admin-map.mjs';
import {scanContracts} from './integration-contracts.mjs';
import {backendProvenance,loadAssessments} from './backend-provenance.mjs';
import {PERSISTENCE_ADMIN_GUIDE,PRESERVE,GAMEPLAY_PROOFS,mysqlPreflight,assertReadOnlyPreflight} from './domain-guide.mjs';
const json=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const code=v=>'```json\n'+JSON.stringify(v,null,2)+'\n```';
function sourceUnion(groups){const out=new Map();for(const group of groups)for(const s of group??[]){if(out.has(s.path)&&out.get(s.path).sha256!==s.sha256)throw Error(`Backend source changed during analysis: ${s.path}`);out.set(s.path,{path:s.path,sha256:s.sha256});}return [...out.values()].sort((a,b)=>a.path.localeCompare(b.path,'en'));}
export function enrichPlan(plan,{from,backend,verified,scan,assessment,client,externalEditors}) {
 const provenance=backend?backendProvenance(backend):{status:'BACKEND_PATH_REQUIRED',commit:null,dirty:null};
 const dataAdmin=backend?scanDataAdmin(backend):null,contracts=backend?scanContracts(backend,scan):null;
 const lineage=evidenceLineage({from,backend,client,provenance,verified,scan,dataAdmin,contracts});
 const sources=sourceUnion([scan?.sources,dataAdmin?.sources,contracts?.sources]);
 for(const rule of externalEditors?.rules??[])for(const ref of rule.editorReferences){ref.evidenceContext={commit:null,commitStatus:'EXTERNAL_ROOT_NOT_VERSIONED_BY_THIS_SCAN',backendContextCommit:provenance.commit,environment:{kind:'EXTERNAL_EDITOR_READ_ONLY',root:ref.root},testId:'external-editors.mjs static scan',scope:'LOCATION_ONLY_NOT_WRITE_PROOF'};}
 const assessments=loadAssessments(assessment,{commit:provenance.commit,sources});
 if(backend){const after=backendProvenance(backend);if(after.commit!==provenance.commit)throw Error('Backend commit changed during analysis');}
 for(const task of plan.tasks){
  const data=dataAdmin?.rules.find(r=>r.id===task.id),contract=contracts?.rules.find(r=>r.id===task.id);
  task.analysis={commit:provenance.commit,dirty:provenance.dirty,provenanceStatus:provenance.status,scope:provenance.dirtyCoverage??provenance.scope??null};
  task.backendMethods=contract?.methods??[];
  task.implementation=assessments[task.id]??{status:'unverified',evidenceScope:'STATIC_ONLY',reason:'Referências, migrations e fórmulas não comprovam a funcionalidade no jogo. Anexar avaliação com commit, hashes e evidências.'};
  task.dependencies={mysql:{liveSchema:'NOT_QUERIED',tables:data?.tables??[],referencedTableNames:data?.referencedTableNames??[],migrations:data?.migrations??[]},admin:{locationEvidence:'STATIC_REFERENCE_ONLY',writeVerification:'NOT_VERIFIED',removalAuthorizedByMissingEvidence:false,proofRequired:['Operação autorizada na interface e requisição real','Leitura do estado autoritativo após gravação','Auditoria e valores antes/depois','Relogin ou atualização de sessão coerente','Permissão negada sem alteração'],references:data?.admin??[]},handlers:contract?.handlers??[],protocol:contract?.protocol??[],attributes:contract?.attributes??[]};
  task.dependencies.admin.externalReferences=externalEditors?.rules.find(r=>r.id===task.id)?.editorReferences??[];
  task.preserve=PRESERVE;
  task.persistenceAdminInstructions=PERSISTENCE_ADMIN_GUIDE;
  task.gameplayProofs=GAMEPLAY_PROOFS[task.id];
  task.blockers=[...(!backend?['Caminho do backend ativo não foi informado.']:[]),...(!provenance.commit?['Commit analisado indisponível; usar hashes e registrar um commit antes de avaliar estados.']:[]),...(!task.backendMethods.length?['Método alvo exato não resolvido; candidatos exigem revisão antes de editar.']:[]),...(task.implementation.status==='unverified'?['Funcionalidade existente ainda não homologada por evidência de serviço e cliente.']:[]),'Esquema MySQL efetivo e versão Flyway não foram consultados.','Rotas/permissões e comportamento dos editores do painel não foram testados.',...(contract?.unresolved??[]).map(r=>`${r.path}:${r.line}: ${r.reason}`)];
  const filename=task.title.slice(0,2)+'-'+task.generated.className+'.md';
  const path=join(from,'tasks',filename);
  const append=`\n## Commit e estado existente\n\n${code({analysis:task.analysis,implementation:task.implementation})}\n\n## Arquivo e método exatos resolvidos\n\n${task.backendMethods.length?code(task.backendMethods):'BLOQUEADO: método exato não resolvido. Não transformar um candidato em fato.'}\n\n## Dependências MySQL, painel, handlers e protocolo\n\n${code(task.dependencies)}\n\n## O que preservar\n\n${PRESERVE.map(s=>'- '+s).join('\n')}\n\n## Aplicação no banco e painel\n\n${PERSISTENCE_ADMIN_GUIDE.map((s,i)=>`${i+1}. ${s}`).join('\n')}\n\n## Como provar no jogo\n\n${task.gameplayProofs.map((p,i)=>`${i+1}. Ação: ${p.action}\n   Observar no cliente: ${p.observe}\n   Conferir persistência: ${p.persist}`).join('\n\n')}\n\n## Bloqueios explícitos\n\n${task.blockers.map(s=>'- '+s).join('\n')}\n`;
  writeFileSync(path,readFileSync(path,'utf8')+append);
 }
 plan.version='2.4';plan.evidenceLineage=lineage;plan.provenance=provenance;plan.dataAdminMap={path:'data-admin-map.json',filesScanned:dataAdmin?.filesScanned??0};plan.contracts={path:'integration-contracts.json',sourceFiles:contracts?.sources.length??0};plan.sourceHashes=sources;plan.assessmentScope='Artifact bytes and structured declared results are verified; actual execution/gameplay truth is not independently established.';
 plan.externalEditors={path:'external-editor-snapshot.json',mode:'READ_ONLY',roots:externalEditors?.roots??[]};
 json(join(from,'analysis-snapshot.json'),{provenance,sources,limitations:['Snapshot of supplied checkout, not proof of current live JAR, database or Arena remote HEAD.','Dirty and untracked files must be reviewed; commit alone does not describe their bytes.']});
 json(join(from,'data-admin-map.json'),dataAdmin??{status:'BACKEND_PATH_REQUIRED'});
 json(join(from,'integration-contracts.json'),contracts??{status:'BACKEND_PATH_REQUIRED'});
 const observedTables=dataAdmin?.rules.flatMap(r=>r.referencedTableNames)??[];
 const preflight=mysqlPreflight(observedTables);assertReadOnlyPreflight(preflight);writeFileSync(join(from,'MYSQL_PREFLIGHT.sql'),preflight);plan.preflightPolicy={mode:'SELECT_METADATA_ONLY',validated:true,executed:false};
 writeFileSync(join(from,'MYSQL_ADMIN.md'),'# Contrato MySQL e painel\n\nA análise lê migrations, SQL no Java e fontes do painel; não conecta ao banco nem altera dados. O preflight é validado como SELECT/metadados somente leitura. Formulário localizado não comprova gravação; exigir requisição real, readback, auditoria, permissão e relogin. Ausência de evidência não autoriza remover ou desabilitar uma função.\n\n'+PERSISTENCE_ADMIN_GUIDE.map((s,i)=>`${i+1}. ${s}`).join('\n')+'\n\nCada tarefa contém referências específicas. data-admin-map.json mantém os vínculos e seus limites. MYSQL_PREFLIGHT.sql é somente leitura e deve ser executado na conexão escolhida pelo operador. O painel deve reutilizar serviços, validações, permissões e auditoria existentes.\n');
 writeFileSync(join(from,'IMPLEMENTATION_STATES.md'),`# Estados de implementação\n\nPor padrão: unverified. O scanner não converte presença de código em funcionalidade pronta.\n\nEstados declarados por revisão: absent, partial, functional, divergent. Use --assessment ARQUIVO.json em prepare.mjs ou run.mjs. O arquivo deve ter schemaVersion:1 e assessments:[]. Cada entrada contém rule, status, commit completo, sourceHashes:[{path,sha256}] e evidence:[{kind,id,description,result}].\n\nfunctional exige declarações de teste e runtime aprovados; divergent exige comparação independente divergente. O planejador valida metadados, commit e hashes: não executa nem certifica os artefatos externos referidos. Detalhes do schema estão em backend-provenance.mjs.\n\nCommit analisado: ${provenance.commit??'indisponível'}. Estado local modificado: ${provenance.dirty??'indisponível'}. analysis-snapshot.json contém os hashes efetivos. Regerar a fila no checkout ativo do Arena após alterações; não tratar este exemplo como diagnóstico do servidor em execução.\n`);
 if(!existsSync(join(from,'ASSESSMENT_TEMPLATE.json')))json(join(from,'ASSESSMENT_TEMPLATE.json'),{schemaVersion:1,assessments:[]});
 return plan;
}
