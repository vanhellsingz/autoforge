# AutoForge: mapas primeiro, aprendizado que permanece

Esta entrega acrescenta três capacidades ao conjunto existente: auditoria de mapas/fluxos, registro de capacidades por revisão e transferência de conhecimento para qualquer agente. Publicação autorizada na `main`; o servidor Wartune em execução não é alterado.

## 1. Auditoria abrangente de mapas

Gere o atlas atual, sem reutilizar uma análise antiga. Use os caminhos reais do checkout e do cliente disponível ao runner:

```powershell
node studio/gameplay/autoforge.mjs maps --client "C:\WartuneUltra\client-qa-java-v1" --backend "C:\WartuneUltra\java-main-release\java-v1" --out "C:\WartuneUltra\autoforge-map-snapshot-NOVO"
node studio/gameplay/autoforge.mjs map-audit --atlas "C:\WartuneUltra\autoforge-map-snapshot-NOVO\world-atlas.json" --manifest docs/examples/MAP_AUDIT_MANIFEST.json --client "C:\WartuneUltra\client-qa-java-v1" --backend "C:\WartuneUltra\java-main-release\java-v1" --backend-report "C:\WartuneUltra\autoforge-map-snapshot-NOVO\backend-analysis.json" --out "C:\WartuneUltra\autoforge-map-audit-NOVO"
```

Os caminhos são exemplos a conferir, não seleção automática do servidor ativo. No workspace Linux, forneça os caminhos do checkout e dos artefatos exportados. A ferramenta não abre navegador, executa SQL, instala software ou aciona workflows do jogo.

O relatório contém **cada registro** dos mapas, campanhas, nós e atividades selecionados no atlas; preserva namespaces, arquivos, hashes, referências, tipos não resolvidos, ciclos e lacunas. `coverageGaps` exige esclarecer requisitos/custos, monstros/NPCs, vitória/derrota, portais intermediários, saída final, EXP por encontro/recompensa final, quests, idempotência, UI e relogin. Não transforma um número de tipo em uma regra presumida. Um ciclo ou referência ausente é candidato de investigação, não bug confirmado. Famílias não descobertas pelo nome continuam explícitas na cobertura do atlas.

`backendCandidates` reaproveita o scanner existente com **arquivo, método, linhas e hashes**; são candidatos lexicais, não prova da ligação de runtime. O snapshot crítico é revalidado antes da auditoria. Alterar o Java ou seus catálogos exige regenerar o snapshot; trocar apenas o texto do commit no relatório não funciona.

O manifesto incluído registra os relatos de criação, Ibalize, arena, Worgs e Salão dos Heróis como **não verificados**. Não liga IDs por nome traduzido nem marca uma campanha concluída. Caso 121 de encantamento continua no módulo de quests: extrair o dispatcher da condição correta, o predicado e o evento de fortalecimento persistido; o número 17 de outro enum não substitui esse namespace.

### Evidência consumível e primeira fronteira ausente

Em `observations`, use descritores `{"path":"traces/ibalize.json","sha256":"64 caracteres hexadecimais minúsculos"}`. Passe `--evidence-root DIRETORIO_EXPORTADO`. Os caminhos são relativos a essa raiz, sem escapes, symlinks ou junctions; o arquivo é lido como JSON, limitado e conferido pelo SHA-256. Texto de log ou screenshot sozinho não é promovido a sucesso.

Formato de um arquivo de observação (valores de identidade devem ser reais):

```json
{
  "schemaVersion": 1,
  "caseId": "ibalize-interior-entry",
  "flow": "map-entry",
  "target": "campaign:1004",
  "identity": {
    "commit": "SHA_COMPLETO_DO_BACKEND",
    "testId": "TESTE_IDENTIFICADO",
    "environment": {"name":"runner-dev","kind":"RUNTIME"},
    "clientSourceDigest": "sourceDigest_DO_ATLAS",
    "backendSnapshotDigest": "DIGEST_CANONICO_DO_backend-analysis.snapshot"
  },
  "sessionId": "sessao-real",
  "requestId": "operacao-real",
  "events": [
    {"stage":"request","result":"passed","sessionId":"sessao-real","requestId":"operacao-real","at":"2026-11-06T12:00:00Z"},
    {"stage":"response","result":"passed","sessionId":"sessao-real","requestId":"operacao-real","at":"2026-11-06T12:00:01Z"},
    {"stage":"scene","result":"failed","sessionId":"sessao-real","requestId":"operacao-real","at":"2026-11-06T12:00:02Z"}
  ]
}
```

