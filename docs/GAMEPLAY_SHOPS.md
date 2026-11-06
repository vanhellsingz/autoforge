# Atlas de lojas e contratos de compra

APIs: `buildShopAtlas({client,...limits})` e `evaluatePurchase({atlas,offerId,quantity,state,binding,operationId,actorId,client?})`, em `studio/gameplay/shops.mjs`.

O atlas descobre os catálogos `shop`, `mall`, `store`, `exchange` e `wish`, junto ao catálogo de itens para resolver referências. Inclui lojas comuns/múltiplos ShopType, cidades externas, céu, navegação, desejos, passe, atividades e trocas. Todo campo original, tabela, rowKey e hash é preservado. Famílias ou schemas desconhecidos permanecem explícitos. Não existe um número de lojas presumido como universal para qualquer versão do cliente.

As ofertas têm IDs compostos: `t_s_shop:10001`, `t_s_wishgachashop:10001`, etc. `ShopId`, `MapShopId` e `TemplateId` são usados quando `Id` não existe; IDs repetidos recebem sufixo de linha, sem escolher uma oferta arbitrariamente. Tabelas de configuração/RNG relacionadas também ficam disponíveis, mas não viram uma compra funcional só por terem sido encontradas.

O dossiê da oferta apresenta campos candidatos de recompensa, custos, limites, modificadores e referências de item. `Currency=208105` só ser igual a um TemplateId não comprova que aquela moeda seja um item consumível: a ligação de domínio vem do contrato revisado. `Count`, `Discount`, `Random`, `Prob`, `Vipp0..19` e campos equivalentes não recebem semântica presumida.

## Contrato mínimo revisado

```json
{
  "schemaVersion":1,
  "offerId":"t_s_shop:10001",
  "reviewed":true,
  "source":{"path":"res/release/config/t_s_shop-HASH.json","sha256":"SHA256_REAL","rowKey":"$[\"t_s_shop\"][0]"},
  "evidence":[{"path":"res/release/config/t_s_shop-HASH.json","sha256":"SHA256_REAL"}],
  "rewards":[{"itemField":"ItemId","unitQuantity":1}],
  "costs":[{"domain":"currencies","key":"boundBalens","amountField":"GiftToken"}]
}
```

Os valores acima são ilustrativos, não regras oficiais do Wartune. Cada regra deve corresponder ao cliente e ao backend observados. O contrato precisa cobrir **todos os campos de custo não zero**; omitir uma segunda moeda bloqueia a compra. SHA/path/rowKey devem apontar para a oferta exata. `reviewed:true` é uma declaração do revisor, não prova semântica automática nem homologação.

Recompensas aceitam `itemField` com `quantityField` ou quantidade unitária explicitamente revisada; também aceitam `pairField` com formato estrito `templateId,quantidade`. Custos aceitam domínio `inventory`/`currencies`, `amountField` mais `key` ou `keyField`. Uma loja de desejos pode declarar `{"domain":"inventory","pairField":"HowMuch"}`. A função não inventa a interpretação de um par diferente desse formato.

`stock:{field:"Count",key:"wish-stock"}` exige o saldo de estoque **atual** em `state.stock`; não reinicia o estoque pelo valor inicial do catálogo. `limits:[{field:"WeeklyLimit",key:"weekly-period",unlimitedValue:-1}]` exige o contador atual em `state.purchases`. O significado do período/reset fica no adaptador real. Regras de elegibilidade usam campos originais com `gte`, `lte` ou `eq` e estado observado de nível/classe/VIP/guilda. Modificadores ativos desconhecidos bloqueiam; fórmulas de desconto/RNG não são deduzidas de um número.

O estado aceito é `{characterId,currencies,inventory,stock,purchases,receipts,eligibility?}`. `actorId` precisa corresponder ao personagem da sessão. Mapas monetários/itens aceitam inteiros não negativos e arithmetic overflow é recusado. A quantidade multiplica simultaneamente todos os custos e recompensas. Todos os débitos são validados antes de calcular a cópia do próximo estado. Insuficiência de qualquer recurso, limite ou estoque rejeita tudo.

O `operationId` gera um fingerprint do contrato/oferta/quantidade/personagem. Uma repetição exata retorna `REPLAY_RECORDED` sem novo débito; reutilizar o ID com outra quantidade gera conflito. Isso valida a projeção fornecida: a persistência de idempotência e a concorrência reais precisam ser implementadas pelo backend.

## Estados e integração correta

- `BLOCKED`: contrato/fonte/campo/regra desconhecidos ou estado sem prova suficiente; não há plano de concessão.
- `REJECTED`: rejeição de recursos/limites/estoque ou conflito de repetição; o estado fica intacto.
- `PLAN_READY_REVIEWED_BINDING`: deltas puros calculados conforme o contrato revisado. `runtime` continua `UNVERIFIED`.
- `REPLAY_RECORDED`: a projeção contém um recibo correspondente; não comprova que o banco já persiste recibos.

O Arena deve conectar o plano à transação MariaDB existente: autenticação/propriedade da sessão, locks/versionamento, débito/concessão/estoque/contadores/recibo atômicos, rollback e snapshots S2C reais. Depois deve demonstrar UI, F5 e relogin, inclusive duas requisições concorrentes e repetidas. Esta ferramenta não escreve banco, não compra, não concede itens e não executa deploy.
