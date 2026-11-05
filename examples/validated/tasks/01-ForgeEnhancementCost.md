# 01 — Custo do encantamento

Estado: TO_IMPLEMENT. Referências de código são pontos de investigação, não prova de integração.

## Classe e evidência

- generated/ForgeEnhancementCost.java
- forge-cost.evidence.json

Métodos gerados:

```java
public static double gold(int needGrades, int profile, int strengthenGrade) {
```

## Referências encontradas

- apps/game-server/src/main/java/com/wartuneultra/server/inventory/ForgeStrengthenService.java:4 — import — SHA256 019c8c6dc08192c7973fb30fe9550bf8cfe342e7ec067d0ffbf589f6a52c2e54
  `import com.wartuneultra.autoforge.ForgeEnhancementCost;`
- apps/game-server/src/main/java/com/wartuneultra/server/inventory/ForgeStrengthenService.java:51 — call — SHA256 019c8c6dc08192c7973fb30fe9550bf8cfe342e7ec067d0ffbf589f6a52c2e54
  `double raw = ForgeEnhancementCost.gold(item.path("NeedGrades").asInt(),`

## Candidatos de serviço

- apps/game-server/src/main/java/com/wartuneultra/server/inventory/BagService.java:47 — candidate_class — SHA256 a3e6d7f96f98afad0cebf6db4d71a286c73bcca734249126f9f001093e4d5851
  `public class BagService {`
- apps/game-server/src/main/java/com/wartuneultra/server/inventory/ForgeStrengthenService.java:35 — candidate — SHA256 019c8c6dc08192c7973fb30fe9550bf8cfe342e7ec067d0ffbf589f6a52c2e54
  `public Result strengthen(long characterId, byte[] body) {`

## Implementação em ordem

1. Comparar com implementações existentes; preservar métodos equivalentes corretos e evitar duplicação de sistemas ou bônus.
2. Usar NeedGrades e Profile do template resolvido e strengthenGrade do item persistido.
3. Conectar gold(...) à cobrança e ao valor exibido; manter distinção do ramo de equipamento de mudança de classe.
4. Validar ouro, posse, limite e custo antes de alterar o equipamento, na transação existente.

## Aceitação

- [ ] ouro insuficiente não altera item nem saldo
- [ ] custo debitado corresponde à fórmula
- [ ] repetição do pacote não duplica cobrança

