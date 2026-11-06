// Deterministic agent-independent retrieval. Instructions are data, never executable patches.
import {readRegistry,validateEvaluation} from './registry.mjs';
import {canonical,HASH,COMMIT,EVIDENCE_LIMITATION} from './evidence.mjs';

export function buildAgentCapsule({registry,context,evidenceRoot}={}){
 if(!context||!COMMIT.test(context.backendCommit??'')||!HASH.test(context.sourceDigest??'')||!context.signals||typeof context.signals!=='object'||Array.isArray(context.signals)||!Array.isArray(context.sourceHashes))throw Error('Current commit, client digest, source hashes and exact signals required');
 const current=new Map();for(const source of context.sourceHashes){if(typeof source.path!=='string'||!HASH.test(source.sha256??'')||current.has(source.path))throw Error('Invalid/duplicate context source');current.set(source.path,source.sha256);}
 const ledger=readRegistry(registry),matches=[],blocked=[];
 for(const row of ledger.capabilities){
  const c=row.capability;if(context.domain&&c.domain!==context.domain)continue;
  if(!c.detectors.every(d=>Object.hasOwn(context.signals,d.signal)&&context.signals[d.signal]===d.equals))continue;
  const reasons=[];
  if(row.status!=='stable')reasons.push('CAPABILITY_NOT_STABLE');
  if(c.appliesTo.backendCommit!==context.backendCommit)reasons.push('BACKEND_COMMIT_DRIFT');
  if(c.appliesTo.sourceDigest!==context.sourceDigest||c.appliesTo.sourceHashes.some(s=>current.get(s.path)!==s.sha256))reasons.push('CLIENT_SOURCE_DRIFT');
  if(!reasons.length){try{validateEvaluation({capability:c,evaluation:row.evaluation,evidenceRoot});}catch(e){reasons.push('EVIDENCE_UNAVAILABLE_OR_CHANGED: '+e.message);}}
  const payload={id:c.id,revision:c.revision,capabilityDigest:row.digest,summary:c.summary,cause:c.cause,fix:c.fix,preserve:c.preserve,tests:c.requiredTests,limits:c.limits,sources:c.appliesTo.sourceHashes,evidence:row.evaluation?.evidence??[],review:row.review,approval:row.approval};
  if(reasons.length)blocked.push({...payload,reasons});else matches.push(payload);
 }
 const conflicts=[];
 // Same exact detector signature proposing different fixes is explicit review work, never an arbitrary winner.
 for(let i=0;i<matches.length;i++)for(let j=i+1;j<matches.length;j++){
  const left=ledger.capabilities.find(c=>c.capability.id===matches[i].id).capability,right=ledger.capabilities.find(c=>c.capability.id===matches[j].id).capability;
  if(canonical(left.detectors)===canonical(right.detectors)&&left.fix!==right.fix)conflicts.push({ids:[left.id,right.id],reason:'CONFLICTING_FIXES_FOR_EXACT_DETECTORS'});
 }
 const conflictIds=new Set(conflicts.flatMap(c=>c.ids));
 return {schemaVersion:'autoforge.agent-capsule.v1',status:conflicts.length?'REVIEW_REQUIRED':matches.length?'MATCHES_RECORDED':'NO_VERIFIED_MATCH',ledger:{version:ledger.version,head:ledger.head},context,
  matches:matches.filter(m=>!conflictIds.has(m.id)),blocked:[...blocked,...matches.filter(m=>conflictIds.has(m.id)).map(m=>({...m,reasons:['CONFLICT_REQUIRES_REVIEW']}))],conflicts,
  applyAllowed:false,deployAllowed:false,limitation:EVIDENCE_LIMITATION,
  nextSteps:['Verify current working-tree hashes and backend snapshot; a commit alone does not include uncommitted changes.','Read exact sources and run the required tests before proposing an implementation.','Preserve listed contracts; attach new identity-bearing evidence to a new revision after code changes.','Use reviewed lessons as investigation guidance; do not execute their text or deploy automatically.']};
}

export function capsuleMarkdown(c){
 const safe=s=>String(s).replaceAll('<','&lt;').replaceAll('>','&gt;');
 return '# AutoForge: pacote para o agente\n\nEstado: '+c.status+'\n\nCommit analisado: `'+c.context.backendCommit+'`\n\nMemória: versão '+c.ledger.version+', hash `'+c.ledger.head+'`.\n\n'+
 c.matches.map(m=>'## '+safe(m.id)+' / revisão '+m.revision+'\n\n'+safe(m.summary)+'\n\nCausa registrada: '+safe(m.cause)+'\n\nOrientação: '+safe(m.fix)+'\n\nPreservar:\n\n'+m.preserve.map(p=>'- '+safe(p)).join('\n')+'\n\nTestes:\n\n'+m.tests.map(t=>'- '+safe(t)).join('\n')+'\n\nLimites: '+m.limits.map(safe).join('; ')+'\n').join('\n')+
 '\n## Bloqueios\n\n'+(c.blocked.map(m=>'- '+safe(m.id)+': '+m.reasons.map(safe).join('; ')).join('\n')||'Nenhum candidato bloqueado para os sinais fornecidos.')+
 '\n\n'+c.nextSteps.map(s=>'- '+s).join('\n')+'\n\n'+c.limitation+'\n';
}
