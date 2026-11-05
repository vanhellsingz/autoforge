# 03 — FightingCapacity

Estado: TO_IMPLEMENT. Referências de código são pontos de investigação, não prova de integração.

## Classe e evidência

- generated/ClientFightCapacity.java
- capacity.evidence.json

Métodos gerados:

```java
public static double player(double[] stats,double[] base,double[] rates) {
public static double guard(double[] stats,double[] base,double[] rates) {
public static double rareWeapon(double[] stats,double[] base,double[] rates) {
```

## Referências encontradas

- Nenhum ponto localizado. Pesquisar o serviço correspondente antes de editar.

## Candidatos de serviço

- apps/game-server/src/main/java/com/wartuneultra/server/battle/BareHeroAttributes.java:17 — candidate — SHA256 d000d46dec46cd3a4c185bc3cea71b688121a04af82df3f015f5e568e9dbc18d
  `int parry, int fightingCapacity, int troopVolume,`
- apps/game-server/src/main/java/com/wartuneultra/server/battle/BareHeroAttributes.java:22 — candidate — SHA256 d000d46dec46cd3a4c185bc3cea71b688121a04af82df3f015f5e568e9dbc18d
  `int parry, int fightingCapacity, int troopVolume) {`
- apps/game-server/src/main/java/com/wartuneultra/server/battle/BareHeroAttributes.java:24 — candidate — SHA256 d000d46dec46cd3a4c185bc3cea71b688121a04af82df3f015f5e568e9dbc18d
  `forceHit, parry, fightingCapacity, troopVolume, 0, 0, 0, 0, 0);`
- apps/game-server/src/main/java/com/wartuneultra/server/battle/BareHeroAttributes.java:28 — candidate — SHA256 d000d46dec46cd3a4c185bc3cea71b688121a04af82df3f015f5e568e9dbc18d
  `int parry, int fightingCapacity) {`
- apps/game-server/src/main/java/com/wartuneultra/server/battle/BareHeroAttributes.java:30 — candidate — SHA256 d000d46dec46cd3a4c185bc3cea71b688121a04af82df3f015f5e568e9dbc18d
  `forceHit, parry, fightingCapacity, 0);`
- apps/game-server/src/main/java/com/wartuneultra/server/battle/BareHeroAttributes.java:33 — candidate — SHA256 d000d46dec46cd3a4c185bc3cea71b688121a04af82df3f015f5e568e9dbc18d
  `public static BareHeroAttributes calculate(JsonNode hero, int potentialPoints) {`
- apps/game-server/src/main/java/com/wartuneultra/server/battle/BareHeroAttributes.java:34 — candidate — SHA256 d000d46dec46cd3a4c185bc3cea71b688121a04af82df3f015f5e568e9dbc18d
  `return calculate(hero, potentialPoints, key -> integer(hero, key));`
- apps/game-server/src/main/java/com/wartuneultra/server/battle/BareHeroAttributes.java:43 — candidate — SHA256 d000d46dec46cd3a4c185bc3cea71b688121a04af82df3f015f5e568e9dbc18d
  `public static BareHeroAttributes calculate(JsonNode hero, int potentialPoints,`
- apps/game-server/src/main/java/com/wartuneultra/server/battle/BareHeroAttributes.java:45 — candidate — SHA256 d000d46dec46cd3a4c185bc3cea71b688121a04af82df3f015f5e568e9dbc18d
  `return calculate(hero, potentialPoints, attribute, Modifiers.EMPTY);`
- apps/game-server/src/main/java/com/wartuneultra/server/battle/BareHeroAttributes.java:76 — candidate — SHA256 d000d46dec46cd3a4c185bc3cea71b688121a04af82df3f015f5e568e9dbc18d
  `public static BareHeroAttributes calculate(JsonNode hero, int potentialPoints,`
- apps/game-server/src/main/java/com/wartuneultra/server/battle/BareHeroAttributes.java:94 — candidate — SHA256 d000d46dec46cd3a4c185bc3cea71b688121a04af82df3f015f5e568e9dbc18d
  `int power = attribute.applyAsInt("Power") + allocated[0];`
- apps/game-server/src/main/java/com/wartuneultra/server/battle/BareHeroAttributes.java:98 — candidate — SHA256 d000d46dec46cd3a4c185bc3cea71b688121a04af82df3f015f5e568e9dbc18d
  `int totalPower = bonus.apply(power, "Power");`
- apps/game-server/src/main/java/com/wartuneultra/server/battle/BareHeroAttributes.java:118 — candidate — SHA256 d000d46dec46cd3a4c185bc3cea71b688121a04af82df3f015f5e568e9dbc18d
  `long capacity = V097Power.calculate(new V097Power.Effective(`
