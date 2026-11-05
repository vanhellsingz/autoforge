# Equivalência funcional e invariantes

`studio/equivalence.mjs` exporta `compareAction(reference, candidate, options)`. Ele compara a semântica da ação e suas entradas, deltas e estado final do inventário/moedas, checkpoints da interface e leitura persistida depois de relogin. Instâncias de itens são normalizadas por `templateId` + `bound`, somando quantidades; IDs de instância diferentes entre contas não criam uma divergência artificial.

O schema é demonstrado em `examples/studio/reference-action.json` e `java-action.json`. Ambos são **fixtures sem artefatos**, portanto o resultado correto é `UNVERIFIED`, mesmo com valores iguais. Eles não demonstram funcionamento do Wartune.

## Estados

- `DIVERGENT`: os registros fornecidos contêm uma diferença explícita na ação, efeito, interface ou persistência. O relatório continua informando quais provas faltam.
- `UNVERIFIED`: não houve diferença observada, mas falta identidade, artefato correspondente, checkpoint, projeção ou relogin. RNG marcado `unobserved` continua não verificado.
- `EQUIVALENT_RECORDED`: todos os efeitos solicitados coincidem e os artefatos estruturados correspondem. Isso atesta a consistência dos **registros**, sem provar independentemente que a execução ocorreu.

Por padrão são exigidos `inventory`, `currencies`, `ui` e `persistence`. `options.fields` pode selecionar um recorte explícito, incluindo `attributes`. O relatório registra esse recorte; uma comparação de moedas não homologa o inventário. `options.tolerances` aceita apenas chaves `attributes.NOME` com valores finitos não negativos. Quantidades e moedas nunca recebem tolerância.

## Artefatos verificáveis

Cada registro precisa de `identity:{commit,environment:{name,kind},testId}`. Commits dos dois lados podem ser diferentes; o artefato de cada lado deve corresponder exatamente à sua própria identidade e ação.

Use `artifacts:[{path,sha256,format:"json-report"}]` e informe `options.baseDir` ou `referenceBaseDir`/`candidateBaseDir`. Cada caminho é relativo à base, limitado a arquivo regular de até 8 MiB, sem travessia nem links. O arquivo JSON contém `schemaVersion:1`, `identity`, `action`, `before`, `after`, `ui`, `persistence`, `result:"passed"` e `checks:[{id,result:"passed"}]`. Os campos da ação/snapshots precisam reproduzir o registro correspondente; somente declarar `passed` não basta. Artefatos `opaque` conferem integridade, sem comprovar efeitos.

Os registros precisam ser produzidos pelo executor de testes autorizado. Não fabrique arquivos com resultados esperados para rotulá-los como execução real. Gravar uma fixture ilustrativa ou comparar o próprio JSON não transforma a fixture em teste do cliente.

## Invariantes de estado

`studio/invariants.mjs` exporta `auditInvariants(record,{rules:[]})`, sem mutações. Verificações padrão: inventário/moedas não negativos e inteiros seguros; persistência após relogin. Ações `troops.withdraw` e `troops.mobilize` também exigem conservar `before/after.troops.{reserve,deployed}` por tipo de tropa. Os mapas aceitam IDs como `{"1001":79}`.

Regras adicionais suportadas:

```json
[
  {"type":"currencyDebit","currency":"gold","amount":20},
  {"type":"inventoryDelta","templateId":208001,"bound":true,"delta":-1},
  {"type":"idempotentReplay"}
]
```

A última exige `record.operationId`, `record.replay.operationId` correspondente e `record.replay.after`, obtido ao reenviar a mesma operação pelo teste. Esse resultado deve coincidir com `after`, sem novo débito ou grant. Sem identidade da operação repetida o resultado continua não verificado. Resultados: `PASS_RECORDED`, `FAIL`, `UNVERIFIED`. Regras desconhecidas são recusadas; nenhuma expressão JS, SQL ou comando é executado. Nenhum dos dois módulos liga, desliga, migra ou publica um servidor.