## Lacunas declaradas pela extração



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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/AdminRole.java",
        "line": 77,
        "sha256": "e2706f98b99ab50d1d8e1bc8d63320a2dcf82aaf6f10bf21bee23b9b555f51ab",
        "kind": "admin_java_candidate",
        "snippet": "/** Reading balances versus minting/withdrawing currency are separate capabilities. */",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/CurrencyEditorController.java",
        "line": 31,
        "sha256": "5505b21a3ae3d7bc6cdcef155aaaa9cc8186c38fa1227ee184e2bec991d2460c",
        "kind": "admin_java_candidate",
        "snippet": "@GetMapping(\"/wallet\")",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/CurrencyEditorController.java",
        "line": 33,
        "sha256": "5505b21a3ae3d7bc6cdcef155aaaa9cc8186c38fa1227ee184e2bec991d2460c",
        "kind": "admin_java_candidate",
        "snippet": "public CurrencyEditorDtos.Wallet wallet(@PathVariable long characterId) {",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/CurrencyEditorController.java",
        "line": 34,
        "sha256": "5505b21a3ae3d7bc6cdcef155aaaa9cc8186c38fa1227ee184e2bec991d2460c",
        "kind": "admin_java_candidate",
        "snippet": "return service.wallet(characterId);",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/CurrencyEditorController.java",
        "line": 37,
        "sha256": "5505b21a3ae3d7bc6cdcef155aaaa9cc8186c38fa1227ee184e2bec991d2460c",
        "kind": "admin_java_candidate",
        "snippet": "@PostMapping(\"/wallet/preview\")",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/CurrencyEditorController.java",
        "line": 44,
        "sha256": "5505b21a3ae3d7bc6cdcef155aaaa9cc8186c38fa1227ee184e2bec991d2460c",
        "kind": "admin_java_candidate",
        "snippet": "@PatchMapping(\"/wallet\")",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/CurrencyEditorController.java",
        "line": 55,
        "sha256": "5505b21a3ae3d7bc6cdcef155aaaa9cc8186c38fa1227ee184e2bec991d2460c",
        "kind": "admin_java_candidate",
        "snippet": "@GetMapping(\"/wallet/ledger\")",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/CurrencyEditorDtos.java",
        "line": 18,
        "sha256": "049d9898150dd0a1f80c42237abd3a86214ee74b6008516586375db4f9386f84",
        "kind": "admin_java_candidate",
        "snippet": "@NotNull @Pattern(regexp = \"GOLD|BALENS|BOUND_BALENS\") String currency,",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/CurrencyEditorDtos.java",
        "line": 27,
        "sha256": "049d9898150dd0a1f80c42237abd3a86214ee74b6008516586375db4f9386f84",
        "kind": "admin_java_candidate",
        "snippet": "public record BalanceView(String currency, String label, int templateId, long balance, long version) { }",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/CurrencyEditorDtos.java",
        "line": 28,
        "sha256": "049d9898150dd0a1f80c42237abd3a86214ee74b6008516586375db4f9386f84",
        "kind": "admin_java_candidate",
        "snippet": "public record Wallet(long characterId, String nickname, long maxBalance, List<BalanceView> balances) { }",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/CurrencyEditorDtos.java",
        "line": 29,
        "sha256": "049d9898150dd0a1f80c42237abd3a86214ee74b6008516586375db4f9386f84",
        "kind": "admin_java_candidate",
        "snippet": "public record Preview(String currency, long before, long after, long delta, long version,",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/CurrencyEditorDtos.java",
        "line": 32,
        "sha256": "049d9898150dd0a1f80c42237abd3a86214ee74b6008516586375db4f9386f84",
        "kind": "admin_java_candidate",
        "snippet": "public record LedgerEntry(long ledgerId, String currency, long delta, long balanceAfter,",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/CurrencyEditorService.java",
        "line": 4,
        "sha256": "65b5f3249b1b0b1f0924630ba4e44460fdd981a8eec410e32ca223b4e63de642",
        "kind": "admin_java_candidate",
        "snippet": "import com.wartuneultra.domain.economy.CurrencyAdjustment.Currency;",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/CurrencyEditorService.java",
        "line": 31,
        "sha256": "65b5f3249b1b0b1f0924630ba4e44460fdd981a8eec410e32ca223b4e63de642",
        "kind": "admin_java_candidate",
        "snippet": "public CurrencyEditorDtos.Wallet wallet(long id) {",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/CurrencyEditorService.java",
        "line": 34,
        "sha256": "65b5f3249b1b0b1f0924630ba4e44460fdd981a8eec410e32ca223b4e63de642",
        "kind": "admin_java_candidate",
        "snippet": "var views = Arrays.stream(Currency.values()).map(currency -> {",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/CurrencyEditorService.java",
        "line": 35,
        "sha256": "65b5f3249b1b0b1f0924630ba4e44460fdd981a8eec410e32ca223b4e63de642",
        "kind": "admin_java_candidate",
        "snippet": "var balance = saved.stream().filter(row -> row.currency() == currency).findFirst()",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/CurrencyEditorService.java",
        "line": 36,
        "sha256": "65b5f3249b1b0b1f0924630ba4e44460fdd981a8eec410e32ca223b4e63de642",
        "kind": "admin_java_candidate",
        "snippet": ".orElse(new CurrencyEditorStore.Balance(currency, 0, 0));",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/CurrencyEditorService.java",
        "line": 37,
        "sha256": "65b5f3249b1b0b1f0924630ba4e44460fdd981a8eec410e32ca223b4e63de642",
        "kind": "admin_java_candidate",
        "snippet": "return new CurrencyEditorDtos.BalanceView(currency.name(), label(currency), template(currency),",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/editor/CurrencyEditorService.java",
        "line": 40,
        "sha256": "65b5f3249b1b0b1f0924630ba4e44460fdd981a8eec410e32ca223b4e63de642",
        "kind": "admin_java_candidate",
        "snippet": "return new CurrencyEditorDtos.Wallet(id, character.nickname(), CurrencyAdjustment.MAX_BALANCE, views);",
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
    "NeedGrades",
    "Profile",
    "strengthenGrade",
    "StrengthenMax",
    "gold",
    "persisted forge slots"
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

1. Ação: Registrar template/nível do item e saldo; calcular custo com gold(...) para o mesmo estado.
   Observar no cliente: O cliente mostra o custo esperado no ramo comum.
   Conferir persistência: O template/nível usados são os do item possuído, não dados arbitrários do pacote.

2. Ação: Executar uma tentativa aceita; repetir com ouro insuficiente e item no limite.
   Observar no cliente: A tentativa responde e renova inventário/saldo; os casos recusados exibem recusa.
   Conferir persistência: Cobrança e item seguem a política comprovada do serviço; recusa não altera estado. Registrar separadamente sucesso/falha e material.

3. Ação: Relogar e consultar o detalhe no painel autorizado.
   Observar no cliente: Nível/saldo coincidem com a sessão anterior.
   Conferir persistência: Comparar dados persistidos e auditoria administrativa quando o painel tiver sido usado.

## Bloqueios explícitos

- Funcionalidade existente ainda não homologada por evidência de serviço e cliente.
- Esquema MySQL efetivo e versão Flyway não foram consultados.
- Rotas/permissões e comportamento dos editores do painel não foram testados.
- apps/game-server/src/main/java/com/wartuneultra/server/inventory/ForgeStrengthenService.java:4: NO_SUPPORTED_CONTAINING_METHOD
- apps/game-server/src/main/java/com/wartuneultra/server/inventory/BagService.java:47: NO_SUPPORTED_CONTAINING_METHOD
