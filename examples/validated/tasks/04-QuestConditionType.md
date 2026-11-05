# 04 — Vocabulário de condições de missão

Estado: TO_IMPLEMENT. Referências de código são pontos de investigação, não prova de integração.

## Classe e evidência

- generated/QuestConditionType.java
- quest-conditions.evidence.json

Métodos gerados:

```java
public static Optional<QuestConditionType> of(int id) {
```

## Referências encontradas

- Nenhum ponto localizado. Pesquisar o serviço correspondente antes de editar.

## Candidatos de serviço

- apps/game-server/src/main/java/com/wartuneultra/server/gameplay/CampaignRunService.java:26 — candidate_class — SHA256 7972ffbd236728f2146418dd21c4324e5a71a7abdaeb0da243e2423f79a98215
  `public class CampaignRunService {`
- apps/game-server/src/main/java/com/wartuneultra/server/login/GameLoginHandler.java:1150 — candidate — SHA256 874b428ca71b3aecc934460d5a1c5dbb3b0d41ed3510527ffdc06e4a60d4d639
  `var quests = progression.syncQuests(character.characterId(), character.grade());`
- apps/game-server/src/main/java/com/wartuneultra/server/login/GameLoginHandler.java:1726 — candidate — SHA256 874b428ca71b3aecc934460d5a1c5dbb3b0d41ed3510527ffdc06e4a60d4d639
  `var questState = progression.syncQuests(character.characterId(), character.grade());`
- apps/game-server/src/main/java/com/wartuneultra/server/login/GameLoginHandler.java:2137 — candidate — SHA256 874b428ca71b3aecc934460d5a1c5dbb3b0d41ed3510527ffdc06e4a60d4d639
  `var questState = progression.syncQuests(character.characterId(), character.grade());`
- apps/game-server/src/main/java/com/wartuneultra/server/login/GameLoginHandler.java:2471 — candidate — SHA256 874b428ca71b3aecc934460d5a1c5dbb3b0d41ed3510527ffdc06e4a60d4d639
  `var quests = progression.syncQuests(character.characterId(), character.grade());`
- apps/game-server/src/main/java/com/wartuneultra/server/tutorial/TutorialService.java:43 — candidate_class — SHA256 0b4460cb0454d42fbe8856f4c3e670270b405fe72442c397cd3adb9b429913a0
  `public class TutorialService {`

## Implementação em ordem

1. Comparar com implementações existentes; preservar métodos equivalentes corretos e evitar duplicação de sistemas ou bônus.
2. O enum recupera nomes/IDs; não avalia condições.
3. IDs desconhecidos e Para1..Para4 precisam de evidência no dispatcher específico.
4. Não marcar quest concluída só porque seu tipo foi nomeado; confirmar evento, quantidade, recompensa e persistência.

## Aceitação

- [ ] tipo desconhecido não concede recompensa
- [ ] evento correto atualiza apenas a condição correspondente
- [ ] conclusão/recompensa idempotente após relogin

## Lacunas declaradas pela extração

- The semantics of Para1..Para4 are per-type and are not extracted yet; only the type vocabulary is anchored here.
- 67 CondictionType value(s) used by the catalogue have no name in the client enum and stay unsupported until their dispatcher case is found.
- No condition is evaluated by this adapter: the engine that consumes the vocabulary is a separate change.

## Commit e estado existente

```json
{
  "analysis": {
    "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
    "dirty": false,
    "provenanceStatus": "VERSIONED",
    "scope": "Tracked and untracked non-ignored files within backend; target/node_modules/dist excluded. No file contents are read by Git status."
  },
  "implementation": {
    "status": "unverified",
    "evidenceScope": "STATIC_ONLY",
    "reason": "Referências, migrations e fórmulas não comprovam a funcionalidade no jogo. Anexar avaliação com commit, hashes e evidências."
  }
}
```

## Arquivo e método exatos resolvidos

