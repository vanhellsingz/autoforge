# 02 — Chance e limites do encantamento

Estado: TO_IMPLEMENT. Referências de código são pontos de investigação, não prova de integração.

## Classe e evidência

- generated/ForgeEnhancementRules.java
- forge-rate.evidence.json

Métodos gerados:

```java
public static final int SUCCESS_RATE = 100;
public static final int RATE_STEP = 10;
public static final int MIN_RATE = 10;
public static final int MAX_RATE = 100;
public static final int FINAL_MAX_RATE = 100;
public static final int RISK_CONFIRM_THRESHOLD = 50;
public static int successRate(int strengthenGrade, int property1) {
public static boolean canIntensify(long cost, long gold, int strengthenGrade, int strengthenMax) {
public static boolean needsRiskConfirm(int rate) {
```

## Referências encontradas

- apps/game-server/src/main/java/com/wartuneultra/server/inventory/ForgeStrengthenService.java:5 — import — SHA256 019c8c6dc08192c7973fb30fe9550bf8cfe342e7ec067d0ffbf589f6a52c2e54
  `import com.wartuneultra.autoforge.ForgeEnhancementRules;`
- apps/game-server/src/main/java/com/wartuneultra/server/inventory/ForgeStrengthenService.java:64 — call — SHA256 019c8c6dc08192c7973fb30fe9550bf8cfe342e7ec067d0ffbf589f6a52c2e54
  `if (!ForgeEnhancementRules.canIntensify(cost, before, grade, strengthenMax)) {`
- apps/game-server/src/main/java/com/wartuneultra/server/inventory/ForgeStrengthenService.java:69 — call — SHA256 019c8c6dc08192c7973fb30fe9550bf8cfe342e7ec067d0ffbf589f6a52c2e54
  `int chance = ForgeEnhancementRules.successRate(grade, UNOBSERVED_SLOT_BONUS);`

## Candidatos de serviço

- apps/game-server/src/main/java/com/wartuneultra/server/inventory/BagService.java:47 — candidate_class — SHA256 a3e6d7f96f98afad0cebf6db4d71a286c73bcca734249126f9f001093e4d5851
  `public class BagService {`
- apps/game-server/src/main/java/com/wartuneultra/server/inventory/ForgeStrengthenService.java:22 — candidate — SHA256 019c8c6dc08192c7973fb30fe9550bf8cfe342e7ec067d0ffbf589f6a52c2e54
  `private static final int UNOBSERVED_SLOT_BONUS = 0;`
- apps/game-server/src/main/java/com/wartuneultra/server/inventory/ForgeStrengthenService.java:35 — candidate — SHA256 019c8c6dc08192c7973fb30fe9550bf8cfe342e7ec067d0ffbf589f6a52c2e54
  `public Result strengthen(long characterId, byte[] body) {`
- apps/game-server/src/main/java/com/wartuneultra/server/inventory/ForgeStrengthenService.java:64 — candidate — SHA256 019c8c6dc08192c7973fb30fe9550bf8cfe342e7ec067d0ffbf589f6a52c2e54
  `if (!ForgeEnhancementRules.canIntensify(cost, before, grade, strengthenMax)) {`
- apps/game-server/src/main/java/com/wartuneultra/server/inventory/ForgeStrengthenService.java:69 — candidate — SHA256 019c8c6dc08192c7973fb30fe9550bf8cfe342e7ec067d0ffbf589f6a52c2e54
  `int chance = ForgeEnhancementRules.successRate(grade, UNOBSERVED_SLOT_BONUS);`

## Implementação em ordem

1. Comparar com implementações existentes; preservar métodos equivalentes corretos e evitar duplicação de sistemas ou bônus.
2. Usar successRate(grade,property1), canIntensify(cost,gold,grade,max) e needsRiskConfirm(rate) conforme o ramo suportado.
3. Property1 do material deve vir do slot persistido da forja. Pacote sem corpo não prova material ausente.
4. RNG deve ser uma dependência controlável do serviço; fórmula de chance não implementa sorteio ou consumo.

## Aceitação

- [ ] sucesso e falha com RNG controlado
- [ ] material consumido uma vez
- [ ] limite e ouro insuficiente sem mutação

## Lacunas declaradas pela extração

