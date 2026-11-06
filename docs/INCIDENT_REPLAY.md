# Comparar um incidente de jogador em duas versões

Use `incident-replay` para localizar a primeira etapa em que a versão em teste difere de uma referência conhecida. A comparação é local e usa arquivos exportados pelo operador. O comando dispensa conexão com o cliente, o servidor e o banco de dados.

## Começar pelo relato

Na raiz do AutoForge, gere o plano em uma pasta nova.

```powershell
node studio/autoforge.mjs incident-replay --cases docs/examples/player-incidents.json --out replay-plano-001
```

Abra `ARENA.md` para identificar o que observar em cada etapa. O `report.json` registra o `contractDigest` de cada caso. Os modelos em `coleta/<caseId>.json` têm campos por preencher e servem apenas para preparar as capturas. A primeira execução deixa explícita a evidência que falta.

Execute a reprodução registrada da conversão de gemas, obtida com o emissor do cliente e o decodificador Java executado isoladamente no commit `bd19b3581981891ec82d339abba8bfbcf2b49254`.

```powershell
node studio/autoforge.mjs incident-replay --cases studio/examples/gem-wire-recorded/cases.json --evidence studio/examples/gem-wire-recorded/evidence --out replay-gemas-001
```

O resultado identifica origem `2050101` e destino `2050201` sendo interpretados em sentido inverso pelo Java analisado. Para reproduzir com as fontes atuais, use `node studio/examples/gem-wire-repro.mjs --client CLIENTE --backend CHECKOUT_JAVA --out NOVO`, depois execute `incident-replay` sobre os arquivos `cases.json` e `evidence` gerados. O adaptador exige JDK e confere os trechos de código revisados antes de executá-los isoladamente. Uma mudança nesses trechos pode exigir atualizar o adaptador. O escopo registrado é `SOURCE_REPLAY`.

| Prioridade | Casos do manifesto | O que distinguir |
|---|---|---|
| Agora | Uma única gema de nível 12 e conversão de nível 1 entre vida e DEFM | Conseguir selecionar uma unidade, direção solicitada, resultado entregue e perda de outras gemas. |
| Agora | Formação de tropas e baú fantasma no chão após a morte do monstro | Capacidade disponível e tropas efetivamente alocadas. No baú, separar aparecimento, clique, resposta e recompensa. |
| Preservar | Baú de bronze e campanha persistida | Registrar uma abertura que funcionou e conferir o progresso da campanha após sair e entrar novamente. |
| Medir agora | EXP de VIP 19 | Os 50% são uma hipótese do relato. Isolar encontro, EXP base, outros bônus e arredondamento antes de propor uma fórmula. |
| Depois | Salão dos Heróis | Retomar quando as prioridades acima tiverem evidência. |

## Preparar as duas capturas

1. Escolha um caso. Execute a mesma ação na referência e na candidata em contas de teste equivalentes. Fixe cliente, entradas e pré-condições, inclusive nível, saldo, vínculos, pilhas e bônus que influenciem o resultado. Para checar o sentido inverso da conversão, faça outra dupla de capturas, em outra pasta de evidências.
2. Preencha um JSON por execução. Use `role` igual a `reference` ou `candidate`, o `caseId` e o `contractDigest` do plano. Registre `identity.commit` com o SHA completo do backend executado, `identity.environment` com `name` e `kind`, `identity.testId`, e `clientDigest` com o SHA-256 do mesmo cliente nos dois lados. Use identidades de teste distinguíveis e rastreáveis.
3. Registre a ação em `action: {"type": "...", "inputs": {...}}` e as condições em `preconditions`. Correlacione cada observação com a execução por `sessionId` e `operationId`. Preencha `steps` na ordem do manifesto, com `id`, `sessionId`, `operationId` e `value`. Se faltar uma etapa, deixe a lacuna explícita. Inventar um resultado para completar o arquivo esconde a coleta necessária.
4. Em etapas `json`, use os mesmos campos e unidades nas duas versões. IDs de instância variam entre contas. Ao exportar, dê o mesmo nome semântico ao item correspondente (por exemplo `origem`, `destino`, `sentinela`) e preserve template, vínculo, posição escolhida e quantidades. Guarde no registro de teste a ligação dos nomes com as instâncias observadas.

Em uma etapa `inventory`, exporte **todas as pilhas** antes e depois, inclusive gemas alheias à conversão. Um exemplo fictício de `value` para uma operação que retirou uma unidade vinculada e concedeu uma unidade de outro template é

```json
{
  "before": [{"templateId":101,"bound":true,"quantity":1},{"templateId":303,"bound":false,"quantity":4}],
  "after":  [{"templateId":202,"bound":true,"quantity":1},{"templateId":303,"bound":false,"quantity":4}]
}
```

A comparação de inventário mede a variação por template e vínculo. Se duas pilhas tiverem a mesma chave, a etapa `sentinelas` distingue qual delas mudou. Para um baú com sorteio, uma concessão diferente merece investigação da semente, da tabela e das condições da execução antes de alterar a regra.

## Comparar e entregar ao Arena

Na pasta de evidências, salve um índice com o ID exato do caso como nome de arquivo, por exemplo `evidencias/conversao-gema-nivel-1.json`. Cada lado aponta para um JSON relativo à raiz de evidências e seu SHA-256 em hexadecimal minúsculo. Calcule o hash dos arquivos finais, por exemplo com `(Get-FileHash .\evidencias\traces\vida-ref.json -Algorithm SHA256).Hash.ToLowerInvariant()`.

```json
{
  "reference": {"path":"traces/vida-ref.json","sha256":"SUBSTITUIR_PELO_SHA256_DA_REFERENCIA"},
  "candidate": {"path":"traces/vida-cand.json","sha256":"SUBSTITUIR_PELO_SHA256_DA_CANDIDATA"}
}
```

```powershell
node studio/autoforge.mjs incident-replay --cases docs/examples/player-incidents.json --evidence evidencias --backend "C:\CHECKOUT-ARENA\java-v1" --out replay-comparado-001
```

Omitir `--backend` permite comparar somente as capturas. Com o checkout indicado, o relatório procura os nomes exatos de métodos Java listados em `symbols`. Confira arquivo, linhas e hashes antes de abrir o método. Uma declaração encontrada orienta a leitura do código. A ligação com o clique do jogador depende da captura de execução.

Leia a primeira diferença ou lacuna antes de sugerir um patch. Uma diferença identifica o comportamento divergente daquela dupla. Uma lacuna pede nova coleta na etapa indicada. Se as etapas coincidirem, a equivalência vale para a ação, as entradas e as condições registradas. Depois de uma correção, capture novamente a candidata e rode também os dois casos de preservação.
