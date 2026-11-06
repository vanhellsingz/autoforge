# Missões, condições e evoluções: evidência antes de implementação

`buildQuestAtlas({client,...limits})` indexa os catálogos cujo nome pertence às famílias quest/task/evolution/transfer/transjob/rebirth/reincarn/advance/upgrade. As três tabelas principais são separadas explicitamente: `t_s_questtemplate`, `t_s_questcondiction` (grafia original) e `t_s_questgood`. As outras famílias permanecem com suas linhas, fontes e hashes como candidatas de tarefas/evoluções, sem presumir que uma tabela de upgrade seja uma missão executável.

Cada quest conserva os campos originais, condições, recompensas de itens e referências de pré-requisito. O grafo apresenta ciclos, destinos ausentes e expressões não interpretadas. Uma referência `PreQuestId` não estabelece por si só regras AND/OR, aceite, recompensa, repetição ou reset diário. O relatório de cobertura apresenta os limites e tabelas obrigatórias ausentes.

## Achado concreto: a missão de encantar

No cliente consultado, a quest **121**, `Encantamento de Equipamento`, usa `CondictionType=17`, `Para1="3"` e `Para2=1`. Ao mesmo tempo, um enum `hc` de outro namespace contém `STRENGTHEN=2` e `KILLPETMONSTER=17`. Reutilizar esse enum para nomear condições de missões principais produziria uma regra incorreta.

O atlas preserva ambos os fatos e seus hashes/offsets, sem misturá-los. A busca no cliente encontra o dispatcher da classe ofuscada `Fk`, com `case 17` no ramo que usa `checkCount`. Isso é um ponto de investigação concreto; não prova sozinho qual evento Java deve incrementar o contador nem como o servidor original trata todas as condições.

## Diagnóstico de progresso registrado

API: `diagnoseQuest({atlas,questId,bindings:[],evidence,client?})`.

Uma binding revisada tem:

```json
{
  "conditionType":17,
  "mode":"count",
  "projection":"equipment",
  "field":"strengthenGrade",
  "operator":"gte",
  "target":{"parameter":"Para1"},
  "required":{"parameter":"Para2"},
  "event":"equipment.enchanted",
  "mutation":"increase",
  "reviewed":true,
  "sourceRefs":[{"path":"res/release/config/t_s_questcondiction-BUILD.json","sha256":"HASH_REAL"},{"path":"js/bundle_release-BUILD.js","sha256":"HASH_REAL"}],
  "dispatcherId":"ID_REAL_DO_ATLAS"
}
```

O exemplo descreve uma gramática, não autoriza afirmar que essa binding já foi homologada no Wartune. O contrato precisa referenciar a condição e o dispatcher numérico observados no mesmo snapshot. Valores da condição são resolvidos diretamente de `Para1..4`; constantes inteiras também são possíveis quando revisadas. O modo `count` exige nome exato do evento, mutação explícita e IDs de sessão/request para deduplicação. O modo `state` verifica o estado existente; `delta` compara o mesmo identificador antes/depois. Projeções aceitas: equipment, character, skills, mounts, pets e troops. Não há eval, SQL ou tradução arbitrária de fórmulas.

`evidence` contém `identity:{commit,environment:{name,kind},testId}`, `before`, `after`, `events` e `stages`. As projeções têm identificadores estáveis: `instanceId`, `itemId`, `characterId`, `id` ou `templateId`. Os snapshots de contador usam `quest:{questId,conditions:[{conditionId,progress}]}`. Eventos de contagem precisam de `event`, `success:true`, identidade da entidade, `sessionId` e `requestId`. As etapas `s2c`, `ui` e `relogin` devem declarar `observed:true` e o progresso lido.

Se uma operação registrada altera equipamento de +2 para +3 e o contador continua zero, o relatório aponta `questCounter` como primeira fronteira divergente. Se o item já estava +3 e não ocorreu um novo evento, o modo de contagem não concede progresso. Uma regra de estado pode considerar o +3 existente somente quando essa semântica foi explicitamente revisada. Ter nível suficiente para aceitar a missão (`NeedMinLevel`) não é tratado como comprovação do objetivo.

Resultados possíveis: `UNVERIFIED`, `DIVERGENT_RECORDED` e `CONSISTENT_RECORDED`. O último verifica a consistência dos registros fornecidos; não autentica a execução, não conclui missão, não concede recompensa e não substitui captura real, persistência, UI, novo login e verificação de idempotência das recompensas.

## Implementação pelo Arena

1. Gere o atlas sobre o cliente atual e confira commit/backend/hashes.
2. Separe o namespace da missão principal dos enums de tarefas circulares ou recompensas.
3. Observe a mutação confirmada e persistida; registre equipamento/nível/skill antes e depois.
4. Localize no backend o evento que precisa atualizar a condição e confira seus parâmetros contra o catálogo.
5. Persista o contador uma única vez e use a atualização S2C já esperada pela interface.
6. Confirme o contador na UI e após relogin. Recompensa e evolução de missão precisam de transação/idempotência próprias.

Nenhum desses passos é executado automaticamente por este módulo. Famílias desconhecidas, condições sem binding, fontes desatualizadas e evidências incompletas ficam explícitas para o Arena investigar.