- apps/game-server/src/main/java/com/wartuneultra/server/battle/BattleService.java:882 — candidate — SHA256 141478b09e2086dc74b9f2366ff5fe7996e6065c8824558862f9ee11a65b5cfb
  `int fightingCapacity, int troopVolume) {`
- apps/game-server/src/main/java/com/wartuneultra/server/battle/BattleService.java:885 — candidate — SHA256 141478b09e2086dc74b9f2366ff5fe7996e6065c8824558862f9ee11a65b5cfb
  `int fightingCapacity) {`
- apps/game-server/src/main/java/com/wartuneultra/server/battle/BattleService.java:887 — candidate — SHA256 141478b09e2086dc74b9f2366ff5fe7996e6065c8824558862f9ee11a65b5cfb
  `fightingCapacity, 0);`
- apps/game-server/src/main/java/com/wartuneultra/server/battle/BattleService.java:950 — candidate — SHA256 141478b09e2086dc74b9f2366ff5fe7996e6065c8824558862f9ee11a65b5cfb
  `List.copyOf(learned), List.copyOf(sons), attributes.fightingCapacity(), attributes.troopVolume());`
- apps/game-server/src/main/java/com/wartuneultra/server/battle/BattleService.java:955 — candidate — SHA256 141478b09e2086dc74b9f2366ff5fe7996e6065c8824558862f9ee11a65b5cfb
  `BareHeroAttributes effective = effectiveHeroAttributes(characterId, templateId, grade);`
- apps/game-server/src/main/java/com/wartuneultra/server/battle/BattleService.java:958 — candidate — SHA256 141478b09e2086dc74b9f2366ff5fe7996e6065c8824558862f9ee11a65b5cfb
  `effective.fightingCapacity(), effective.troopVolume());`
- apps/game-server/src/main/java/com/wartuneultra/server/battle/BattleService.java:961 — candidate — SHA256 141478b09e2086dc74b9f2366ff5fe7996e6065c8824558862f9ee11a65b5cfb
  `public BareHeroAttributes effectiveHeroAttributes(long characterId, int templateId, int grade) {`
- apps/game-server/src/main/java/com/wartuneultra/server/battle/BattleService.java:963 — candidate — SHA256 141478b09e2086dc74b9f2366ff5fe7996e6065c8824558862f9ee11a65b5cfb
  `: effectiveAttributes.calculate(characterId, templateId, grade);`
- apps/game-server/src/main/java/com/wartuneultra/server/battle/BattleService.java:990 — candidate — SHA256 141478b09e2086dc74b9f2366ff5fe7996e6065c8824558862f9ee11a65b5cfb
  `return BareHeroAttributes.calculate(hero, potential.path("Data").asInt(),`
- apps/game-server/src/main/java/com/wartuneultra/server/battle/BattleService.java:1056 — candidate — SHA256 141478b09e2086dc74b9f2366ff5fe7996e6065c8824558862f9ee11a65b5cfb
  `BareHeroAttributes a = effectiveHeroAttributes(characterId, templateId, grade);`
- apps/game-server/src/main/java/com/wartuneultra/server/battle/EffectiveHeroAttributeService.java:32 — candidate — SHA256 34374fa993da93c961e7825c94072df08f5abe8fcaa266f2739b22ac92e95ee8
  `public BareHeroAttributes calculate(long characterId, int templateId, int grade) {`

## Implementação em ordem

1. Comparar com implementações existentes; preservar métodos equivalentes corretos e evitar duplicação de sistemas ou bônus.
2. Resolver os três vetores conforme INPUTS.md; não preencher coeficientes ausentes com valores presumidos.
3. O método player faz conversões e ponderações: confira a origem de cada atributo para não converter ou somar bônus duas vezes.
4. Conectar a projeção única usada pela batalha e pelos snapshots do herói/PlayerInfo; comparar equipado, sem equipamento e com passivas.

## Aceitação

- [ ] equipar e retirar atualiza poder e atributos
- [ ] mesmo estado produz mesmo poder após F5
- [ ] guardião e arma rara usam o método correspondente

## Lacunas declaradas pela extração

