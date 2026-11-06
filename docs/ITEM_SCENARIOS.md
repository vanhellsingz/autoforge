# Planejador de cenários e cobertura de itens

API: `buildItemScenarios({index,contracts:[],evidenceSources:[],maxScenarios:50000})`, exportada por `studio/items/item-scenarios.mjs`. A função gera **dados de planejamento**, sem consumir, vender, equipar, conceder itens ou executar SQL.

Cada item do índice aparece exatamente uma vez na cobertura: `MISSING_CONTRACT`, `BLOCKED` ou `PLANNED_FOR_REVIEW`. Todos permanecem `runtime: UNVERIFIED`; os contadores `verifiedItems` e `executedScenarios` começam em zero. Assim, catalogar milhares de itens não vira uma declaração falsa de milhares de funcionalidades implementadas.

Contrato de exemplo (IDs, valores e opcode abaixo são somente ilustração):

```json
{
  "schemaVersion":1,
  "id":"example.consume",
  "selector":{"templateIds":[123]},
  "operations":[{
    "type":"use",
    "effectStatus":"reviewed",
    "evidence":[{"path":"res/release/config/t_s_itemtemplate-example.json","sha256":"HASH_REAL_DA_FONTE"}],
    "guards":{"amount":{"min":1,"max":5},"minLevel":2,"classIds":[3],"boundAllowed":false,"requireSpace":true},
    "expected":{"deltas":[{"domain":"inventory","key":"example.potion","perUnit":-1},{"domain":"attributes","key":"example.energy","perUnit":10}],"responseOpcodes":[115],"uiCheckpoints":["energy-bar"]}
  }]
}
```

Também é possível selecionar por um campo **original e explícito** do catálogo: `"selector":{"category":{"field":"MasterType","value":2}}`. A ferramenta não presume que `Type`, `Category`, `MasterType` ou qualquer valor numérico signifique consumível/equipamento. `templateIds` aceita IDs inteiros como strings, incluindo os negativos existentes no cliente. Não aceita paths, expressões nem JavaScript.

Operações suportadas: `equip`, `unequip`, `use`, `open`, `sell`, `forge`. Deltas aceitam somente os domínios `inventory`, `currencies`, `attributes`, com números inteiros limitados. Respostas e checkpoints são critérios declarados do contrato, não provas de que o backend já os emite.

A evidência precisa corresponder a um path/hash presente em `index.sources` ou em `evidenceSources` fornecido explicitamente. Matching de hash confirma a referência de origem; a revisão semântica ainda é responsabilidade do contrato. Uma fonte não reconhecida, efeito não revisado, índice incompleto ou dois contratos cobrindo a mesma operação/item bloqueia o planejamento daquela operação. Não há escolha implícita de precedência.

Para operações planejáveis, os cenários incluem sucesso com quantidade mínima, quantidade abaixo/acima dos limites, repetição da mesma operação, F5 e novo login. Havendo um débito explícito, há caso de recurso insuficiente. Restrições de nível, classe, vínculo e espaço geram casos de rejeição somente quando essas regras estão expressas no contrato.

Baús, RNG, drops, preços, teto/recarga de energia e fórmulas arbitrárias **não são inventados**. Não inclua uma regra fora da gramática como campo adicional: campos desconhecidos são recusados. Se a semântica ainda não foi recuperada, use `effectStatus: "unverified"`; a operação ficará bloqueada. O executor futuro precisa de um adaptador revisado e autorização específica para ações no jogo.

O resultado contém `sourceDigest`, SHA de cada contrato, referências de evidência, casos determinísticos e alvos de contrato ausentes no índice. O Arena deve comparar esses identificadores com a versão atual antes de implementar e comprovar UI e persistência no servidor real depois.

O orçamento padrão é de 50 mil cenários, configurável até 250 mil. Ao atingir o orçamento, a cobertura de cada item continua presente, mas operações sem espaço para seus cenários ficam bloqueadas com `SCENARIO_LIMIT_REACHED`; o relatório marca `truncated: true`. Nada é silenciosamente contado como planejado ou executado.