```json
[
  {
    "path": "apps/game-server/src/main/java/com/wartuneultra/server/login/GameLoginHandler.java",
    "method": "handleCampaignExit",
    "signature": "private List<OutgoingMessage> handleCampaignExit(Frame frame, ConnectionState state)",
    "startLine": 1139,
    "endLine": 1162,
    "sha256": "874b428ca71b3aecc934460d5a1c5dbb3b0d41ed3510527ffdc06e4a60d4d639",
    "bodySha256": "0cde345f9b4e4151c0ea8075ac26cdd9ed570dc6e07c72595a364d3f670a739e",
    "evidenceContext": {
      "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
      "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
      "testId": "integration-contracts.mjs",
      "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
      "scope": "STATIC_EXTRACTION_NOT_LIVE"
    }
  },
  {
    "path": "apps/game-server/src/main/java/com/wartuneultra/server/login/GameLoginHandler.java",
    "method": "handleBuildingInit",
    "signature": "private List<OutgoingMessage> handleBuildingInit(Frame frame, ConnectionState state)",
    "startLine": 1699,
    "endLine": 1779,
    "sha256": "874b428ca71b3aecc934460d5a1c5dbb3b0d41ed3510527ffdc06e4a60d4d639",
    "bodySha256": "722f988b66e89c1346f44a8bcd8c1035fdab999f66086a60fcb7c6dd3d6ca743",
    "evidenceContext": {
      "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
      "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
      "testId": "integration-contracts.mjs",
      "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
      "scope": "STATIC_EXTRACTION_NOT_LIVE"
    }
  },
  {
    "path": "apps/game-server/src/main/java/com/wartuneultra/server/login/GameLoginHandler.java",
    "method": "handleWorldRequest",
    "signature": "private List<OutgoingMessage> handleWorldRequest(Frame frame, ConnectionState state) throws ProtocolException",
    "startLine": 2045,
    "endLine": 2148,
    "sha256": "874b428ca71b3aecc934460d5a1c5dbb3b0d41ed3510527ffdc06e4a60d4d639",
    "bodySha256": "e5ebfcc76d8c2e1eb3cf183f002b3e015452f9deef975e52f04957ee02603f6c",
    "evidenceContext": {
      "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
      "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
      "testId": "integration-contracts.mjs",
      "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
      "scope": "STATIC_EXTRACTION_NOT_LIVE"
    }
  },
  {
    "path": "apps/game-server/src/main/java/com/wartuneultra/server/login/GameLoginHandler.java",
    "method": "bagResponses",
    "signature": "private List<OutgoingMessage> bagResponses(Frame frame, ConnectionState state, BagService.Outcome outcome) throws ProtocolException",
    "startLine": 2432,
    "endLine": 2507,
    "sha256": "874b428ca71b3aecc934460d5a1c5dbb3b0d41ed3510527ffdc06e4a60d4d639",
    "bodySha256": "0771fabc3f129e7fd2b315ae706ce0fb78efca715976d6072c12481ade636417",
    "evidenceContext": {
      "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
      "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
      "testId": "integration-contracts.mjs",
      "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
      "scope": "STATIC_EXTRACTION_NOT_LIVE"
    }
  }
]
```

## Dependências MySQL, painel, handlers e protocolo

