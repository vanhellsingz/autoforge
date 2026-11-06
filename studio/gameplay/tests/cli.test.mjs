import {test} from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {main} from '../autoforge.mjs';
test('one command creates all three atlases and diagnoses UI completion without executing game actions',async t=>{
 const root=mkdtempSync(join(tmpdir(),'af-gameplay-cli-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const client=join(root,'client'),config=join(client,'res/release/config');mkdirSync(config,{recursive:true});
 const put=(table,rows)=>writeFileSync(join(config,table+'-aaaaaaaaaa.json'),JSON.stringify({[table]:rows}));
 put('t_s_questtemplate',[{TemplateId:121,PreQuestId:'',Title_pt:'Encantamento'}]);put('t_s_questcondiction',[{TemplateId:121,CondictionID:1,CondictionType:17,Para1:'3',Para2:1}]);put('t_s_questgood',[]);
 put('t_s_map',[{Id:1,CampaignId:10,Types:0}]);put('t_s_campaign',[{CampaignId:10,MapIds:'1'}]);put('t_s_campaigndata',[{Id:11,CampaignId:10,NextNodeIds:'0'}]);
 put('t_s_itemtemplate',[{TemplateId:7,TemplateName_pt:'Exemplo'}]);put('t_s_shop',[{Id:1,ItemId:7,Gold:2}]);
 const out=join(root,'delivery');const r=await main(['all','--client',client,'--out',out]);assert.deepEqual(r.modules,['quests','maps','shops']);assert.equal(r.runtime,'UNVERIFIED');
 const atlas=JSON.parse(readFileSync(join(out,'world-atlas.json')));assert.equal(atlas.maps.length,1);
 const projection=join(root,'projection.json');writeFileSync(projection,JSON.stringify({authoritative:{completedCampaignIds:[]},ui:{completedCampaignIds:[10]},history:{verifiedWins:[]}}));
 const check=await main(['map-projection','--atlas',join(out,'world-atlas.json'),'--projection',projection,'--out',join(root,'projection-report')]);assert.equal(check.status,'FAIL');
 const bindings=join(root,'bindings.json'),evidence=join(root,'evidence.json');writeFileSync(bindings,'[]');writeFileSync(evidence,'{}');
 const quest=await main(['quest-check','--atlas',join(out,'quest-atlas.json'),'--quest-id','121','--bindings',bindings,'--evidence',evidence,'--out',join(root,'quest-report')]);assert.equal(quest.status,'UNVERIFIED');
});
test('CLI rejects unknown options before reading files',async()=>{await assert.rejects(()=>main(['all','--restart-server','true']),/Unknown option/);});
