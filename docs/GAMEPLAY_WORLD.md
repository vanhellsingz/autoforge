# Atlas de mapas e atividades

`buildWorldAtlas({client})` lê as famílias de mapas, campanhas, nós, arena/battlefield, labirinto/maze, catacumbas/abyss, cidades, spawns, monstros, bosses, portais e expedições. Todas as linhas e campos originais dos catálogos selecionados permanecem em `tables`, com paths, hashes e localização das linhas. `coverage` registra o escopo e qualquer limite/omissão; não declara que o backend implementa esses sistemas.

Mapas ficam em `maps`, campanhas em `campaigns`, nós em `nodes`, demais registros em `activityRows`. A classificação de `Types`, `MasterType`, `SonType`, `Param` e `Property` continua `UNVERIFIED` até revisar o dispatcher do cliente e o servidor. Uma tabela de recompensa da arena não demonstra que a arena inteira funciona. Tabelas geográficas com “city” no nome não são automaticamente cidades do jogo. Monstros, NPCs amigáveis e portais não são distinguidos por intuição ou somente pelo nome.

Referências conhecidas são ligadas por campos explícitos: `CampaignId`, `MapIds`, `PreCampaignId`, `NextCampaignId`, `NextNodeIds`, `PreNodeIds`, `MoveToNodeIds`, `MapId`, `MoveToMapId`, `MoveToNodeId`, `PhysicId`. Formatos desconhecidos e destinos ausentes são registrados. Ciclos podem representar portais de ida/volta e são apenas informações de investigação. O código do cliente recebe candidatos lexicais com offsets/hashes; esses candidatos não constituem execução comprovada.

## Validar um percurso observado

`validateWorldJourney({atlas,journey,bindings})` usa contratos explícitos para `entry`, `portal`, `exit`, `campaign-complete`, `battle` e `activity`. Cada binding inclui:

```json
{
  "schemaVersion":1,"id":"example.portal","kind":"portal",
  "fromMapId":2,"toMapId":3,"nodeId":20,"requireWin":false,"minLevel":5,
  "costs":[],"rewardDeltas":[],"responseOpcodes":[4130],
  "evidence":[{"path":"res/release/config/t_s_map-example.json","sha256":"HASH_REAL"}],
  "reviewed":true
}
```

IDs/opcodes desse exemplo são ilustrativos. `costs` e `rewardDeltas` aceitam `{resource,amount}` inteiros não negativos; nenhum custo ou recompensa é criado automaticamente. A revisão semântica do binding continua necessária: um hash de catálogo não prova sozinho o significado de uma regra.

`nodeKind` pode ser `node` (campanha) ou `mapnode` (cena). Se o mesmo ID numérico existir nos dois namespaces, a escolha fica `UNVERIFIED` até declarar esse campo; não se usa o último registro por acaso.

Cada passo de `journey.steps` tem `bindingId`, `operationId`, `before`, `after`, `outcome`, `responses`, `ui`, `persistence` e `trace.sha256`. `before/after` usam `mapId`, `level`, `resources`, `rewards` e `completedNodeIds` quando necessários. `ui` usa `mapId/loadingFinished`; `persistence` usa `mapId/relogin/resources`. `journey.identity` registra commit, ambiente `{name,kind}` e teste. Ausências ficam `UNVERIFIED`; diferenças observadas viram `FAIL`; `PASS_RECORDED` significa apenas consistência dos valores e referências registrados.

Portais intermediários devem alcançar sua cena exata, não uma cidade presumida. A volta à cidade após boss exige um contrato de conclusão distinto. Derrota não pode recém-marcar o nó do boss concluído nem conceder a recompensa de vitória. Repetir o mesmo `operationId` não pode debitar/conceder novamente. `MinLevel` explícito do catálogo não é enfraquecido pelo binding. Falta de S2C, carregamento da cena ou leitura após relogin impede passar como funcional.

## Diagnosticar flags de conclusão e carregamento eterno

`validateWorldProjection({atlas,projection})`, também aceito como `journey.projection`, compara:

- `authoritative.completedCampaignIds` com `ui.completedCampaignIds`;
- histórico opcional `history.verifiedWins:[{campaignId,artifactSha256}]`;
- fronteiras de entrada `entry:{campaignId,requestObserved,responseObserved,sceneLoaded,loadingTimeout}`.

Se a UI diz “Concluído”, mas o snapshot autoritativo não, há divergência de projeção. Se ambos dizem concluído, mas não foi fornecida prova de vitória, o histórico permanece `UNVERIFIED`; a ferramenta não apaga progresso nem inventa batalha. Contador `0/1` de tentativas nunca vira prova de conclusão. Para uma campanha que trava no carregamento, a primeira fronteira sem observação é indicada como `entry.request`, `entry.response` ou `entry.scene-load`; timeout explicitamente registrado pode demonstrar falha de carregamento.

Todas as funções são de análise de arquivos/dados. Não entram em mapas, não alteram contas, não concedem EXP, não executam SQL e não reiniciam o jogo.