- Base weights and conversion rates must be supplied from resolved authoritative character state; no defaults inferred.
- Does not aggregate equipment, skills, pets or buffs; their final attribute vectors are inputs.
- No database, protocol dispatch or runtime integration is enabled.

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
    "path": "apps/game-server/src/main/java/com/wartuneultra/server/battle/BareHeroAttributes.java",
    "method": "BareHeroAttributes",
    "signature": "public BareHeroAttributes(int maxHp, int physicalAttack, int magicAttack, int physicalDefence, int magicDefence, int forceHit, int parry, int fightingCapacity, int troopVolume)",
    "startLine": 20,
    "endLine": 25,
    "sha256": "d000d46dec46cd3a4c185bc3cea71b688121a04af82df3f015f5e568e9dbc18d",
    "bodySha256": "4158e550127a0d2ef5c5d4e806e2916004012c0b9086681aa09f16c9bbe0215b",
    "evidenceContext": {
      "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
      "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
      "testId": "integration-contracts.mjs",
      "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
      "scope": "STATIC_EXTRACTION_NOT_LIVE"
    }
  },
  {
    "path": "apps/game-server/src/main/java/com/wartuneultra/server/battle/BareHeroAttributes.java",
    "method": "BareHeroAttributes",
    "signature": "public BareHeroAttributes(int maxHp, int physicalAttack, int magicAttack, int physicalDefence, int magicDefence, int forceHit, int parry, int fightingCapacity)",
    "startLine": 26,
    "endLine": 31,
    "sha256": "d000d46dec46cd3a4c185bc3cea71b688121a04af82df3f015f5e568e9dbc18d",
    "bodySha256": "3f12e416d3eded1c3af4d12ffd34ec6e9f8582969047eddfc51329819f6b5a61",
    "evidenceContext": {
      "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
      "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
      "testId": "integration-contracts.mjs",
      "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
      "scope": "STATIC_EXTRACTION_NOT_LIVE"
    }
  },
  {
    "path": "apps/game-server/src/main/java/com/wartuneultra/server/battle/BareHeroAttributes.java",
    "method": "calculate",
    "signature": "public static BareHeroAttributes calculate(JsonNode hero, int potentialPoints)",
    "startLine": 33,
    "endLine": 35,
    "sha256": "d000d46dec46cd3a4c185bc3cea71b688121a04af82df3f015f5e568e9dbc18d",
    "bodySha256": "26813b8343f08284f1022d855140cb9231a38ea45f1870df5facdb80615d79f8",
    "evidenceContext": {
      "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
      "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
      "testId": "integration-contracts.mjs",
      "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
      "scope": "STATIC_EXTRACTION_NOT_LIVE"
    }
  },
  {
    "path": "apps/game-server/src/main/java/com/wartuneultra/server/battle/BareHeroAttributes.java",
    "method": "calculate",
    "signature": "public static BareHeroAttributes calculate(JsonNode hero, int potentialPoints, ToIntFunction<String> attribute)",
    "startLine": 43,
    "endLine": 46,
    "sha256": "d000d46dec46cd3a4c185bc3cea71b688121a04af82df3f015f5e568e9dbc18d",
    "bodySha256": "c59a574bb2ede3d5bd455e27e8056c05a00e3fe0a2531158778314deba441cba",
    "evidenceContext": {
      "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
      "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
      "testId": "integration-contracts.mjs",
      "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
      "scope": "STATIC_EXTRACTION_NOT_LIVE"
    }
  },
  {
    "path": "apps/game-server/src/main/java/com/wartuneultra/server/battle/BareHeroAttributes.java",
    "method": "calculate",
    "signature": "public static BareHeroAttributes calculate(JsonNode hero, int potentialPoints, ToIntFunction<String> attribute, Modifiers bonus)",
    "startLine": 76,
    "endLine": 134,
    "sha256": "d000d46dec46cd3a4c185bc3cea71b688121a04af82df3f015f5e568e9dbc18d",
    "bodySha256": "a4317a845620c52db2cba6f7ce62d0194280133a1e0a63776b150262432934b9",
    "evidenceContext": {
      "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
      "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
      "testId": "integration-contracts.mjs",
      "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
      "scope": "STATIC_EXTRACTION_NOT_LIVE"
    }
  },
  {
    "path": "apps/game-server/src/main/java/com/wartuneultra/server/battle/BattleService.java",
    "method": "HeroProfile",
    "signature": "public HeroProfile(int templateId, int job, int maxHp, int defaultSkill, List<Integer> learnedSkills, List<Integer> learnedSons, int fightingCapacity)",
    "startLine": 883,
    "endLine": 888,
    "sha256": "141478b09e2086dc74b9f2366ff5fe7996e6065c8824558862f9ee11a65b5cfb",
    "bodySha256": "c795f6befd24cd6e06976c5a49bdee9eb6a5e92f2fffad11def87668deb8ec3a",
    "evidenceContext": {
      "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
      "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
      "testId": "integration-contracts.mjs",
      "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
      "scope": "STATIC_EXTRACTION_NOT_LIVE"
    }
  },
  {
    "path": "apps/game-server/src/main/java/com/wartuneultra/server/battle/BattleService.java",
    "method": "heroProfile",
    "signature": "public HeroProfile heroProfile(int templateId, int grade)",
    "startLine": 919,
    "endLine": 951,
    "sha256": "141478b09e2086dc74b9f2366ff5fe7996e6065c8824558862f9ee11a65b5cfb",
    "bodySha256": "1c66eb5bc3b9c867d0a7f15b9ba02d51cf0f8b72888f0a828214db1d45590ba6",
    "evidenceContext": {
      "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
      "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
      "testId": "integration-contracts.mjs",
      "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
      "scope": "STATIC_EXTRACTION_NOT_LIVE"
    }
  },
  {
    "path": "apps/game-server/src/main/java/com/wartuneultra/server/battle/BattleService.java",
    "method": "heroProfileFor",
    "signature": "public HeroProfile heroProfileFor(long characterId, int templateId, int grade)",
    "startLine": 953,
    "endLine": 959,
    "sha256": "141478b09e2086dc74b9f2366ff5fe7996e6065c8824558862f9ee11a65b5cfb",
    "bodySha256": "2aed165b1e9cb95f3d5829cdab10fa70de934c2c624fa0f76d5f2f51ff2d32d4",
    "evidenceContext": {
      "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
      "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
      "testId": "integration-contracts.mjs",
      "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
      "scope": "STATIC_EXTRACTION_NOT_LIVE"
    }
  },
  {
    "path": "apps/game-server/src/main/java/com/wartuneultra/server/battle/BattleService.java",
    "method": "effectiveHeroAttributes",
    "signature": "public BareHeroAttributes effectiveHeroAttributes(long characterId, int templateId, int grade)",
    "startLine": 961,
    "endLine": 964,
    "sha256": "141478b09e2086dc74b9f2366ff5fe7996e6065c8824558862f9ee11a65b5cfb",
    "bodySha256": "7f1777475abe68d8613a5c37f438e763e337d0e6d53d881db00fb04a8621fae0",
    "evidenceContext": {
      "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
      "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
      "testId": "integration-contracts.mjs",
      "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
      "scope": "STATIC_EXTRACTION_NOT_LIVE"
    }
  },
  {
    "path": "apps/game-server/src/main/java/com/wartuneultra/server/battle/BattleService.java",
    "method": "heroAttributes",
    "signature": "public BareHeroAttributes heroAttributes(int templateId, int grade)",
    "startLine": 978,
    "endLine": 992,
    "sha256": "141478b09e2086dc74b9f2366ff5fe7996e6065c8824558862f9ee11a65b5cfb",
    "bodySha256": "70eca20d2cba798891d8941fae3f941016c8362fa4cf6ad3cc0062edd6049f83",
    "evidenceContext": {
      "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
      "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
      "testId": "integration-contracts.mjs",
      "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
      "scope": "STATIC_EXTRACTION_NOT_LIVE"
    }
  },
  {
    "path": "apps/game-server/src/main/java/com/wartuneultra/server/battle/BattleService.java",
    "method": "heroStats",
    "signature": "private Stats heroStats(long characterId, int templateId, int grade)",
    "startLine": 1055,
    "endLine": 1059,
    "sha256": "141478b09e2086dc74b9f2366ff5fe7996e6065c8824558862f9ee11a65b5cfb",
    "bodySha256": "e94125897a265f65effee666eb83a2ea7dd1272212415e250aff9358421c0ad0",
    "evidenceContext": {
      "commit": "65cd3732380d8ae197d483a0c16abe59a5949e6b",
      "environmentId": "checkout:65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
      "testId": "integration-contracts.mjs",
      "evidenceRunId": "65d6993f-2bf8-43ed-a60e-ab14e4dc3d1c",
      "scope": "STATIC_EXTRACTION_NOT_LIVE"
    }
  },
  {
    "path": "apps/game-server/src/main/java/com/wartuneultra/server/battle/EffectiveHeroAttributeService.java",
    "method": "calculate",
    "signature": "public BareHeroAttributes calculate(long characterId, int templateId, int grade)",
    "startLine": 32,
    "endLine": 140,
    "sha256": "34374fa993da93c961e7825c94072df08f5abe8fcaa266f2739b22ac92e95ee8",
    "bodySha256": "40990bdeaaf3cbcb0da1b44dcebbebfae5297af9bb56dc7688a1b3edfbb99a38",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/battle/EffectiveHeroAttributeService.java",
        "line": 48,
        "sha256": "34374fa993da93c961e7825c94072df08f5abe8fcaa266f2739b22ac92e95ee8",
        "kind": "sql_literal_reference",
        "snippet": "+ \"FROM character_items \"",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/battle/EffectiveHeroAttributeService.java",
        "line": 83,
        "sha256": "34374fa993da93c961e7825c94072df08f5abe8fcaa266f2739b22ac92e95ee8",
        "kind": "sql_literal_reference",
        "snippet": "String learned = jdbc.sql(\"SELECT learned_skill_ids FROM character_skill_state \"",
        "table": "character_skill_state",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/battle/EffectiveHeroAttributeService.java",
        "line": 95,
        "sha256": "34374fa993da93c961e7825c94072df08f5abe8fcaa266f2739b22ac92e95ee8",
        "kind": "sql_literal_reference",
        "snippet": "for (int[] buff : jdbc.sql(\"SELECT effect_code,magnitude FROM character_item_buffs \"",
        "table": "character_item_buffs",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/battle/EffectiveHeroAttributeService.java",
        "line": 113,
        "sha256": "34374fa993da93c961e7825c94072df08f5abe8fcaa266f2739b22ac92e95ee8",
        "kind": "sql_literal_reference",
        "snippet": "for (Building building : jdbc.sql(\"SELECT son_type,template_id FROM character_buildings \"",
        "table": "character_buildings",
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
      },
      {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/inventory/InventoryStore.java",
        "line": 118,
        "sha256": "f9fc9247cf08d01aeb2df028644e42ed4608ff8caeb08f211b72f886f96dd558",
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
        "line": 126,
        "sha256": "f9fc9247cf08d01aeb2df028644e42ed4608ff8caeb08f211b72f886f96dd558",
        "kind": "sql_literal_reference",
        "snippet": "int current = jdbc.sql(\"SELECT repute FROM characters WHERE character_id=? FOR UPDATE\")",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/inventory/InventoryStore.java",
        "line": 129,
        "sha256": "f9fc9247cf08d01aeb2df028644e42ed4608ff8caeb08f211b72f886f96dd558",
        "kind": "sql_literal_reference",
        "snippet": "jdbc.sql(\"UPDATE characters SET repute=?,version=version+1 WHERE character_id=?\")",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/inventory/InventoryStore.java",
        "line": 141,
        "sha256": "f9fc9247cf08d01aeb2df028644e42ed4608ff8caeb08f211b72f886f96dd558",
        "kind": "sql_literal_reference",
        "snippet": "+ \" FROM item_template WHERE is_virtual = 0\");",
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
        "line": 165,
        "sha256": "f9fc9247cf08d01aeb2df028644e42ed4608ff8caeb08f211b72f886f96dd558",
        "kind": "sql_literal_reference",
        "snippet": "\"SELECT COUNT(*) FROM item_template WHERE is_virtual = 0\");",
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
        "line": 192,
        "sha256": "f9fc9247cf08d01aeb2df028644e42ed4608ff8caeb08f211b72f886f96dd558",
        "kind": "sql_literal_reference",
        "snippet": "+ \"FROM characters WHERE character_id = ?\")",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/inventory/InventoryStore.java",
        "line": 209,
        "sha256": "f9fc9247cf08d01aeb2df028644e42ed4608ff8caeb08f211b72f886f96dd558",
        "kind": "sql_literal_reference",
        "snippet": "jdbc.sql(\"SELECT character_id FROM characters WHERE character_id = ? FOR UPDATE\")",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/inventory/InventoryStore.java",
        "line": 222,
        "sha256": "f9fc9247cf08d01aeb2df028644e42ed4608ff8caeb08f211b72f886f96dd558",
        "kind": "sql_literal_reference",
        "snippet": "Long current = jdbc.sql(\"SELECT next_item_instance_id FROM characters \"",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/inventory/InventoryStore.java",
        "line": 228,
        "sha256": "f9fc9247cf08d01aeb2df028644e42ed4608ff8caeb08f211b72f886f96dd558",
        "kind": "sql_literal_reference",
        "snippet": "jdbc.sql(\"UPDATE characters SET next_item_instance_id = ? WHERE character_id = ?\")",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/inventory/InventoryStore.java",
        "line": 253,
        "sha256": "f9fc9247cf08d01aeb2df028644e42ed4608ff8caeb08f211b72f886f96dd558",
        "kind": "sql_literal_reference",
        "snippet": "return jdbc.sql(\"SELECT \" + ITEM_COLUMNS + \" FROM character_items WHERE character_id = ? \"",
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
        "line": 261,
        "sha256": "f9fc9247cf08d01aeb2df028644e42ed4608ff8caeb08f211b72f886f96dd558",
        "kind": "sql_literal_reference",
        "snippet": "return jdbc.sql(\"SELECT \" + ITEM_COLUMNS + \" FROM character_items WHERE character_id = ? \"",
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
      }
    ],
    "referencedTableNames": [
      "accounts",
      "build_orders",
      "character_buildings",
      "character_castles",
      "character_currencies",
      "character_farms",
      "character_gold_accrual",
      "character_item_buffs",
      "character_items",
      "character_skill_state",
      "characters",
      "currency_ledger",
      "farm_logs",
      "friend_groups",
      "friend_relations",
      "item_template",
      "login_sessions",
      "vip_progress"
    ],
    "migrations": [
      {
        "path": "apps/game-server/src/main/resources/db/migration/V1__identity_characters_sessions.sql",
        "line": 6,
        "sha256": "79cd1400cbb6497bfb1de59b0500facdbe2f3f6d9959679bf992ee711cef95a0",
        "kind": "migration_ddl",
        "snippet": "CREATE TABLE accounts (",
        "table": "accounts",
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
        "path": "apps/game-server/src/main/resources/db/migration/V1__identity_characters_sessions.sql",
        "line": 49,
        "sha256": "79cd1400cbb6497bfb1de59b0500facdbe2f3f6d9959679bf992ee711cef95a0",
        "kind": "migration_ddl",
        "snippet": "CREATE TABLE login_sessions (",
        "table": "login_sessions",
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
        "path": "apps/game-server/src/main/resources/db/migration/V14__skills_quests_and_building_progress.sql",
        "line": 4,
        "sha256": "80a08834211ba4f8ffe9de0fb0c905db9d244eb3a6714f692d9089be7540f98f",
        "kind": "migration_ddl",
        "snippet": "CREATE TABLE character_skill_state (",
        "table": "character_skill_state",
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
        "path": "apps/game-server/src/main/resources/db/migration/V15__bind_timed_building_upgrades.sql",
        "line": 5,
        "sha256": "5fc881adb249987469914550f5457aa1cf953c8cefc7adeb13d89bdf25c25df2",
        "kind": "migration_ddl",
        "snippet": "ALTER TABLE build_orders",
        "table": "build_orders",
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
        "path": "apps/game-server/src/main/resources/db/migration/V16__gold_refinery_city_tax_bootstrap.sql",
        "line": 3,
        "sha256": "41d2540ef7da35e99db64c18af59620657ccf1eaa4c9a401c6387b2ac12a6d18",
        "kind": "migration_ddl",
        "snippet": "CREATE TABLE character_gold_accrual (",
        "table": "character_gold_accrual",
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
        "path": "apps/game-server/src/main/resources/db/migration/V2__vip_progress_and_claims.sql",
        "line": 9,
        "sha256": "0637b8dcb6178531afe52b54cf6001ea897ec5bee88d5fe762457bd838aada2a",
        "kind": "migration_ddl",
        "snippet": "CREATE TABLE vip_progress (",
        "table": "vip_progress",
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
        "path": "apps/game-server/src/main/resources/db/migration/V27__timed_item_effects.sql",
        "line": 1,
        "sha256": "d5b487f63ebe4053368d71618c5e91b376aa2a0c6879bd711c769e66e26ec8b5",
        "kind": "migration_ddl",
        "snippet": "CREATE TABLE character_item_buffs (",
        "table": "character_item_buffs",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/AdminAccountsController.java",
        "line": 27,
        "sha256": "f0da920b4cab618574a9d50c7d8a3300b9fcd43a7505aec2eac1cca1e147fdfe",
        "kind": "admin_java_candidate",
        "snippet": "* Game accounts & characters (read models + account provisioning, without QA/DEV name prefixes). Game",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/AdminAccountsController.java",
        "line": 43,
        "sha256": "f0da920b4cab618574a9d50c7d8a3300b9fcd43a7505aec2eac1cca1e147fdfe",
        "kind": "admin_java_candidate",
        "snippet": "* Operator provisioning of a playable character.",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/AdminAccountsController.java",
        "line": 45,
        "sha256": "f0da920b4cab618574a9d50c7d8a3300b9fcd43a7505aec2eac1cca1e147fdfe",
        "kind": "admin_java_candidate",
        "snippet": "* The client creates characters through its own 28676 flow; this endpoint exists",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/AdminAccountsController.java",
        "line": 49,
        "sha256": "f0da920b4cab618574a9d50c7d8a3300b9fcd43a7505aec2eac1cca1e147fdfe",
        "kind": "admin_java_candidate",
        "snippet": "* (character, VIP progress, farm header) and nothing that belongs to gameplay.",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/AdminAccountsController.java",
        "line": 105,
        "sha256": "f0da920b4cab618574a9d50c7d8a3300b9fcd43a7505aec2eac1cca1e147fdfe",
        "kind": "admin_java_candidate",
        "snippet": "@GetMapping(\"/accounts/{accountId}/characters\")",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/AdminAccountsController.java",
        "line": 112,
        "sha256": "f0da920b4cab618574a9d50c7d8a3300b9fcd43a7505aec2eac1cca1e147fdfe",
        "kind": "admin_java_candidate",
        "snippet": "@GetMapping(\"/characters/{characterId}\")",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/AdminAccountsController.java",
        "line": 114,
        "sha256": "f0da920b4cab618574a9d50c7d8a3300b9fcd43a7505aec2eac1cca1e147fdfe",
        "kind": "admin_java_candidate",
        "snippet": "public AdminQueryStore.CharacterSummary character(@PathVariable long characterId) {",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/AdminAccountsController.java",
        "line": 116,
        "sha256": "f0da920b4cab618574a9d50c7d8a3300b9fcd43a7505aec2eac1cca1e147fdfe",
        "kind": "admin_java_candidate",
        "snippet": ".orElseThrow(() -> new AdminExceptions.NotFound(\"Character not found\"));",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/AdminAccountsController.java",
        "line": 154,
        "sha256": "f0da920b4cab618574a9d50c7d8a3300b9fcd43a7505aec2eac1cca1e147fdfe",
        "kind": "admin_java_candidate",
        "snippet": "* Creates a character for an existing account. Nickname rules are the game's own",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/AdminAccountsController.java",
        "line": 160,
        "sha256": "f0da920b4cab618574a9d50c7d8a3300b9fcd43a7505aec2eac1cca1e147fdfe",
        "kind": "admin_java_candidate",
        "snippet": "@PostMapping(\"/characters\")",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/AdminAccountsController.java",
        "line": 187,
        "sha256": "f0da920b4cab618574a9d50c7d8a3300b9fcd43a7505aec2eac1cca1e147fdfe",
        "kind": "admin_java_candidate",
        "snippet": "com.wartuneultra.server.login.LoginModels.CharacterRow character;",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/AdminAccountsController.java",
        "line": 189,
        "sha256": "f0da920b4cab618574a9d50c7d8a3300b9fcd43a7505aec2eac1cca1e147fdfe",
        "kind": "admin_java_candidate",
        "snippet": "character = loginStore.createCharacter(",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/AdminAccountsController.java",
        "line": 198,
        "sha256": "f0da920b4cab618574a9d50c7d8a3300b9fcd43a7505aec2eac1cca1e147fdfe",
        "kind": "admin_java_candidate",
        "snippet": "// The castle is what makes the character loadable: without a placement the",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/AdminAccountsController.java",
        "line": 200,
        "sha256": "f0da920b4cab618574a9d50c7d8a3300b9fcd43a7505aec2eac1cca1e147fdfe",
        "kind": "admin_java_candidate",
        "snippet": "loginStore.ensureCanonicalCastle(character.characterId());",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/AdminAccountsController.java",
        "line": 202,
        "sha256": "f0da920b4cab618574a9d50c7d8a3300b9fcd43a7505aec2eac1cca1e147fdfe",
        "kind": "admin_java_candidate",
        "snippet": "\"CHARACTER_CREATE\", \"CHARACTER\", Long.toString(character.characterId()),",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/AdminAccountsController.java",
        "line": 203,
        "sha256": "f0da920b4cab618574a9d50c7d8a3300b9fcd43a7505aec2eac1cca1e147fdfe",
        "kind": "admin_java_candidate",
        "snippet": "account.accountId(), character.characterId(), body.reason(),",
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
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/admin/AdminAccountsController.java",
        "line": 209,
        "sha256": "f0da920b4cab618574a9d50c7d8a3300b9fcd43a7505aec2eac1cca1e147fdfe",
        "kind": "admin_java_candidate",
        "snippet": ".body(Map.of(\"characterId\", character.characterId(),",
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
        "line": 35,
        "sha256": "a323467846323fca47e00ce326ac0ed3064e8cf682b836c58e3c759a5e93b9b1",
        "kind": "admin_java_candidate",
        "snippet": "public record Dashboard(long accounts, long characters, long onlineSessions,",
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
        "line": 75,
        "sha256": "a323467846323fca47e00ce326ac0ed3064e8cf682b836c58e3c759a5e93b9b1",
        "kind": "admin_java_candidate",
        "snippet": "+ \"LEFT JOIN characters c ON c.account_id = a.account_id \"",
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
        "line": 158,
        "sha256": "a323467846323fca47e00ce326ac0ed3064e8cf682b836c58e3c759a5e93b9b1",
        "kind": "admin_java_candidate",
        "snippet": "+ \"FROM characters c LEFT JOIN vip_progress v ON v.character_id = c.character_id \";",
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
        "line": 183,
        "sha256": "a323467846323fca47e00ce326ac0ed3064e8cf682b836c58e3c759a5e93b9b1",
        "kind": "admin_java_candidate",
        "snippet": "Long characters = jdbc.sql(\"SELECT COUNT(*) FROM characters WHERE 1=1\" + pChars.sql())",
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
        "line": 191,
        "sha256": "a323467846323fca47e00ce326ac0ed3064e8cf682b836c58e3c759a5e93b9b1",
        "kind": "admin_java_candidate",
        "snippet": "+ \"JOIN characters c ON c.character_id = v.character_id WHERE 1=1\"",
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
        "line": 198,
        "sha256": "a323467846323fca47e00ce326ac0ed3064e8cf682b836c58e3c759a5e93b9b1",
        "kind": "admin_java_candidate",
        "snippet": "characters == null ? 0 : characters, online == null ? 0 : online,",
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
        "line": 61,
        "sha256": "e2706f98b99ab50d1d8e1bc8d63320a2dcf82aaf6f10bf21bee23b9b555f51ab",
        "kind": "admin_java_candidate",
        "snippet": "* Creating a character is provisioning, not gameplay: it is the operator's",
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
      "method": "handleBagMove",
      "signature": "private List<OutgoingMessage> handleBagMove(Frame frame, ConnectionState state) throws ProtocolException",
      "startLine": 2242,
      "endLine": 2259,
      "sha256": "874b428ca71b3aecc934460d5a1c5dbb3b0d41ed3510527ffdc06e4a60d4d639",
      "bodySha256": "8410293be4b3a8e79189e5918e4361f91ce359fa7921c02a03a732127332a406",
      "messages": [],
      "evidence": "static_method_body",
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
      "method": "handleBagUse",
      "signature": "private List<OutgoingMessage> handleBagUse(Frame frame, ConnectionState state) throws ProtocolException",
      "startLine": 2262,
      "endLine": 2279,
      "sha256": "874b428ca71b3aecc934460d5a1c5dbb3b0d41ed3510527ffdc06e4a60d4d639",
      "bodySha256": "fd289a69a375a91905b8d045a0b4cb84aad57136fc96bd35409f26ba743f0b59",
      "messages": [],
      "evidence": "static_method_body",
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
    },
    {
      "path": "apps/game-server/src/main/java/com/wartuneultra/server/login/GameLoginHandler.java",
      "method": "heroCard",
      "signature": "private HeroCard heroCard(CharacterRow character) throws ProtocolException",
      "startLine": 2711,
      "endLine": 2784,
      "sha256": "874b428ca71b3aecc934460d5a1c5dbb3b0d41ed3510527ffdc06e4a60d4d639",
      "bodySha256": "f657ba99e8e8455f079a774f82be834ebbbf333368da7dc9742ec05337fdcdff",
      "messages": [
        "HeroMessages.SimpleHeroInfoMsg"
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
      "name": "C_BAG_MOVE",
      "value": 5005,
      "path": "modules/protocol-legacy/src/main/java/com/wartuneultra/protocol/Opcodes.java",
      "line": 36,
      "sha256": "024cdf29f6c9c59127fcd133cf09df015df4e5341f5cac82156177805465b39d",
      "direction": "C2S",
      "directionConfidence": "incoming_dispatch_case",
      "handler": "handleBagMove",
      "dispatch": {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/login/GameLoginHandler.java",
        "line": 265,
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
      "name": "C_BAG_USEITEM",
      "value": 5006,
      "path": "modules/protocol-legacy/src/main/java/com/wartuneultra/protocol/Opcodes.java",
      "line": 40,
      "sha256": "024cdf29f6c9c59127fcd133cf09df015df4e5341f5cac82156177805465b39d",
      "direction": "C2S",
      "directionConfidence": "incoming_dispatch_case",
      "handler": "handleBagUse",
      "dispatch": {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/login/GameLoginHandler.java",
        "line": 273,
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
      "name": "U_C_HERO_INFO",
      "value": 113,
      "path": "modules/protocol-legacy/src/main/java/com/wartuneultra/protocol/Opcodes.java",
      "line": 168,
      "sha256": "024cdf29f6c9c59127fcd133cf09df015df4e5341f5cac82156177805465b39d",
      "direction": "S2C",
      "directionConfidence": "outgoing_respond_call",
      "response": {
        "path": "apps/game-server/src/main/java/com/wartuneultra/server/login/GameLoginHandler.java",
        "line": 626,
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
      "name": "C_ARMY_UPDATE_GRID",
      "value": 5181,
      "path": "modules/protocol-legacy/src/main/java/com/wartuneultra/protocol/Opcodes.java",
      "line": 385,
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
    }
  ],
  "attributes": [
    "resolved primary attributes",
    "equipment and passive contributions",
    "base percent weights",
    "conversion rates",
    "resistances"
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

1. Ação: Registrar sem equipamento; equipar, substituir e retirar um item; repetir com passiva conhecida.
   Observar no cliente: Ficha, HUD e estado de batalha usam a mesma projeção e origem de dados.
   Conferir persistência: Itens/skills persistem; valores derivados são recalculados com coeficientes e taxas de origem comprovada.

2. Ação: Relogar e realizar uma edição administrativa de atributo/estado suportada pelo domínio.
   Observar no cliente: Painel e cliente convergem após o mecanismo existente de atualização; registrar se requer relogin.
   Conferir persistência: Estado autoritativo muda uma vez, auditoria registra antes/depois e a projeção não acumula bônus.

## Bloqueios explícitos

- Funcionalidade existente ainda não homologada por evidência de serviço e cliente.
- Esquema MySQL efetivo e versão Flyway não foram consultados.
- Rotas/permissões e comportamento dos editores do painel não foram testados.
- apps/game-server/src/main/java/com/wartuneultra/server/battle/BareHeroAttributes.java:17: NO_SUPPORTED_CONTAINING_METHOD
- apps/game-server/src/main/java/com/wartuneultra/server/battle/BattleService.java:882: NO_SUPPORTED_CONTAINING_METHOD