```json
{
  "mysql": {
    "liveSchema": "NOT_QUERIED",
    "tables": [
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/battle/TutorialBattleRewards.java",
        "line": 56,
        "sha256": "fc2b117dfd2365c76fc9a1c3debffbfb9e58ff767181989f674763ea107285d1",
        "kind": "sql_literal_reference",
        "snippet": "int inserted = jdbc.sql(\"INSERT IGNORE INTO tutorial_battle_rewards \"",
        "table": "tutorial_battle_rewards",
        "operation": "INSERT IGNORE INTO",
        "authority": "STATIC_SQL_LITERAL",
        "relation": "SAME_CANDIDATE_SERVICE_FILE_NOT_PROVEN_RULE_PATH",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/battle/TutorialBattleRewards.java",
        "line": 80,
        "sha256": "fc2b117dfd2365c76fc9a1c3debffbfb9e58ff767181989f674763ea107285d1",
        "kind": "sql_literal_reference",
        "snippet": "int changed = jdbc.sql(\"UPDATE characters SET grade = ?, gp = ? WHERE character_id = ?\")",
        "table": "characters",
        "operation": "UPDATE",
        "authority": "STATIC_SQL_LITERAL",
        "relation": "SAME_CANDIDATE_SERVICE_FILE_NOT_PROVEN_RULE_PATH",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/battle/TutorialBattleRewards.java",
        "line": 94,
        "sha256": "fc2b117dfd2365c76fc9a1c3debffbfb9e58ff767181989f674763ea107285d1",
        "kind": "sql_literal_reference",
        "snippet": "return jdbc.sql(\"SELECT grade, gp FROM characters WHERE character_id = ? FOR UPDATE\")",
        "table": "characters",
        "operation": "FROM",
        "authority": "STATIC_SQL_LITERAL",
        "relation": "SAME_CANDIDATE_SERVICE_FILE_NOT_PROVEN_RULE_PATH",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/gameplay/CampaignRunService.java",
        "line": 85,
        "sha256": "7972ffbd236728f2146418dd21c4324e5a71a7abdaeb0da243e2423f79a98215",
        "kind": "sql_literal_reference",
        "snippet": "+ \"FROM campaign_active a JOIN campaign_runs r ON r.run_id = a.run_id \"",
        "table": "campaign_active",
        "operation": "FROM",
        "authority": "STATIC_SQL_LITERAL",
        "relation": "SAME_CANDIDATE_SERVICE_FILE_NOT_PROVEN_RULE_PATH",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/gameplay/CampaignRunService.java",
        "line": 85,
        "sha256": "7972ffbd236728f2146418dd21c4324e5a71a7abdaeb0da243e2423f79a98215",
        "kind": "sql_literal_reference",
        "snippet": "+ \"FROM campaign_active a JOIN campaign_runs r ON r.run_id = a.run_id \"",
        "table": "campaign_runs",
        "operation": "JOIN",
        "authority": "STATIC_SQL_LITERAL",
        "relation": "SAME_CANDIDATE_SERVICE_FILE_NOT_PROVEN_RULE_PATH",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/gameplay/CampaignRunService.java",
        "line": 94,
        "sha256": "7972ffbd236728f2146418dd21c4324e5a71a7abdaeb0da243e2423f79a98215",
        "kind": "sql_literal_reference",
        "snippet": "int grade = jdbc.sql(\"SELECT grade FROM characters WHERE character_id = ? FOR UPDATE\")",
        "table": "characters",
        "operation": "FROM",
        "authority": "STATIC_SQL_LITERAL",
        "relation": "SAME_CANDIDATE_SERVICE_FILE_NOT_PROVEN_RULE_PATH",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/gameplay/CampaignRunService.java",
        "line": 111,
        "sha256": "7972ffbd236728f2146418dd21c4324e5a71a7abdaeb0da243e2423f79a98215",
        "kind": "sql_literal_reference",
        "snippet": "if (predecessor > 0 && jdbc.sql(\"SELECT 1 FROM campaign_progress WHERE character_id = ? \"",
        "table": "campaign_progress",
        "operation": "FROM",
        "authority": "STATIC_SQL_LITERAL",
        "relation": "SAME_CANDIDATE_SERVICE_FILE_NOT_PROVEN_RULE_PATH",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/gameplay/CampaignRunService.java",
        "line": 126,
        "sha256": "7972ffbd236728f2146418dd21c4324e5a71a7abdaeb0da243e2423f79a98215",
        "kind": "sql_literal_reference",
        "snippet": "jdbc.sql(\"UPDATE campaign_runs SET status = 'ABANDONED', finished_at = CURRENT_TIMESTAMP(3) \"",
        "table": "campaign_runs",
        "operation": "UPDATE",
        "authority": "STATIC_SQL_LITERAL",
        "relation": "SAME_CANDIDATE_SERVICE_FILE_NOT_PROVEN_RULE_PATH",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/gameplay/CampaignRunService.java",
        "line": 128,
        "sha256": "7972ffbd236728f2146418dd21c4324e5a71a7abdaeb0da243e2423f79a98215",
        "kind": "sql_literal_reference",
        "snippet": "jdbc.sql(\"DELETE FROM campaign_active WHERE character_id = ?\").param(characterId).update();",
        "table": "campaign_active",
        "operation": "DELETE FROM",
        "authority": "STATIC_SQL_LITERAL",
        "relation": "SAME_CANDIDATE_SERVICE_FILE_NOT_PROVEN_RULE_PATH",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/gameplay/CampaignRunService.java",
        "line": 130,
        "sha256": "7972ffbd236728f2146418dd21c4324e5a71a7abdaeb0da243e2423f79a98215",
        "kind": "sql_literal_reference",
        "snippet": "jdbc.sql(\"INSERT INTO campaign_runs (character_id, campaign_id, map_id, pos_x, pos_y) \"",
        "table": "campaign_runs",
        "operation": "INSERT INTO",
        "authority": "STATIC_SQL_LITERAL",
        "relation": "SAME_CANDIDATE_SERVICE_FILE_NOT_PROVEN_RULE_PATH",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/gameplay/CampaignRunService.java",
        "line": 134,
        "sha256": "7972ffbd236728f2146418dd21c4324e5a71a7abdaeb0da243e2423f79a98215",
        "kind": "sql_literal_reference",
        "snippet": "jdbc.sql(\"INSERT INTO campaign_active (character_id, run_id) VALUES (?, ?)\")",
        "table": "campaign_active",
        "operation": "INSERT INTO",
        "authority": "STATIC_SQL_LITERAL",
        "relation": "SAME_CANDIDATE_SERVICE_FILE_NOT_PROVEN_RULE_PATH",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/gameplay/CampaignRunService.java",
        "line": 165,
        "sha256": "7972ffbd236728f2146418dd21c4324e5a71a7abdaeb0da243e2423f79a98215",
        "kind": "sql_literal_reference",
        "snippet": "if (type == 53 || type == 61) jdbc.sql(\"INSERT IGNORE INTO campaign_run_nodes (run_id, node_id) VALUES (?, ?)\")",
        "table": "campaign_run_nodes",
        "operation": "INSERT IGNORE INTO",
        "authority": "STATIC_SQL_LITERAL",
        "relation": "SAME_CANDIDATE_SERVICE_FILE_NOT_PROVEN_RULE_PATH",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/gameplay/CampaignRunService.java",
        "line": 209,
        "sha256": "7972ffbd236728f2146418dd21c4324e5a71a7abdaeb0da243e2423f79a98215",
        "kind": "sql_literal_reference",
        "snippet": "jdbc.sql(\"UPDATE campaign_runs SET map_id = ?, pos_x = ?, pos_y = ? WHERE run_id = ?\")",
        "table": "campaign_runs",
        "operation": "UPDATE",
        "authority": "STATIC_SQL_LITERAL",
        "relation": "SAME_CANDIDATE_SERVICE_FILE_NOT_PROVEN_RULE_PATH",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/gameplay/CampaignRunService.java",
        "line": 219,
        "sha256": "7972ffbd236728f2146418dd21c4324e5a71a7abdaeb0da243e2423f79a98215",
        "kind": "sql_literal_reference",
        "snippet": "int grade = jdbc.sql(\"SELECT grade FROM characters WHERE character_id = ? FOR UPDATE\")",
        "table": "characters",
        "operation": "FROM",
        "authority": "STATIC_SQL_LITERAL",
        "relation": "SAME_CANDIDATE_SERVICE_FILE_NOT_PROVEN_RULE_PATH",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/gameplay/CampaignRunService.java",
        "line": 237,
        "sha256": "7972ffbd236728f2146418dd21c4324e5a71a7abdaeb0da243e2423f79a98215",
        "kind": "sql_literal_reference",
        "snippet": "int inserted = jdbc.sql(\"INSERT IGNORE INTO campaign_run_nodes \"",
        "table": "campaign_run_nodes",
        "operation": "INSERT IGNORE INTO",
        "authority": "STATIC_SQL_LITERAL",
        "relation": "SAME_CANDIDATE_SERVICE_FILE_NOT_PROVEN_RULE_PATH",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/gameplay/CampaignRunService.java",
        "line": 242,
        "sha256": "7972ffbd236728f2146418dd21c4324e5a71a7abdaeb0da243e2423f79a98215",
        "kind": "sql_literal_reference",
        "snippet": "long gp = jdbc.sql(\"SELECT gp FROM characters WHERE character_id = ?\")",
        "table": "characters",
        "operation": "FROM",
        "authority": "STATIC_SQL_LITERAL",
        "relation": "SAME_CANDIDATE_SERVICE_FILE_NOT_PROVEN_RULE_PATH",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/gameplay/CampaignRunService.java",
        "line": 249,
        "sha256": "7972ffbd236728f2146418dd21c4324e5a71a7abdaeb0da243e2423f79a98215",
        "kind": "sql_literal_reference",
        "snippet": "jdbc.sql(\"UPDATE characters SET grade = ?, gp = ? WHERE character_id = ?\")",
        "table": "characters",
        "operation": "UPDATE",
        "authority": "STATIC_SQL_LITERAL",
        "relation": "SAME_CANDIDATE_SERVICE_FILE_NOT_PROVEN_RULE_PATH",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/gameplay/CampaignRunService.java",
        "line": 253,
        "sha256": "7972ffbd236728f2146418dd21c4324e5a71a7abdaeb0da243e2423f79a98215",
        "kind": "sql_literal_reference",
        "snippet": "jdbc.sql(\"UPDATE campaign_runs SET completed = 1 WHERE run_id = ?\")",
        "table": "campaign_runs",
        "operation": "UPDATE",
        "authority": "STATIC_SQL_LITERAL",
        "relation": "SAME_CANDIDATE_SERVICE_FILE_NOT_PROVEN_RULE_PATH",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/gameplay/CampaignRunService.java",
        "line": 255,
        "sha256": "7972ffbd236728f2146418dd21c4324e5a71a7abdaeb0da243e2423f79a98215",
        "kind": "sql_literal_reference",
        "snippet": "jdbc.sql(\"INSERT INTO campaign_progress (character_id, campaign_id) VALUES (?, ?) \"",
        "table": "campaign_progress",
        "operation": "INSERT INTO",
        "authority": "STATIC_SQL_LITERAL",
        "relation": "SAME_CANDIDATE_SERVICE_FILE_NOT_PROVEN_RULE_PATH",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/gameplay/CampaignRunService.java",
        "line": 266,
        "sha256": "7972ffbd236728f2146418dd21c4324e5a71a7abdaeb0da243e2423f79a98215",
        "kind": "sql_literal_reference",
        "snippet": "boolean completed = jdbc.sql(\"SELECT completed FROM campaign_runs WHERE run_id = ?\")",
        "table": "campaign_runs",
        "operation": "FROM",
        "authority": "STATIC_SQL_LITERAL",
        "relation": "SAME_CANDIDATE_SERVICE_FILE_NOT_PROVEN_RULE_PATH",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/gameplay/CampaignRunService.java",
        "line": 268,
        "sha256": "7972ffbd236728f2146418dd21c4324e5a71a7abdaeb0da243e2423f79a98215",
        "kind": "sql_literal_reference",
        "snippet": "jdbc.sql(\"UPDATE campaign_runs SET status = ?, finished_at = CURRENT_TIMESTAMP(3) WHERE run_id = ?\")",
        "table": "campaign_runs",
        "operation": "UPDATE",
        "authority": "STATIC_SQL_LITERAL",
        "relation": "SAME_CANDIDATE_SERVICE_FILE_NOT_PROVEN_RULE_PATH",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/gameplay/CampaignRunService.java",
        "line": 270,
        "sha256": "7972ffbd236728f2146418dd21c4324e5a71a7abdaeb0da243e2423f79a98215",
        "kind": "sql_literal_reference",
        "snippet": "jdbc.sql(\"DELETE FROM campaign_active WHERE character_id = ?\").param(characterId).update();",
        "table": "campaign_active",
        "operation": "DELETE FROM",
        "authority": "STATIC_SQL_LITERAL",
        "relation": "SAME_CANDIDATE_SERVICE_FILE_NOT_PROVEN_RULE_PATH",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/gameplay/CampaignRunService.java",
        "line": 328,
        "sha256": "7972ffbd236728f2146418dd21c4324e5a71a7abdaeb0da243e2423f79a98215",
        "kind": "sql_literal_reference",
        "snippet": "return new HashSet<>(jdbc.sql(\"SELECT node_id FROM campaign_run_nodes WHERE run_id = ?\")",
        "table": "campaign_run_nodes",
        "operation": "FROM",
        "authority": "STATIC_SQL_LITERAL",
        "relation": "SAME_CANDIDATE_SERVICE_FILE_NOT_PROVEN_RULE_PATH",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      }
    ],
    "referencedTableNames": [
      "campaign_active",
      "campaign_progress",
      "campaign_run_nodes",
      "campaign_runs",
      "characters",
      "tutorial_battle_rewards"
    ],
    "migrations": [
      {
        "path": "apps/game-server/src/main/resources/db/migration/V1__identity_characters_sessions.sql",
        "line": 22,
        "sha256": "79cd1400cbb6497bfb1de59b0500facdbe2f3f6d9959679bf992ee711cef95a0",
        "kind": "migration_ddl",
        "snippet": "CREATE TABLE characters (",
        "table": "characters",
        "operation": "CREATE TABLE",
        "match": "OBSERVED_SQL_TABLE_NAME",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/resources/db/migration/V10__item_catalogue_and_inventory.sql",
        "line": 49,
        "sha256": "37d8ca0f8e054fa42af8c97408639e830a4342e119bfb706aa96fa63a1332e24",
        "kind": "migration_ddl",
        "snippet": "ALTER TABLE characters",
        "table": "characters",
        "operation": "ALTER TABLE",
        "match": "OBSERVED_SQL_TABLE_NAME",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/resources/db/migration/V10__item_catalogue_and_inventory.sql",
        "line": 52,
        "sha256": "37d8ca0f8e054fa42af8c97408639e830a4342e119bfb706aa96fa63a1332e24",
        "kind": "migration_ddl",
        "snippet": "CREATE TABLE character_items (",
        "table": "character_items",
        "operation": "CREATE TABLE",
        "match": "PROFILE_TABLE_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/resources/db/migration/V10__item_catalogue_and_inventory.sql",
        "line": 5582,
        "sha256": "37d8ca0f8e054fa42af8c97408639e830a4342e119bfb706aa96fa63a1332e24",
        "kind": "migration_ddl",
        "snippet": "ALTER TABLE characters",
        "table": "characters",
        "operation": "ALTER TABLE",
        "match": "OBSERVED_SQL_TABLE_NAME",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/resources/db/migration/V11__tutorial_progress.sql",
        "line": 18,
        "sha256": "c2f878363a82f8edcd0c6e7a1bae60ffa289835c484393fd3efa297521b5d049",
        "kind": "migration_ddl",
        "snippet": "CREATE TABLE character_tutorial (",
        "table": "character_tutorial",
        "operation": "CREATE TABLE",
        "match": "PROFILE_TABLE_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/resources/db/migration/V13__tutorial_battle_rewards.sql",
        "line": 2,
        "sha256": "957ded40128698f3480a1c3b0cd6db40de76c503999ce9885cfa1698cd699ecf",
        "kind": "migration_ddl",
        "snippet": "CREATE TABLE tutorial_battle_rewards (",
        "table": "tutorial_battle_rewards",
        "operation": "CREATE TABLE",
        "match": "OBSERVED_SQL_TABLE_NAME",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/resources/db/migration/V14__skills_quests_and_building_progress.sql",
        "line": 18,
        "sha256": "80a08834211ba4f8ffe9de0fb0c905db9d244eb3a6714f692d9089be7540f98f",
        "kind": "migration_ddl",
        "snippet": "CREATE TABLE character_quests (",
        "table": "character_quests",
        "operation": "CREATE TABLE",
        "match": "PROFILE_TABLE_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/resources/db/migration/V14__skills_quests_and_building_progress.sql",
        "line": 54,
        "sha256": "80a08834211ba4f8ffe9de0fb0c905db9d244eb3a6714f692d9089be7540f98f",
        "kind": "migration_ddl",
        "snippet": "CREATE TABLE character_quest_completions (",
        "table": "character_quest_completions",
        "operation": "CREATE TABLE",
        "match": "PROFILE_TABLE_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/resources/db/migration/V20__campaign_runs_and_rewards.sql",
        "line": 3,
        "sha256": "da49f1fd50929001ce742a054ae19495ce7c8edc2e3f520aec10f9f9ec18c4af",
        "kind": "migration_ddl",
        "snippet": "CREATE TABLE campaign_runs (",
        "table": "campaign_runs",
        "operation": "CREATE TABLE",
        "match": "OBSERVED_SQL_TABLE_NAME",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/resources/db/migration/V20__campaign_runs_and_rewards.sql",
        "line": 21,
        "sha256": "da49f1fd50929001ce742a054ae19495ce7c8edc2e3f520aec10f9f9ec18c4af",
        "kind": "migration_ddl",
        "snippet": "CREATE TABLE campaign_active (",
        "table": "campaign_active",
        "operation": "CREATE TABLE",
        "match": "OBSERVED_SQL_TABLE_NAME",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/resources/db/migration/V20__campaign_runs_and_rewards.sql",
        "line": 32,
        "sha256": "da49f1fd50929001ce742a054ae19495ce7c8edc2e3f520aec10f9f9ec18c4af",
        "kind": "migration_ddl",
        "snippet": "CREATE TABLE campaign_run_nodes (",
        "table": "campaign_run_nodes",
        "operation": "CREATE TABLE",
        "match": "OBSERVED_SQL_TABLE_NAME",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/resources/db/migration/V20__campaign_runs_and_rewards.sql",
        "line": 45,
        "sha256": "da49f1fd50929001ce742a054ae19495ce7c8edc2e3f520aec10f9f9ec18c4af",
        "kind": "migration_ddl",
        "snippet": "CREATE TABLE campaign_progress (",
        "table": "campaign_progress",
        "operation": "CREATE TABLE",
        "match": "OBSERVED_SQL_TABLE_NAME",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/resources/db/migration/V23__forge_hidden_bag.sql",
        "line": 2,
        "sha256": "bf13330d5535660c5a7795ec1087bd0a0bfda9b1b81202daaf0789efe8fb02d4",
        "kind": "migration_ddl",
        "snippet": "ALTER TABLE character_items DROP CONSTRAINT ck_items_bag;",
        "table": "character_items",
        "operation": "ALTER TABLE",
        "match": "PROFILE_TABLE_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/resources/db/migration/V23__forge_hidden_bag.sql",
        "line": 3,
        "sha256": "bf13330d5535660c5a7795ec1087bd0a0bfda9b1b81202daaf0789efe8fb02d4",
        "kind": "migration_ddl",
        "snippet": "ALTER TABLE character_items ADD CONSTRAINT ck_items_bag",
        "table": "character_items",
        "operation": "ALTER TABLE",
        "match": "PROFILE_TABLE_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/resources/db/migration/V24__item_strengthen_grade.sql",
        "line": 1,
        "sha256": "420cf054d54ea661253afec4261ca18fc76d64550f68940f441e9704689e84a5",
        "kind": "migration_ddl",
        "snippet": "ALTER TABLE character_items ADD COLUMN enhancement_level INT NOT NULL DEFAULT 0;",
        "table": "character_items",
        "operation": "ALTER TABLE",
        "match": "PROFILE_TABLE_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/resources/db/migration/V24__item_strengthen_grade.sql",
        "line": 2,
        "sha256": "420cf054d54ea661253afec4261ca18fc76d64550f68940f441e9704689e84a5",
        "kind": "migration_ddl",
        "snippet": "ALTER TABLE character_items ADD CONSTRAINT ck_items_enhancement",
        "table": "character_items",
        "operation": "ALTER TABLE",
        "match": "PROFILE_TABLE_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/resources/db/migration/V25__personal_warehouse_bag.sql",
        "line": 2,
        "sha256": "ad030009be8e13ad232a91f0786e002228e198fbbddcfb6bb28e378eac62b57f",
        "kind": "migration_ddl",
        "snippet": "ALTER TABLE character_items DROP CONSTRAINT ck_items_bag;",
        "table": "character_items",
        "operation": "ALTER TABLE",
        "match": "PROFILE_TABLE_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/resources/db/migration/V25__personal_warehouse_bag.sql",
        "line": 3,
        "sha256": "ad030009be8e13ad232a91f0786e002228e198fbbddcfb6bb28e378eac62b57f",
        "kind": "migration_ddl",
        "snippet": "ALTER TABLE character_items ADD CONSTRAINT ck_items_bag",
        "table": "character_items",
        "operation": "ALTER TABLE",
        "match": "PROFILE_TABLE_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/resources/db/migration/V26__equipment_gem_sockets.sql",
        "line": 2,
        "sha256": "2103642239ad2a68eb849eb087e5739f725e8b4b9d93cdd63e0bfdb2c7cdc642",
        "kind": "migration_ddl",
        "snippet": "ALTER TABLE character_items ADD COLUMN gem_slot1 INT NOT NULL DEFAULT -1;",
        "table": "character_items",
        "operation": "ALTER TABLE",
        "match": "PROFILE_TABLE_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/resources/db/migration/V26__equipment_gem_sockets.sql",
        "line": 3,
        "sha256": "2103642239ad2a68eb849eb087e5739f725e8b4b9d93cdd63e0bfdb2c7cdc642",
        "kind": "migration_ddl",
        "snippet": "ALTER TABLE character_items ADD COLUMN gem_slot2 INT NOT NULL DEFAULT -1;",
        "table": "character_items",
        "operation": "ALTER TABLE",
        "match": "PROFILE_TABLE_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/resources/db/migration/V26__equipment_gem_sockets.sql",
        "line": 4,
        "sha256": "2103642239ad2a68eb849eb087e5739f725e8b4b9d93cdd63e0bfdb2c7cdc642",
        "kind": "migration_ddl",
        "snippet": "ALTER TABLE character_items ADD COLUMN gem_slot3 INT NOT NULL DEFAULT -1;",
        "table": "character_items",
        "operation": "ALTER TABLE",
        "match": "PROFILE_TABLE_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/resources/db/migration/V26__equipment_gem_sockets.sql",
        "line": 5,
        "sha256": "2103642239ad2a68eb849eb087e5739f725e8b4b9d93cdd63e0bfdb2c7cdc642",
        "kind": "migration_ddl",
        "snippet": "ALTER TABLE character_items ADD COLUMN gem_slot4 INT NOT NULL DEFAULT -1;",
        "table": "character_items",
        "operation": "ALTER TABLE",
        "match": "PROFILE_TABLE_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/resources/db/migration/V28__item_random_property_skills.sql",
        "line": 3,
        "sha256": "0a129d7d0d6f845f1ca07db30d4151ae6ba1bd9aae45534f0b4aea0259fd009f",
        "kind": "migration_ddl",
        "snippet": "ALTER TABLE character_items ADD COLUMN random_skill1 INT NOT NULL DEFAULT 0;",
        "table": "character_items",
        "operation": "ALTER TABLE",
        "match": "PROFILE_TABLE_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/resources/db/migration/V28__item_random_property_skills.sql",
        "line": 4,
        "sha256": "0a129d7d0d6f845f1ca07db30d4151ae6ba1bd9aae45534f0b4aea0259fd009f",
        "kind": "migration_ddl",
        "snippet": "ALTER TABLE character_items ADD COLUMN random_skill2 INT NOT NULL DEFAULT 0;",
        "table": "character_items",
        "operation": "ALTER TABLE",
        "match": "PROFILE_TABLE_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      }
    ]
  },
  "admin": {
    "locationEvidence": "STATIC_REFERENCE_ONLY",
    "writeVerification": "NOT_VERIFIED",
    "removalAuthorizedByMissingEvidence": false,
    "proofRequired": [
      "Operação autorizada na interface e requisição real",
      "Leitura do estado autoritativo após gravação",
      "Auditoria e valores antes/depois",
      "Relogin ou atualização de sessão coerente",
      "Permissão negada sem alteração"
    ],
    "references": [],
    "externalReferences": []
  },
  "handlers": [
    {
      "path": "apps/game-server/src/main/java/com/wartuneultra/server/login/GameLoginHandler.java",
      "method": "bagResponses",
      "signature": "private List<OutgoingMessage> bagResponses(Frame frame, ConnectionState state, BagService.Outcome outcome) throws ProtocolException",
      "startLine": 2432,
      "endLine": 2507,
      "sha256": "874b428ca71b3aecc934460d5a1c5dbb3b0d41ed3510527ffdc06e4a60d4d639",
      "bodySha256": "0771fabc3f129e7fd2b315ae706ce0fb78efca715976d6072c12481ade636417",
      "messages": [
        "ItemMessages.ItemMovedListMsg",
        "ArmyMessages.ArmyUpdatedGridMsg",
        "ItemMessages.TransInfoMsg",
        "EnergyMessages.DataResetMsg"
      ],
      "evidence": "static_method_body",
      "evidenceContext": {
        "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
        "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
        "testId": "integration-contracts.mjs",
        "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
        "scope": "STATIC_EXTRACTION_NOT_LIVE"
      }
    }
  ],
  "protocol": [
    {
      "name": "U_C_QUEST_UPDATED",
      "value": 112,
      "path": "modules/protocol-legacy/src/main/java/com/wartuneultra/protocol/Opcodes.java",
      "line": 153,
      "sha256": "024cdf29f6c9c59127fcd133cf09df015df4e5341f5cac82156177805465b39d",
      "direction": "UNRESOLVED",
      "directionConfidence": "enum_value_only",
      "evidenceContext": {
        "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
        "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
        "testId": "integration-contracts.mjs",
        "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
        "scope": "STATIC_EXTRACTION_NOT_LIVE"
      }
    },
    {
      "name": "U_QUEST_UPDATED",
      "value": 112,
      "path": "modules/protocol-legacy/src/main/java/com/wartuneultra/protocol/Opcodes.java",
      "line": 300,
      "sha256": "024cdf29f6c9c59127fcd133cf09df015df4e5341f5cac82156177805465b39d",
      "direction": "S2C",
      "directionConfidence": "outgoing_respond_call",
      "response": {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/login/GameLoginHandler.java",
        "line": 1151,
        "sha256": "874b428ca71b3aecc934460d5a1c5dbb3b0d41ed3510527ffdc06e4a60d4d639"
      },
      "evidenceContext": {
        "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
        "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
        "testId": "integration-contracts.mjs",
        "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
        "scope": "STATIC_EXTRACTION_NOT_LIVE"
      }
    }
  ],
  "attributes": [
    "CondictionType",
    "Para1..Para4",
    "quest event type",
    "persisted progress",
    "reward idempotency"
  ]
}
```

