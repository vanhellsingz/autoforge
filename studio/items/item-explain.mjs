import {readFileSync,lstatSync} from 'node:fs';import {resolve,join,relative,isAbsolute,sep} from 'node:path';import {createHash} from 'node:crypto';
import {itemId,noItemLinks,fieldType} from './item-index.mjs';
const H=b=>createHash('sha256').update(b).digest('hex');
const NOTES={TemplateId:'Identificador observado do template; nao e o ID de uma instancia no inventario.',MasterType:'Classificador bruto do cliente. O numero nao comprova uma funcionalidade.',SonType:'Subtipo bruto do cliente; significado depende do consumidor no bundle.',Property1:'Parametro dependente do tipo de item; unidade/efeito ainda exigem o consumidor no cliente.',Property2:'Parametro dependente do tipo de item; nao e uma recompensa universal.',Property3:'Parametro dependente do tipo de item.',Property4:'Parametro dependente do tipo de item.',Property5:'Parametro dependente do tipo de item.',Property6:'Parametro dependente do tipo de item.',SellGold:'Valor declarado no catalogo; exige validar bloqueios, quantidade, vinculo e handler de venda.',StrengthenMax:'Limite declarado; nao comprova regras/custos/aplicacao do encantamento.',MaxCount:'Limite declarado do catalogo; conferir semantica de pilha e inventario.',NeedGrades:'Requisito declarado; conferir classe, nivel e ramo de uso no cliente.',TransformId:'Referencia candidata para outro template de item, nao uma transformacao automaticamente autorizada.',SuiteId:'Referencia candidata de conjunto; exige catalogo e consumidor correspondente.'};
export function verifyItemSources(index,client){
 const root=noItemLinks(client);
 for(const source of index.sources??[]){if(typeof source.path!=='string'||isAbsolute(source.path))throw Error('Unsafe catalog source path');const p=resolve(root,source.path),rel=relative(root,p);if(rel==='..'||rel.startsWith('..'+sep)||isAbsolute(rel))throw Error('Catalog source escapes client');noItemLinks(p);const st=lstatSync(p);if(!st.isFile()||st.size>128*1024*1024||st.size!==source.bytes)throw Error('Item catalog snapshot changed: '+source.path);if(H(readFileSync(p))!==source.sha256)throw Error('Item catalog snapshot changed: '+source.path);}
 return true;
}
export function explainItem(index,id,{client,maxReferences=200}={}){
 if(index?.schemaVersion!=='autoforge.items-index.v1'||!Array.isArray(index.items))throw Error('Invalid item index');
 const wanted=itemId(id);if(wanted===null)throw Error('Invalid item identity');if(!Number.isSafeInteger(maxReferences)||maxReferences<1||maxReferences>1000)throw Error('Invalid reference limit');
 if(client)verifyItemSources(index,client);
 const matches=index.items.filter(i=>i.id===wanted);if(matches.length!==1)throw Error(matches.length?'Ambiguous item identity':'Item identity not found');const item=matches[0];
 const references=[],unresolved=[];let totalReferences=0;
 const add=v=>{totalReferences++;if(references.length<maxReferences)references.push(v)};
 const resolveItem=(field,value,source)=>{const target=itemId(value);if(target===null||target==='0')return;const rows=index.items.filter(i=>i.id===target);const ref={direction:'OUTGOING',field,value,targetTable:'t_s_itemtemplate',targetId:target,status:rows.length===1?'CATALOG_REFERENCE_RESOLVED':'UNRESOLVED',source,interpretation:'STATIC_FIELD_REFERENCE_NOT_ITEM_EFFECT'};if(rows.length===1)ref.targetSource=rows[0].source;else unresolved.push({field,targetId:target,reason:'TARGET_ITEM_NOT_INDEXED'});add(ref)};
 if(Object.hasOwn(item.fields,'TransformId'))resolveItem('TransformId',item.fields.TransformId,item.source);
 if(item.fields.SuiteId!=null&&item.fields.SuiteId!==0)unresolved.push({field:'SuiteId',value:item.fields.SuiteId,reason:'CONSUMER_AND_TARGET_TABLE_NOT_PROVEN'});
 for(const table of index.tables??[]){
  if(table.name==='t_s_itemtemplate')continue;
  for(const row of table.rows??[]){
   const fields=table.name==='t_s_compose'?['Material1','Material2','Material3','Material4','NewMaterial']:[];
   for(const field of fields)if(itemId(row.fields[field])===wanted)add({direction:'INCOMING',table:table.name,rowId:row.id,field,source:{...table.source,rowKey:row.rowKey},status:'EXPLICIT_CATALOG_REFERENCE',role:field==='NewMaterial'?'RESULT_CANDIDATE':'MATERIAL_CANDIDATE',fields:structuredClone(row.fields)});
   if(table.name==='t_s_equipgodforge'&&typeof row.fields.Item==='string'){
    const material=row.fields.Item;
    if(!/^-?\d+,\d+(?:\|-?\d+,\d+)*$/.test(material)){if(material)unresolved.push({table:table.name,rowId:row.id,field:'Item',reason:'MATERIAL_GRAMMAR_NOT_SUPPORTED'});continue;}
    const pairs=material.split('|').map(p=>p.split(','));for(const [ref,count] of pairs)if(itemId(ref)===wanted){if(!Number.isSafeInteger(Number(count))){unresolved.push({table:table.name,rowId:row.id,field:'Item',reason:'UNSAFE_MATERIAL_QUANTITY'});continue;}add({direction:'INCOMING',table:table.name,rowId:row.id,field:'Item',quantity:Number(count),source:{...table.source,rowKey:row.rowKey},status:'EXPLICIT_LIST_REFERENCE',interpretation:'OBSERVED_ID_COUNT_GRAMMAR_NOT_REWARD_PROOF'});}
   }
  }
 }
 const fields=Object.entries(item.fields).map(([field,value])=>({field,type:fieldType(value),value:structuredClone(value),source:item.source,interpretation:NOTES[field]??'Campo original preservado; semantica requer leitura do consumidor no cliente.',verification:'CATALOG_ONLY'}));
 return {schemaVersion:'autoforge.item-dossier.v1',id:item.id,name:item.name,sourceDigest:index.sourceDigest,source:structuredClone(item.source),sourceVerification:client?'CURRENT_BYTES_MATCH':'NOT_RECHECKED',classification:{status:'RAW_CATALOG_VALUES',MasterType:item.fields.MasterType??null,SonType:item.fields.SonType??null,semanticLabel:'UNVERIFIED'},fields,references,referenceCoverage:{total:totalReferences,shown:references.length,truncated:totalReferences>references.length},unresolved,capabilities:{sale:item.fields.SellGold>0?'CATALOG_PRICE_PRESENT':'NO_POSITIVE_CATALOG_PRICE',strengthen:item.fields.StrengthenMax>0?'CATALOG_CAP_PRESENT':'NO_POSITIVE_CATALOG_CAP',itemEffect:'UNVERIFIED'},runtime:'UNVERIFIED',coverage:index.coverage,next:['Locate the exact client consumer of MasterType/SonType and Property1..6.','Map the authenticated C2S handler, transaction, S2C/UI refresh and post-relogin readback.','Use observed rules to write a reviewed scenario contract; do not grant or consume from field names alone.']};
}