- The empty 5150 packet alone does not resolve the second forge slot. Read persisted slot state; do not infer a zero material bonus.
- Class-change equipment priced from catalog Gold/Rate is a separate branch not covered by this adapter.

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
    "path": "apps/game-server/src/main/java/com/wartuneultra/server/inventory/ForgeStrengthenService.java",
    "method": "strengthen",
    "signature": "@Transactional public Result strengthen(long characterId, byte[] body)",
    "startLine": 34,
    "endLine": 84,
    "sha256": "019c8c6dc08192c7973fb30fe9550bf8cfe342e7ec067d0ffbf589f6a52c2e54",
    "bodySha256": "319397c4c220ce3eeb94da2c786721e558bcde124b58b9c29c0b338d27fe4ae8",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/inventory/ForgeComposeService.java",
        "line": 98,
        "sha256": "f74a8eea0e2b2b6f4874d0fe62a9ef3fcd0463c967f1bdc7144a428fe265c18c",
        "kind": "sql_literal_reference",
        "snippet": "jdbc.sql(\"INSERT IGNORE INTO character_currencies(character_id,currency,balance) \"",
        "table": "character_currencies",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/inventory/ForgeComposeService.java",
        "line": 100,
        "sha256": "f74a8eea0e2b2b6f4874d0fe62a9ef3fcd0463c967f1bdc7144a428fe265c18c",
        "kind": "sql_literal_reference",
        "snippet": "long gold = jdbc.sql(\"SELECT balance FROM character_currencies \"",
        "table": "character_currencies",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/inventory/ForgeComposeService.java",
        "line": 105,
        "sha256": "f74a8eea0e2b2b6f4874d0fe62a9ef3fcd0463c967f1bdc7144a428fe265c18c",
        "kind": "sql_literal_reference",
        "snippet": "jdbc.sql(\"UPDATE character_currencies SET balance=?,version=version+1 \"",
        "table": "character_currencies",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/inventory/ForgeComposeService.java",
        "line": 108,
        "sha256": "f74a8eea0e2b2b6f4874d0fe62a9ef3fcd0463c967f1bdc7144a428fe265c18c",
        "kind": "sql_literal_reference",
        "snippet": "jdbc.sql(\"INSERT INTO currency_ledger(character_id,currency,delta,balance_after,reason,operator) \"",
        "table": "currency_ledger",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/inventory/ForgeGemService.java",
        "line": 79,
        "sha256": "49043ecb689f3ab5387bd68b8aa159b731b2c7e313481b20a355e8b794f20ca6",
        "kind": "sql_literal_reference",
        "snippet": "if (gem.bound()) jdbc.sql(\"UPDATE character_items SET is_bound=1 WHERE item_id=?\")",
        "table": "character_items",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/inventory/ForgeGemService.java",
        "line": 125,
        "sha256": "49043ecb689f3ab5387bd68b8aa159b731b2c7e313481b20a355e8b794f20ca6",
        "kind": "sql_literal_reference",
        "snippet": "long before = jdbc.sql(\"SELECT balance FROM character_currencies \"",
        "table": "character_currencies",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/inventory/ForgeGemService.java",
        "line": 130,
        "sha256": "49043ecb689f3ab5387bd68b8aa159b731b2c7e313481b20a355e8b794f20ca6",
        "kind": "sql_literal_reference",
        "snippet": "jdbc.sql(\"UPDATE character_currencies SET balance=?,version=version+1 \"",
        "table": "character_currencies",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/inventory/ForgeGemService.java",
        "line": 133,
        "sha256": "49043ecb689f3ab5387bd68b8aa159b731b2c7e313481b20a355e8b794f20ca6",
        "kind": "sql_literal_reference",
        "snippet": "jdbc.sql(\"INSERT INTO currency_ledger(character_id,currency,delta,balance_after,reason,operator) \"",
        "table": "currency_ledger",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/inventory/ForgeStrengthenService.java",
        "line": 37,
        "sha256": "019c8c6dc08192c7973fb30fe9550bf8cfe342e7ec067d0ffbf589f6a52c2e54",
        "kind": "sql_literal_reference",
        "snippet": "jdbc.sql(\"SELECT character_id FROM characters WHERE character_id=? FOR UPDATE\")",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/inventory/ForgeStrengthenService.java",
        "line": 39,
        "sha256": "019c8c6dc08192c7973fb30fe9550bf8cfe342e7ec067d0ffbf589f6a52c2e54",
        "kind": "sql_literal_reference",
        "snippet": "var equipment = jdbc.sql(\"SELECT item_id,template_id,enhancement_level FROM character_items \"",
        "table": "character_items",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/inventory/ForgeStrengthenService.java",
        "line": 56,
        "sha256": "019c8c6dc08192c7973fb30fe9550bf8cfe342e7ec067d0ffbf589f6a52c2e54",
        "kind": "sql_literal_reference",
        "snippet": "jdbc.sql(\"INSERT IGNORE INTO character_currencies(character_id,currency,balance) \"",
        "table": "character_currencies",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/inventory/ForgeStrengthenService.java",
        "line": 58,
        "sha256": "019c8c6dc08192c7973fb30fe9550bf8cfe342e7ec067d0ffbf589f6a52c2e54",
        "kind": "sql_literal_reference",
        "snippet": "long before = jdbc.sql(\"SELECT balance FROM character_currencies \"",
        "table": "character_currencies",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/inventory/ForgeStrengthenService.java",
        "line": 72,
        "sha256": "019c8c6dc08192c7973fb30fe9550bf8cfe342e7ec067d0ffbf589f6a52c2e54",
        "kind": "sql_literal_reference",
        "snippet": "if (success) jdbc.sql(\"UPDATE character_items SET enhancement_level=?,version=version+1 \"",
        "table": "character_items",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/inventory/ForgeStrengthenService.java",
        "line": 76,
        "sha256": "019c8c6dc08192c7973fb30fe9550bf8cfe342e7ec067d0ffbf589f6a52c2e54",
        "kind": "sql_literal_reference",
        "snippet": "jdbc.sql(\"UPDATE character_currencies SET balance=?,version=version+1 \"",
        "table": "character_currencies",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/inventory/ForgeStrengthenService.java",
        "line": 79,
        "sha256": "019c8c6dc08192c7973fb30fe9550bf8cfe342e7ec067d0ffbf589f6a52c2e54",
        "kind": "sql_literal_reference",
        "snippet": "jdbc.sql(\"INSERT INTO currency_ledger(character_id,currency,delta,balance_after,reason,operator) \"",
        "table": "currency_ledger",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/inventory/InventoryStore.java",
        "line": 50,
        "sha256": "f9fc9247cf08d01aeb2df028644e42ed4608ff8caeb08f211b72f886f96dd558",
        "kind": "sql_literal_reference",
        "snippet": "return jdbc.sql(\"SELECT \" + TEMPLATE_COLUMNS + \" FROM item_template WHERE template_id = ?\")",
        "table": "item_template",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/inventory/InventoryStore.java",
        "line": 57,
        "sha256": "f9fc9247cf08d01aeb2df028644e42ed4608ff8caeb08f211b72f886f96dd558",
        "kind": "sql_literal_reference",
        "snippet": "return jdbc.sql(\"SELECT sell_gold FROM item_template WHERE template_id=?\")",
        "table": "item_template",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/inventory/InventoryStore.java",
        "line": 63,
        "sha256": "f9fc9247cf08d01aeb2df028644e42ed4608ff8caeb08f211b72f886f96dd558",
        "kind": "sql_literal_reference",
        "snippet": "return jdbc.sql(\"SELECT enhancement_level FROM character_items WHERE item_id=?\")",
        "table": "character_items",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/inventory/InventoryStore.java",
        "line": 78,
        "sha256": "f9fc9247cf08d01aeb2df028644e42ed4608ff8caeb08f211b72f886f96dd558",
        "kind": "sql_literal_reference",
        "snippet": "+ \"FROM character_items WHERE item_id=?\").param(itemId)",
        "table": "character_items",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/inventory/InventoryStore.java",
        "line": 85,
        "sha256": "f9fc9247cf08d01aeb2df028644e42ed4608ff8caeb08f211b72f886f96dd558",
        "kind": "sql_literal_reference",
        "snippet": "return jdbc.sql(\"UPDATE character_items SET gem_slot\" + hole",
        "table": "character_items",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/inventory/InventoryStore.java",
        "line": 96,
        "sha256": "f9fc9247cf08d01aeb2df028644e42ed4608ff8caeb08f211b72f886f96dd558",
        "kind": "sql_literal_reference",
        "snippet": "+ \"FROM character_items WHERE item_id=?\").param(itemId)",
        "table": "character_items",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/inventory/InventoryStore.java",
        "line": 109,
        "sha256": "f9fc9247cf08d01aeb2df028644e42ed4608ff8caeb08f211b72f886f96dd558",
        "kind": "sql_literal_reference",
        "snippet": "jdbc.sql(\"INSERT IGNORE INTO character_currencies(character_id,currency,balance) \"",
        "table": "character_currencies",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/inventory/InventoryStore.java",
        "line": 111,
        "sha256": "f9fc9247cf08d01aeb2df028644e42ed4608ff8caeb08f211b72f886f96dd558",
        "kind": "sql_literal_reference",
        "snippet": "long before = jdbc.sql(\"SELECT balance FROM character_currencies \"",
        "table": "character_currencies",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/inventory/InventoryStore.java",
        "line": 115,
        "sha256": "f9fc9247cf08d01aeb2df028644e42ed4608ff8caeb08f211b72f886f96dd558",
        "kind": "sql_literal_reference",
        "snippet": "jdbc.sql(\"UPDATE character_currencies SET balance=?,version=version+1 \"",
        "table": "character_currencies",
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
      }
    ],
    "referencedTableNames": [
      "character_castles",
      "character_currencies",
      "character_items",
      "characters",
      "currency_ledger",
      "item_template"
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
        "line": 18,
        "sha256": "37d8ca0f8e054fa42af8c97408639e830a4342e119bfb706aa96fa63a1332e24",
        "kind": "migration_ddl",
        "snippet": "CREATE TABLE item_template (",
        "table": "item_template",
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
        "path": "apps/game-server/src/main/resources/db/migration/V21__castle_energy_clock.sql",
        "line": 3,
        "sha256": "9493e4d52b86d7da594ddd5795302a7295ca6cad9b32cbf636c30c7d3cd000ef",
        "kind": "migration_ddl",
        "snippet": "ALTER TABLE character_castles ADD COLUMN last_energy_hour BIGINT NULL;",
        "table": "character_castles",
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
        "path": "apps/game-server/src/main/resources/db/migration/V23__forge_hidden_bag.sql",
        "line": 2,
        "sha256": "bf13330d5535660c5a7795ec1087bd0a0bfda9b1b81202daaf0789efe8fb02d4",
        "kind": "migration_ddl",
        "snippet": "ALTER TABLE character_items DROP CONSTRAINT ck_items_bag;",
        "table": "character_items",
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
        "path": "apps/game-server/src/main/resources/db/migration/V23__forge_hidden_bag.sql",
        "line": 3,
        "sha256": "bf13330d5535660c5a7795ec1087bd0a0bfda9b1b81202daaf0789efe8fb02d4",
        "kind": "migration_ddl",
        "snippet": "ALTER TABLE character_items ADD CONSTRAINT ck_items_bag",
        "table": "character_items",
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
        "path": "apps/game-server/src/main/resources/db/migration/V24__item_strengthen_grade.sql",
        "line": 1,
        "sha256": "420cf054d54ea661253afec4261ca18fc76d64550f68940f441e9704689e84a5",
        "kind": "migration_ddl",
        "snippet": "ALTER TABLE character_items ADD COLUMN enhancement_level INT NOT NULL DEFAULT 0;",
        "table": "character_items",
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
        "path": "apps/game-server/src/main/resources/db/migration/V24__item_strengthen_grade.sql",
        "line": 2,
        "sha256": "420cf054d54ea661253afec4261ca18fc76d64550f68940f441e9704689e84a5",
        "kind": "migration_ddl",
        "snippet": "ALTER TABLE character_items ADD CONSTRAINT ck_items_enhancement",
        "table": "character_items",
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
        "path": "apps/game-server/src/main/resources/db/migration/V25__personal_warehouse_bag.sql",
        "line": 2,
        "sha256": "ad030009be8e13ad232a91f0786e002228e198fbbddcfb6bb28e378eac62b57f",
        "kind": "migration_ddl",
        "snippet": "ALTER TABLE character_items DROP CONSTRAINT ck_items_bag;",
        "table": "character_items",
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
        "path": "apps/game-server/src/main/resources/db/migration/V25__personal_warehouse_bag.sql",
        "line": 3,
        "sha256": "ad030009be8e13ad232a91f0786e002228e198fbbddcfb6bb28e378eac62b57f",
        "kind": "migration_ddl",
        "snippet": "ALTER TABLE character_items ADD CONSTRAINT ck_items_bag",
        "table": "character_items",
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
        "path": "apps/game-server/src/main/resources/db/migration/V26__equipment_gem_sockets.sql",
        "line": 2,
        "sha256": "2103642239ad2a68eb849eb087e5739f725e8b4b9d93cdd63e0bfdb2c7cdc642",
        "kind": "migration_ddl",
        "snippet": "ALTER TABLE character_items ADD COLUMN gem_slot1 INT NOT NULL DEFAULT -1;",
        "table": "character_items",
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
        "path": "apps/game-server/src/main/resources/db/migration/V26__equipment_gem_sockets.sql",
        "line": 3,
        "sha256": "2103642239ad2a68eb849eb087e5739f725e8b4b9d93cdd63e0bfdb2c7cdc642",
        "kind": "migration_ddl",
        "snippet": "ALTER TABLE character_items ADD COLUMN gem_slot2 INT NOT NULL DEFAULT -1;",
        "table": "character_items",
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
        "path": "apps/game-server/src/main/resources/db/migration/V26__equipment_gem_sockets.sql",
        "line": 4,
        "sha256": "2103642239ad2a68eb849eb087e5739f725e8b4b9d93cdd63e0bfdb2c7cdc642",
        "kind": "migration_ddl",
        "snippet": "ALTER TABLE character_items ADD COLUMN gem_slot3 INT NOT NULL DEFAULT -1;",
        "table": "character_items",
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
        "path": "apps/game-server/src/main/resources/db/migration/V26__equipment_gem_sockets.sql",
        "line": 5,
        "sha256": "2103642239ad2a68eb849eb087e5739f725e8b4b9d93cdd63e0bfdb2c7cdc642",
        "kind": "migration_ddl",
        "snippet": "ALTER TABLE character_items ADD COLUMN gem_slot4 INT NOT NULL DEFAULT -1;",
        "table": "character_items",
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
        "path": "apps/game-server/src/main/resources/db/migration/V28__item_random_property_skills.sql",
        "line": 3,
        "sha256": "0a129d7d0d6f845f1ca07db30d4151ae6ba1bd9aae45534f0b4aea0259fd009f",
        "kind": "migration_ddl",
        "snippet": "ALTER TABLE character_items ADD COLUMN random_skill1 INT NOT NULL DEFAULT 0;",
        "table": "character_items",
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
        "path": "apps/game-server/src/main/resources/db/migration/V28__item_random_property_skills.sql",
        "line": 4,
        "sha256": "0a129d7d0d6f845f1ca07db30d4151ae6ba1bd9aae45534f0b4aea0259fd009f",
        "kind": "migration_ddl",
        "snippet": "ALTER TABLE character_items ADD COLUMN random_skill2 INT NOT NULL DEFAULT 0;",
        "table": "character_items",
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
        "path": "apps/game-server/src/main/resources/db/migration/V28__item_random_property_skills.sql",
        "line": 5,
        "sha256": "0a129d7d0d6f845f1ca07db30d4151ae6ba1bd9aae45534f0b4aea0259fd009f",
        "kind": "migration_ddl",
        "snippet": "ALTER TABLE character_items ADD COLUMN random_skill3 INT NOT NULL DEFAULT 0;",
        "table": "character_items",
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
        "path": "apps/game-server/src/main/resources/db/migration/V28__item_random_property_skills.sql",
        "line": 6,
        "sha256": "0a129d7d0d6f845f1ca07db30d4151ae6ba1bd9aae45534f0b4aea0259fd009f",
        "kind": "migration_ddl",
        "snippet": "ALTER TABLE character_items ADD COLUMN random_skill4 INT NOT NULL DEFAULT 0;",
        "table": "character_items",
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
        "path": "apps/game-server/src/main/resources/db/migration/V28__item_random_property_skills.sql",
        "line": 7,
        "sha256": "0a129d7d0d6f845f1ca07db30d4151ae6ba1bd9aae45534f0b4aea0259fd009f",
        "kind": "migration_ddl",
        "snippet": "ALTER TABLE character_items ADD COLUMN random_skill5 INT NOT NULL DEFAULT 0;",
        "table": "character_items",
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
        "path": "apps/game-server/src/main/resources/db/migration/V29__forge_item_origin.sql",
        "line": 3,
        "sha256": "cde1a4d63f2c3022ce5bc1beb4c4714f1bb0433716af30f60e298325be9b8b06",
        "kind": "migration_ddl",
        "snippet": "ALTER TABLE character_items ADD COLUMN forge_origin_bag TINYINT NULL;",
        "table": "character_items",
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
        "path": "apps/game-server/src/main/resources/db/migration/V29__forge_item_origin.sql",
        "line": 4,
        "sha256": "cde1a4d63f2c3022ce5bc1beb4c4714f1bb0433716af30f60e298325be9b8b06",
        "kind": "migration_ddl",
        "snippet": "ALTER TABLE character_items ADD COLUMN forge_origin_pos INT NULL;",
        "table": "character_items",
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
        "path": "apps/game-server/src/main/resources/db/migration/V4__buildings_and_economy.sql",
        "line": 41,
        "sha256": "40381c2a38c86f101e057e7f5020efb6456aa38229bb7bb40bd2aae2c66bfd31",
        "kind": "migration_ddl",
        "snippet": "CREATE TABLE character_currencies (",
        "table": "character_currencies",
        "operation": "CREATE TABLE",
        "match": "OBSERVED_SQL_TABLE_NAME",
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
    "references": [
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/AdminQueryStore.java",
        "line": 122,
        "sha256": "a323467846323fca47e00ce326ac0ed3064e8cf682b836c58e3c759a5e93b9b1",
        "kind": "admin_java_candidate",
        "snippet": "List<AccountSummary> items = jdbc.sql(ACCOUNT_SELECT + where + groupBy + having",
        "authority": "LEXICAL_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/AdminQueryStore.java",
        "line": 127,
        "sha256": "a323467846323fca47e00ce326ac0ed3064e8cf682b836c58e3c759a5e93b9b1",
        "kind": "admin_java_candidate",
        "snippet": "return PageResult.of(items, total == null ? 0 : total, page, size);",
        "authority": "LEXICAL_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/AdminRole.java",
        "line": 68,
        "sha256": "e2706f98b99ab50d1d8e1bc8d63320a2dcf82aaf6f10bf21bee23b9b555f51ab",
        "kind": "admin_java_candidate",
        "snippet": "/** Reading the item catalogue and a character's bag. */",
        "authority": "LEXICAL_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/AdminRole.java",
        "line": 71,
        "sha256": "e2706f98b99ab50d1d8e1bc8d63320a2dcf82aaf6f10bf21bee23b9b555f51ab",
        "kind": "admin_java_candidate",
        "snippet": "* Granting or equipping items. Separate from CHARACTER_WRITE because it",
        "authority": "LEXICAL_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/AdminRole.java",
        "line": 73,
        "sha256": "e2706f98b99ab50d1d8e1bc8d63320a2dcf82aaf6f10bf21bee23b9b555f51ab",
        "kind": "admin_java_candidate",
        "snippet": "* should not automatically be able to mint items.",
        "authority": "LEXICAL_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/InventoryEditorController.java",
        "line": 19,
        "sha256": "21f6bb48348f39c37fe99aff1cc4b0f4a36c27819d5bc70b9d7fe45dddd49db9",
        "kind": "admin_java_candidate",
        "snippet": "@RequestMapping(\"/admin/api/v1/editor/characters/{characterId}/inventory\")",
        "authority": "LEXICAL_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/InventoryEditorController.java",
        "line": 30,
        "sha256": "21f6bb48348f39c37fe99aff1cc4b0f4a36c27819d5bc70b9d7fe45dddd49db9",
        "kind": "admin_java_candidate",
        "snippet": "public InventoryEditorDtos.Snapshot inventory(@PathVariable long characterId) {",
        "authority": "LEXICAL_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/InventoryEditorDtos.java",
        "line": 4,
        "sha256": "aef325446ce936865c36cf01a49dabc00bdf9a382c8da77f6640f66edb746a70",
        "kind": "admin_java_candidate",
        "snippet": "import com.wartuneultra.domain.inventory.InventoryEditorRules;",
        "authority": "LEXICAL_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/InventoryEditorDtos.java",
        "line": 30,
        "sha256": "aef325446ce936865c36cf01a49dabc00bdf9a382c8da77f6640f66edb746a70",
        "kind": "admin_java_candidate",
        "snippet": "public record Snapshot(long characterId, String nickname, List<ItemView> items) { }",
        "authority": "LEXICAL_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/InventoryEditorService.java",
        "line": 3,
        "sha256": "25f15455234e69b7e2c34c15c91028d8e571962c29404899b64989a538919312",
        "kind": "admin_java_candidate",
        "snippet": "import com.wartuneultra.domain.inventory.BagType;",
        "authority": "LEXICAL_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/InventoryEditorService.java",
        "line": 4,
        "sha256": "25f15455234e69b7e2c34c15c91028d8e571962c29404899b64989a538919312",
        "kind": "admin_java_candidate",
        "snippet": "import com.wartuneultra.domain.inventory.InventoryEditorRules;",
        "authority": "LEXICAL_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/InventoryEditorService.java",
        "line": 5,
        "sha256": "25f15455234e69b7e2c34c15c91028d8e571962c29404899b64989a538919312",
        "kind": "admin_java_candidate",
        "snippet": "import com.wartuneultra.domain.inventory.InventoryItem;",
        "authority": "LEXICAL_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/InventoryEditorService.java",
        "line": 6,
        "sha256": "25f15455234e69b7e2c34c15c91028d8e571962c29404899b64989a538919312",
        "kind": "admin_java_candidate",
        "snippet": "import com.wartuneultra.domain.inventory.InventoryViolation;",
        "authority": "LEXICAL_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/InventoryEditorService.java",
        "line": 7,
        "sha256": "25f15455234e69b7e2c34c15c91028d8e571962c29404899b64989a538919312",
        "kind": "admin_java_candidate",
        "snippet": "import com.wartuneultra.domain.inventory.ItemTemplate;",
        "authority": "LEXICAL_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/InventoryEditorService.java",
        "line": 10,
        "sha256": "25f15455234e69b7e2c34c15c91028d8e571962c29404899b64989a538919312",
        "kind": "admin_java_candidate",
        "snippet": "import com.wartuneultra.server.inventory.InventoryStore;",
        "authority": "LEXICAL_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/InventoryEditorService.java",
        "line": 22,
        "sha256": "25f15455234e69b7e2c34c15c91028d8e571962c29404899b64989a538919312",
        "kind": "admin_java_candidate",
        "snippet": "private final InventoryStore inventory;",
        "authority": "LEXICAL_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/InventoryEditorService.java",
        "line": 27,
        "sha256": "25f15455234e69b7e2c34c15c91028d8e571962c29404899b64989a538919312",
        "kind": "admin_java_candidate",
        "snippet": "public InventoryEditorService(EditorCharacterAccess characters, InventoryStore inventory,",
        "authority": "LEXICAL_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/InventoryEditorService.java",
        "line": 30,
        "sha256": "25f15455234e69b7e2c34c15c91028d8e571962c29404899b64989a538919312",
        "kind": "admin_java_candidate",
        "snippet": "this.inventory = inventory;",
        "authority": "LEXICAL_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/InventoryEditorService.java",
        "line": 39,
        "sha256": "25f15455234e69b7e2c34c15c91028d8e571962c29404899b64989a538919312",
        "kind": "admin_java_candidate",
        "snippet": "var items = inventory.findItems(id);",
        "authority": "LEXICAL_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/InventoryEditorService.java",
        "line": 40,
        "sha256": "25f15455234e69b7e2c34c15c91028d8e571962c29404899b64989a538919312",
        "kind": "admin_java_candidate",
        "snippet": "var templates = templates(items);",
        "authority": "LEXICAL_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/InventoryEditorService.java",
        "line": 41,
        "sha256": "25f15455234e69b7e2c34c15c91028d8e571962c29404899b64989a538919312",
        "kind": "admin_java_candidate",
        "snippet": "var rows = items.stream().map(item -> {",
        "authority": "LEXICAL_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/InventoryEditorService.java",
        "line": 42,
        "sha256": "25f15455234e69b7e2c34c15c91028d8e571962c29404899b64989a538919312",
        "kind": "admin_java_candidate",
        "snippet": "var template = templates.get(item.templateId());",
        "authority": "LEXICAL_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/InventoryEditorService.java",
        "line": 43,
        "sha256": "25f15455234e69b7e2c34c15c91028d8e571962c29404899b64989a538919312",
        "kind": "admin_java_candidate",
        "snippet": "return new InventoryEditorDtos.ItemView(item.instanceId(), item.templateId(),",
        "authority": "LEXICAL_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/InventoryEditorService.java",
        "line": 44,
        "sha256": "25f15455234e69b7e2c34c15c91028d8e571962c29404899b64989a538919312",
        "kind": "admin_java_candidate",
        "snippet": "template == null ? \"Template #\" + item.templateId() : template.name(),",
        "authority": "LEXICAL_CANDIDATE",
        "evidenceContext": {
          "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
          "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "testId": "data-admin-map.mjs",
          "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
          "scope": "STATIC_EXTRACTION_NOT_LIVE"
        }
      }
    ],
    "externalReferences": []
  },
  "handlers": [
    {
      "path": "apps/game-server/src/main/java/com/wartuneultra/server/login/GameLoginHandler.java",
      "method": "handleItemStrengthen",
      "signature": "private List<OutgoingMessage> handleItemStrengthen(Frame frame, ConnectionState state) throws ProtocolException",
      "startLine": 2340,
      "endLine": 2361,
      "sha256": "874b428ca71b3aecc934460d5a1c5dbb3b0d41ed3510527ffdc06e4a60d4d639",
      "bodySha256": "425587995360db27c9f684b4f8f34cde001296780a48de69883b83fec522cda7",
      "messages": [
        "ItemMessages.ItemMovedListMsg"
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
      "name": "C_ITEM_STRENGTHEN",
      "value": 5150,
      "path": "modules/protocol-legacy/src/main/java/com/wartuneultra/protocol/Opcodes.java",
      "line": 46,
      "sha256": "024cdf29f6c9c59127fcd133cf09df015df4e5341f5cac82156177805465b39d",
      "direction": "C2S",
      "directionConfidence": "incoming_dispatch_case",
      "handler": "handleItemStrengthen",
      "dispatch": {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/login/GameLoginHandler.java",
        "line": 268,
        "sha256": "874b428ca71b3aecc934460d5a1c5dbb3b0d41ed3510527ffdc06e4a60d4d639"
      },
      "evidenceContext": {
        "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
        "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
        "testId": "integration-contracts.mjs",
        "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
        "scope": "STATIC_EXTRACTION_NOT_LIVE"
      }
    },
    {
      "name": "U_C_BAG_MOVE_UPDATE",
      "value": 115,
      "path": "modules/protocol-legacy/src/main/java/com/wartuneultra/protocol/Opcodes.java",
      "line": 72,
      "sha256": "024cdf29f6c9c59127fcd133cf09df015df4e5341f5cac82156177805465b39d",
      "direction": "S2C",
      "directionConfidence": "outgoing_respond_call",
      "response": {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/login/GameLoginHandler.java",
        "line": 1124,
        "sha256": "874b428ca71b3aecc934460d5a1c5dbb3b0d41ed3510527ffdc06e4a60d4d639"
      },
      "evidenceContext": {
        "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
        "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
        "testId": "integration-contracts.mjs",
        "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
        "scope": "STATIC_EXTRACTION_NOT_LIVE"
      }
    },
    {
      "name": "U_C_PLAYER_INFO",
      "value": 3,
      "path": "modules/protocol-legacy/src/main/java/com/wartuneultra/protocol/Opcodes.java",
      "line": 83,
      "sha256": "024cdf29f6c9c59127fcd133cf09df015df4e5341f5cac82156177805465b39d",
      "direction": "S2C",
      "directionConfidence": "outgoing_respond_call",
      "response": {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/login/GameLoginHandler.java",
        "line": 385,
        "sha256": "874b428ca71b3aecc934460d5a1c5dbb3b0d41ed3510527ffdc06e4a60d4d639"
      },
      "evidenceContext": {
        "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
        "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
        "testId": "integration-contracts.mjs",
        "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
        "scope": "STATIC_EXTRACTION_NOT_LIVE"
      }
    },
    {
      "name": null,
      "value": 86,
      "path": "apps/game-server/src/main/java/com/wartuneultra/server/login/GameLoginHandler.java",
      "line": 2349,
      "sha256": "874b428ca71b3aecc934460d5a1c5dbb3b0d41ed3510527ffdc06e4a60d4d639",
      "direction": "S2C",
      "directionConfidence": "outgoing_literal_respond_call",
      "handler": "handleItemStrengthen",
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
    "strengthenGrade",
    "material Property1",
    "StrengthenMax",
    "gold",
    "controlled RNG"
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

1. Ação: Comparar grau inicial, bordas e material presente/ausente nos slots persistidos.
   Observar no cliente: Chance exibida coincide com successRate para os mesmos parâmetros.
   Conferir persistência: Registrar o slot/material realmente resolvido; pacote vazio não autoriza presumir zero.

2. Ação: Testar sucesso e falha com RNG controlado no teste de serviço, não alterando o jogador real.
   Observar no cliente: Resposta/grade refletem cada ramo, e o clique não fica bloqueado.
   Conferir persistência: Consumo e custo seguem cada ramo comprovado; repetir pacote não duplica efeitos.

## Bloqueios explícitos

- Funcionalidade existente ainda não homologada por evidência de serviço e cliente.
- Esquema MySQL efetivo e versão Flyway não foram consultados.
- Rotas/permissões e comportamento dos editores do painel não foram testados.
- apps/game-server/src/main/java/com/wartuneultra/server/inventory/ForgeStrengthenService.java:5: NO_SUPPORTED_CONTAINING_METHOD
- apps/game-server/src/main/java/com/wartuneultra/server/inventory/BagService.java:47: NO_SUPPORTED_CONTAINING_METHOD
- apps/game-server/src/main/java/com/wartuneultra/server/inventory/ForgeStrengthenService.java:22: NO_SUPPORTED_CONTAINING_METHOD