Calcule `backendSnapshotDigest` com a função exportada `digest` de `studio/learning/evidence.mjs` sobre o objeto `snapshot`. A auditoria devolve esse mesmo digest. Ele inclui a identidade do snapshot naquele ambiente; não substitui o hash do JAR implantado. Eventos devem ser extraídos de capturas/testes reais, com produtor/teste identificado; a ferramenta **não captura nem inventa esses eventos**. O Flight Recorder e o seguidor de logs existentes ajudam a coletar bytes. A associação dos bytes a essas etapas precisa de contrato/decoder revisado; quantidade de frames não basta.

Fluxos e etapas obrigatórias:

| Fluxo | Etapas em ordem |
| --- | --- |
| login | request, response, snapshot, ui, relogin |
| character-create | request, created, persisted, snapshot, ui, relogin |
| city / map-entry / portal | request, response, scene, ui, relogin |
| arena-battle | request, response, prepare, start, result, persisted, ui, relogin |
| blitz | request, response, started, result, persisted, confirm, ui, relogin |
| campaign-run | request, response, scene, boss-win, completion, reward, exit, persisted, ui, relogin |

Etapa ausente = `UNVERIFIED`; falha explicitamente registrada = `FAIL_RECORDED`. O relatório aponta a primeira fronteira ausente e as próximas verificações apropriadas. Eventos de outra sessão/pedido, desordenados, repetidos, com hash/commit/digest divergente não comprovam o fluxo. Entrada aprovada não comprova a campanha completa.

Para uma comparação antes/depois, forneça `baselines: [{"commit":"SHA_ANTIGO","artifact":{"path":"before.json","sha256":"HASH"}}]`. Só há `REGRESSION_RECORDED` se o mesmo caso, fluxo, destino e ambiente têm baseline positivo e falha no commit novo, com o mesmo cliente. Isso **não prova que a mudança de mapas causou a quebra de criação**. Sem baseline, apenas a falha atual é registrada.

Os cinco fluxos fundamentais são sempre exigidos: login, criação, cidade, entrada de mapa e batalha na arena. `FOUNDATION_RECORDED` ainda exige fontes e backend revalidados, cobertura não truncada e um ambiente consistente; não significa todos os mapas homologados ou autorização para deploy. `map-check` e `map-projection` existentes continuam validando portais/recompensas/derrotas e a diferença entre UI, estado autoritativo e histórico de vitórias.

### Fúria, baús, formação e reposição: verificador adicional

`studio/gameplay/battle-audit.mjs` acrescenta `battle-check`. Ele compara um contrato extraído/revisado com valores capturados; **não extrai sozinho a fórmula de Fúria nem altera BattleService**. O scanner do backend agora inclui `domains.battle` com métodos candidatos de Fúria, tropas, formação, drop, baús e Blitz. Leia cada método e seu consumidor real antes da correção.

```powershell
node studio/gameplay/autoforge.mjs battle-check --atlas world-atlas.json --contract battle-contract.json --observation battle-artifact-descriptor.json --evidence-root EVIDENCIAS --client CLIENTE --expected-commit SHA_COMPLETO --out RESULTADO_NOVO
```

`battle-artifact-descriptor.json` contém `path` relativo e `sha256` do JSON capturado. Para conferir também o checkout Java, forneça `--backend DIR --backend-report backend-analysis.json`; a observação precisa do `identity.backendSnapshotDigest` correspondente. Contrato:

```json
{
  "schemaVersion":1, "reviewed":true,
  "sources":[{"path":"res/release/config/ARQUIVO_REAL.json","sha256":"HASH_REAL"}],
  "rules":{
    "rage":{"expectedInitial":0,"cap":100,"skills":[{"skillId":1,"cost":20,"gain":0,"mode":"subtract-cost-add-gain-clamp"}]},
    "formation":{"heroSlot":2,"troopSlots":[0,1]},
    "troops":{"capacity":200,"autoRefill":true},
    "chests":{"mapKey":"campaign:10","allowedNodeKeys":["node:20"]}
  }
}
```

**Os números acima são da fixture dos testes, não regras descobertas do Wartune.** Preencher `expectedInitial` com base + bônus de conjuntos/passivas realmente ativos, extraídos do cliente com seus IDs e fontes. A capacidade também precisa ser derivada para aquele personagem; o verificador não escolhe 100 ou 200. `mode` só é aceito quando a ordem custo/ganho/clamp foi confirmada no dispatcher da skill; modificadores desconhecidos permanecem bloqueados. A formação representa os slots já mapeados a partir da seleção real; não assumir que índice de UI e posição de batalha são iguais. Nós de baú têm namespace e vínculo explícito com mapa/campanha.