## O que preservar

- Contas, personagens, inventário, saldos, progresso, permissões e registros de auditoria existentes.
- Diffs concorrentes do Arena; usar commit e hashes registrados e regenerar a análise se os arquivos mudarem.
- Contratos protobuf, IDs, arredondamentos, limites e ordem de inicialização comprovados pelo cliente.
- Estado persistido correto e cálculos equivalentes já validados; não duplicar sistemas, bônus, tabelas ou handlers.
- Migrations aplicadas e compatibilidade do JAR de rollback; aplicação é etapa separada da geração de classes.

## Aplicação no banco e painel

1. Reutilizar tabelas e serviços existentes quando cobrirem o estado. Uma fórmula pura não exige tabela própria.
2. Se houver estado novo, documentar entidade/dono, colunas, tipos, limites, índices e chaves; criar nova migration apenas depois de conferir o maior número no repositório e a Flyway efetiva. Não reescrever migrations aplicadas.
3. Operações de ouro, itens, material e recompensa devem usar a mesma transação autoritativa, validação de posse e quantidades e controle de repetição/concorrência.
4. No painel, reaproveitar rotas, componentes, permissões e auditoria existentes. Validar no servidor; prévia/confirmar e versão esperada devem impedir alterações concorrentes e repetidas.
5. A edição administrativa deve chamar o serviço do domínio, recalcular projeções e atualizar/invalidate caches/sessões conforme o fluxo existente. Não editar diretamente um poder derivado sem contrato de override explícito.
6. A evidência de migrations e SQL no código não prova que a tabela/coluna existe na instância em execução. Executar MYSQL_PREFLIGHT.sql somente na conexão/esquema selecionado e anexar resultado sem credenciais.
7. Antes de publicar, comparar operações normais e administrativas para os mesmos dados, conferir logs de auditoria, autorização negada e persistência após relogin.

## Como provar no jogo

1. Ação: Escolher uma condição de semântica comprovada e disparar o evento real no jogo.
   Observar no cliente: Contador avança para o alvo correto e a conclusão só ocorre no requisito exigido.
   Conferir persistência: Progresso e recompensa persistem; evento/requisição repetido não concede novamente.

2. Ação: Testar tipo ainda desconhecido e reabrir após relogin.
   Observar no cliente: Estado desconhecido fica explícito; não marcar concluído por palpite.
   Conferir persistência: Nenhuma recompensa inventada ou sobrescrita de progresso válido.

## Bloqueios explícitos

- Funcionalidade existente ainda não homologada por evidência de serviço e cliente.
- Esquema MySQL efetivo e versão Flyway não foram consultados.
- Rotas/permissões e comportamento dos editores do painel não foram testados.
- apps/game-server/src/main/java/com/wartuneultra/server/gameplay/CampaignRunService.java:26: NO_SUPPORTED_CONTAINING_METHOD
- apps/game-server/src/main/java/com/wartuneultra/server/tutorial/TutorialService.java:43: NO_SUPPORTED_CONTAINING_METHOD
