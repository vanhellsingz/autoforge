# Três módulos: missões, mapas/atividades e lojas

Esta entrega continua em `feature/items-logs-intelligence`, junto das cinco funções anteriores. Nenhuma alteração é aplicada à main nem ao servidor do jogo. As ferramentas geram atlas, diagnósticos, contratos de validação e referências do backend para o Arena implementar com evidências.

```powershell
node studio/gameplay/autoforge.mjs all --client C:\xampp\htdocs --backend C:\CHECKOUT_ATUAL\java-v1 --out C:\ENTREGAS\gameplay-001
```

Use o checkout real do Arena e uma saída nova fora das fontes. O backend é opcional e somente leitura. A entrega contém `quest-atlas.json`, `world-atlas.json`, `shop-atlas.json`, `gameplay-report.json`, `COMECE_AQUI.md` e, quando solicitado, `backend-analysis.json`. Este último registra commit, alterações locais, métodos/assinaturas/linhas/hashes e migrations existentes. Referências lexicais não comprovam chamadas em runtime. O snapshot é rechecado durante a análise.

## 1. Missões e evoluções

O atlas cobre missões principais, condições, recompensas e famílias auxiliares de tarefas/evolução/upgrade. Preserva tudo que foi lido e registra limites, ciclos e referências ausentes. Auxiliar de evolução não é presumido como missão executável.

**Achado específico:** no cliente consultado a quest **121, Encantamento de Equipamento**, tem `CondictionType=17`, `Para1=3`, `Para2=1`. Outro namespace usa o mesmo17 para `KILLPETMONSTER`. O atlas registra essa colisão e aponta o dispatcher principal `Fk`/ramo17 (`checkCount`). Não se deve aplicar o enum genérico à missão principal.

O diagnóstico compara evento, entidade/nível antes e depois, contador persistido, S2C, UI e relogin. Um item que já estava +3 não vira um novo evento de encantamento. Uma regra de estado pode reconhecer +3 existente somente se esse comportamento estiver comprovado no dispatcher e ligado por contrato revisado. Nível de aceite (`NeedMinLevel`) não é o objetivo da missão.

```powershell
node studio/gameplay/autoforge.mjs quest-check --atlas C:\ENTREGAS\gameplay-001\quest-atlas.json --quest-id 121 --bindings regras-quest.json --evidence antes-depois-quest.json --client C:\xampp\htdocs --out C:\ENTREGAS\quest-121
```

Leia [o schema e as etapas de implementação](GAMEPLAY_QUESTS.md). O diagnóstico não conclui a missão nem concede recompensas: identifica a primeira fronteira inconsistente ou ainda sem evidência.

## 2. Mapas, campanhas, cidades e atividades

São inventariados mapas, campanhas, nós, portais, spawns/monstros e famílias de arena, salão, labirinto, catacumbas, cidades externas e outras atividades reconhecidas nos catálogos. Tipos desconhecidos e famílias com nomes não reconhecidos não são inventados; consulte `availableTables`, os campos originais e candidatos do código. Cobertura completa do escopo não significa todos os mapas implementados.

Há verificações separadas para percurso e projeção do estado:

```powershell
node studio/gameplay/autoforge.mjs map-check --atlas C:\ENTREGAS\gameplay-001\world-atlas.json --journey percurso.json --bindings transicoes-revisadas.json --client C:\xampp\htdocs --out C:\ENTREGAS\percurso-001
node studio/gameplay/autoforge.mjs map-projection --atlas C:\ENTREGAS\gameplay-001\world-atlas.json --projection tela-vs-estado.json --out C:\ENTREGAS\projecao-001
```

O percurso diferencia portal intermediário de conclusão final/retorno à cidade. Vitória, derrota, custo, recompensa única, atualização de tela e relogin são conferidos conforme contratos explícitos. Dois namespaces podem usar o mesmo nodeId: declare `nodeKind` quando necessário.

### Casos enviados pelo usuário

Os exemplos abaixo são relatos/screenshots, não execução de teste nesta entrega:

| Caso | Referência do cliente consultado | Investigação |
|---|---|---|
| Covil dos Worgs jogado, UI não conclui | CampaignId1001, nível5–7 | Vitória → finalização da run → persistência de conclusão → S2C de lista → UI → relogin |
| Exterior funciona, Interior carrega para sempre | Exterior1003 → Interior1004, nível11–13 | Pré-requisito1003, custo/energia, C2S aceito, resposta, map/spawn/nós e fim do loading; não substituir destino desconhecido pelo mapa inicial |
| Salão mostra concluído sem acesso | Floresta do Submundo, CampaignId9000, nível20–25 | Comparar completed flags do estado autoritativo com UI/histórico de vitórias; tentativas0/1 não equivalem a conclusão |
| Encantamento+3 não conclui quest | Quest121/condição17 | Provar se a regra exige estado, incremento ou contagem e localizar a primeira divergência entre equipamento e contador |

Esses IDs pertencem ao snapshot consultado: sempre confira hashes/nomes na sua execução. `MapIds` vazio não autoriza criar relação, spawn ou retorno por intuição. Uma UI exibindo “Concluído” sem vitória registrada fica sem comprovação; divergência entre a projeção e um estado autoritativo fornecido é reportada separadamente. Nenhum desses diagnósticos reseta o personagem.

Leia [mapas, bindings e evidências](GAMEPLAY_WORLD.md).

## 3. Todas as famílias de lojas encontradas

O atlas descobre lojas comuns, lojas por tipo, desejos, cidades externas, céu, navegação, atividades e trocas, incluindo configurações relacionadas. Configuração de RNG ou rotação não vira oferta comprável só por existir. Cada oferta candidata tem ID composto, campos originais, item/recompensa, custos e limites candidatos com fonte/hash/rowKey.

```powershell
node studio/gameplay/autoforge.mjs shop-check --atlas C:\ENTREGAS\gameplay-001\shop-atlas.json --purchase compra-revisada.json --client C:\xampp\htdocs --out C:\ENTREGAS\compra-001
```

O contrato precisa mapear todas as moedas/itens consumidos e modificadores ativos. O módulo calcula uma cópia do próximo estado, verifica insuficiência simultânea, estoque/limites atuais, elegibilidade, overflow e repetição. Recompensa não pode financiar o próprio custo. Compra gratuita só é aceita por regra explícita. Descontos, probabilidades e códigos de moeda desconhecidos bloqueiam o plano.

Leia [contratos de compra e integração MariaDB](GAMEPLAY_SHOPS.md). Um plano calculado não compra itens nem prova uma transação real; débito/concessão/estoque/limite/recibo precisam de commit atômico no backend existente.

## Evidências e integração pelo Arena

Use o Flight Recorder/coletor de logs já disponíveis nesta branch para obter ações e respostas; registre também snapshots de estado e readback após relogin. Os validadores verificam consistência de registros e contratos fornecidos; hashes e campos `reviewed` não autenticam a execução real. Sem prova suficiente o estado continua UNVERIFIED.

Para impedir uso de referências antigas nas verificações, acrescente `--backend JAVA_DIR --backend-report backend-analysis.json`. Se código, migration, painel ou commit crítico mudaram, o snapshot é recusado. Refaça a análise no checkout novo.

### Prompt para o Arena

> Continue usando feature/items-logs-intelligence do AutoForge. Leia docs/GAMEPLAY_START.md e gere all no cliente e checkout atuais. Priorize quest121, conclusão do1001, entrada1003→1004 e projeção do9000. Não use enums de outro namespace nem flags/tentativas como prova de conclusão. Capture a ação e compare mutação, contador/run, transação, S2C, UI e relogin. Use os métodos/hashes do backend-analysis.json, preserve sistemas existentes e replante o snapshot se mudar. Para cada família de missão/evolução/mapa/loja, recupere os contratos desconhecidos antes de implementar. Compras devem debitar todas as moedas/itens, validar limites e conceder recompensa atomicamente. Não conceda progresso/recompensas por suposição nem reinicie serviços por causa da ferramenta. Não faça merge na main sem instrução do usuário.