O JSON de observação contém `identity` como no exemplo de fluxo, `mapKey`, `initialRage:{server,wire,ui}`, `skillActions:[{operationId,skillId,before,after,accepted}]`, `allies:[{kind:"hero"|"troop",slot,quantity}]`, `visibleChestNodeKeys` e:

```json
{"troops":{"before":{"deployed":200,"reserve":50,"capacity":200},"losses":3,"after":{"deployed":200,"reserve":47,"capacity":200},"relogin":{"deployed":200,"reserve":47,"capacity":200},"replayAfter":{"deployed":200,"reserve":47,"capacity":200}}}
```

No modelo de reposição explicitamente revisado, sobreviventes = destacados − baixas; reposição = mínimo entre vagas e reserva. Os testes cobrem conservação, reserva insuficiente, relogin e replay; reposição não significa somar a capacidade inteira novamente. Dois sprites não duplicam a população: a soma das quantidades por slot deve bater com as tropas destacadas. A lista de baús visíveis deve ser subconjunto dos nós autorizados para aquele mapa, não efeito automático de uma vitória. O print de Fúria 100/100 prova a apresentação; é necessário ler o saldo do servidor e o wire antes de afirmar que houve concessão real.

Para o Blitz: `started` não é `result`. Confira o relógio/tarefa/estado persistido e a mensagem que entrega o resultado; depois confira o predicado que habilita `Confirmar`, seu callback e a liberação do modal. A confirmação pode ser local: não invente um opcode nem uma resposta extra se o cliente não envia nada. O manifesto já inclui o relato de Platô Tribal sem presumir seu ID. Repetir confirmação/reconectar deve ser um cenário de idempotência de custos e recompensas no contrato real; esta auditoria não concede recompensas para destravar a tela.

## 2. Memória versionada com testes e aprovação

`studio/learning/registry.mjs` implementa o ciclo:

`candidate → tested → reviewed → approved → stable`

Uma revisão nova volta a `candidate` e descarta avaliação, revisão e aprovação anteriores. A memória aceita somente detectores declarativos de igualdade de sinais, não scripts ou patches executáveis. Cada capacidade contém `id`, `revision`, `domain`, `summary`, `symptoms`, `cause`, `fix`, `appliesTo`, `preserve`, `requiredTests`, `detectors` e `limits`.

Exemplo de proposta **a preencher após investigação**, não diagnóstico já comprovado:

```json
{
  "action":"propose", "id":"map.rejection-wait", "actor":"AUTOR_IDENTIFICADO", "at":"2026-11-06T12:00:00Z",
  "capability":{
    "id":"map.rejection-wait", "revision":1, "domain":"maps",
    "summary":"Falha de entrada deve liberar a espera do cliente",
    "symptoms":["Spinner após pedido de entrada"],
    "cause":"PREENCHER com a fronteira, arquivo/método e evidência da causa",
    "fix":"PREENCHER com o contrato e a correção validada",
    "appliesTo":{"backendCommit":"SHA_COMPLETO","sourceDigest":"HASH_ATLAS","sourceHashes":[{"path":"js/ARQUIVO_REAL.js","sha256":"HASH_ARQUIVO"}]},
    "preserve":["Criação de personagem e transações existentes","Recompensas e consumo idempotentes"],
    "requiredTests":["map.rejection-release"],
    "detectors":[{"signal":"map.spinner","equals":true}],
    "limits":["Aplicabilidade limitada ao snapshot e testes registrados"]
  }
}
```

```powershell
node studio/learning/autoforge.mjs record --registry "C:\WartuneUltra\autoforge-knowledge" --event propose.json --expected-version 0
node studio/learning/autoforge.mjs inspect --registry "C:\WartuneUltra\autoforge-knowledge" --out "C:\WartuneUltra\knowledge-inspection-NOVO"
```

Todo evento posterior tem `action`, `id`, `actor`, `at` e `capabilityDigest` calculado com `digest(capability)`. `evaluate` acrescenta `evaluation`; `review`, `approve` e `retire` exigem `note`. `revise` contém a capacidade completa com revisão incrementada em um. `promote` exige a aprovação atual. Cada chamada fornece a versão corrente via `--expected-version` e, para avaliar/promover, `--evidence-root`.

Avaliação:

```json
{
  "capabilityDigest":"HASH_DA_REVISAO",
  "evidence":[{
    "commit":"SHA_COMPLETO", "testId":"TESTE_REAL",
    "environment":{"name":"runner-dev","kind":"RUNTIME"}, "result":"passed",
    "artifacts":[{"path":"tests/report.json","sha256":"HASH_DOS_BYTES","format":"json-report"}]
  }]
}
```

O `report.json` segue o formato existente de `test-artifacts.mjs`: `schemaVersion:1`, `commit`, `testId`, `environment`, `result:"passed"` e `checks:[{"id":"...","result":"passed"}]`; acrescente `capabilityDigest` e `clientSourceDigest`. Inclua todos os testes específicos **e** `regression.login`, `regression.character-create`, `regression.city`, `regression.map-entry`, `regression.arena-battle`. Evidência `kind:runtime` exige também os campos `deployment` de commit/JAR já validados pelo verificador existente. Os testes podem usar fixtures, mas devem declarar `kind:UNIT_TEST`; isso não é homologação do jogo. Não renomear um teste unitário como teste de runtime.

O ledger é composto de arquivos numerados, exclusivos e ligados por hashes. Escritores concorrentes recebem erro de versão/arquivo existente; nenhum evento é sobrescrito. Alterações acidentais na cadeia são detectadas. **Não é assinatura digital, autenticação nem controle de acesso**: quem possui escrita pode fabricar registros. A aprovação é um evento explícito de um revisor identificado; a ferramenta não atesta a autoridade desse ator. Revise por seu processo de trabalho antes de usar uma capacidade na versão estável. Os artefatos são reabertos na promoção e na consulta.

## 3. Conhecimento transferível para o Arena e outras IAs

Crie `context.json` com `backendCommit`, `sourceDigest`, `sourceHashes:[{"path":"...","sha256":"..."}]`, `signals:{"map.spinner":true}` e, opcionalmente, `domain:"maps"`. Use hashes extraídos da análise atual, não copiados de uma lição antiga.

```powershell
node studio/learning/autoforge.mjs capsule --registry "C:\WartuneUltra\autoforge-knowledge" --context context.json --evidence-root "C:\WartuneUltra\autoforge-evidence" --out "C:\WartuneUltra\pacote-arena-NOVO"
```

Saem `agent-capsule.json` e `PROMPT_AGENTE.md`: causa registrada, orientação, fontes, testes, contratos a preservar, revisão/aprovação, evidências e bloqueios. Só capacidades estáveis, aplicáveis ao commit/fontes e com artefatos íntegros entram em `matches`. Drafts, drift e arquivos ausentes são bloqueados; correções conflitantes para os mesmos detectores exigem revisão. Não há IA embutida, aplicação de patch, SQL ou deploy: o conhecimento permanece em arquivos portáteis, independente do agente.

SHA e identidade conferidos estabelecem consistência dos resultados **registrados**, não a verdade independente de um teste externo. Um relato, código candidato, teste unitário ou sucesso em branch antiga não vira comprovação da versão implantada.

## Prompt pronto para o Arena

> Use a main atual de vanhellsingz/autoforge. Comece por docs/MAP_AUDIT_MEMORY.md e gere um atlas/snapshot novo do cliente e backend exatos; não reutilize a análise antiga. Execute map-audit com o manifesto de relatos. Priorize criação de personagem, entrada em Ibalize Interior e prepare/start da arena. Separe clique/C2S, decoder/handler, transação, S2C, cena, UI e relogin. Correlacione sessão/pedido e registre artefatos reais por commit, ambiente, teste e hash. Use map-check para portais intermediários e conclusão/retorno final, map-projection para UI vs estado/histórico, e quest-check para a missão de encantamento no namespace correto. Use battle-check para Fúria servidor/wire/UI, slots de herói e das duas pilhas de tropas, capacidade derivada, baixas, reserva/reposição e baús pertencentes ao mapa. Extraia os contratos do cliente; não use os valores da fixture como regras do jogo. Para Blitz, identifique a primeira fronteira ausente entre started/result/persisted/confirm/ui, com a semântica real do callback. Falta de resposta deve ser investigada na primeira fronteira ausente, sem presumir vitória ou rede instável. Não derive conclusão de nível ou tentativas. Preserve codecs, contas, transações, custos, recompensas idempotentes e todas as funcionalidades já comprovadas. Não reescreva sistemas só porque o scanner lexical não encontrou um método. Depois de corrigir e validar, registre uma capacidade candidata com fontes e limites, anexe testes específicos e os cinco fluxos fundamentais, submeta a revisão e aprovação explícitas e só então promova. Gere o pacote para o próximo agente. Não confunda o inventário da ferramenta com mapas implementados nem uma captura antiga com prova do servidor atual. Nenhum comando desta entrega autoriza reinício, migração ou deploy do jogo.
