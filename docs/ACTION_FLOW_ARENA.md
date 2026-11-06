# Fluxo de ação: motor V2, console V1 e entrega ao Arena

Use o motor `studio/slice/` para investigar **uma ação por pacote**. O console local apresenta o pacote em etapas, fatos, evidências, divergências, perguntas de captura e arquivos. Ele ajuda a encontrar a primeira fronteira quebrada entre clique, pedido, Java, persistência, resposta e tela; não demonstra sozinho que a ação funciona no jogo.

Esta integração usa o motor do V2 com a organização de leitura do V1, sem trazer Next, banco ou API de gravação da sandbox. A especificação de horizonte 2050 descreve a direção da arquitetura; suporte efetivo depende dos padrões implementados e dos testes. Não existe conversor universal de bundles LayaAir para um servidor completo.

## 1. Gerar um pacote com fontes reais

Pré-requisitos: Node.js 22+. JDK 21 é necessário quando a validação exigir compilar/executar Java. Não é preciso instalar dependências npm para o extrator ou o console.

Na raiz deste repositório, escolha o cliente que será usado e o checkout Java correspondente à investigação. Substitua os caminhos abaixo pelos caminhos conferidos. Cada `--out` deve ser novo e ficar fora das raízes do cliente e do backend; não reutilize uma pasta de evidências anterior.

```powershell
$client = 'C:\CAMINHO\CLIENTE_REAL'
$backend = 'C:\CAMINHO\CHECKOUT_JAVA'
$pack = 'C:\WartuneUltra\flow-gema-001'

git -C $backend rev-parse HEAD
git -C $backend status --porcelain
node studio/autoforge.mjs extract-flow --client $client --backend $backend --action gem-transform --out $pack
```

`gem-transform` é o nome de consulta usado pelos testes, não `gem.convert` do protótipo V1. Havendo um opcode observado e conferido para a ação, informe-o para restringir a busca:

```powershell
node studio/autoforge.mjs extract-flow --client $client --backend $backend --action gem-transform --opcode 8538 --out C:\WartuneUltra\flow-gema-002
```

O `8538` é o opcode do exemplo revisado de conversão. Confirme-o no cliente analisado; não reutilize esse número para síntese ou encantamento. A consulta e o opcode localizam candidatos; nomes semelhantes e código encontrado não comprovam que o botão executou aquele método. Se houver ambiguidade ou sintaxe não resolvida, leia as perguntas de captura e confirme o caminho em execução.

Para as outras duas falhas de itens, gere pacotes separados:

```powershell
node studio/autoforge.mjs extract-flow --client $client --backend $backend --action luck-stone-compose --out C:\WartuneUltra\flow-sorte-sintese-001
node studio/autoforge.mjs extract-flow --client $client --backend $backend --action enchant-filter --out C:\WartuneUltra\flow-sorte-encanto-001
```

O backend pode ser omitido para investigar só o cliente. Nesse caso, decoder, handler, transação e emissão Java continuam pendentes; o pacote não completa essas etapas por suposição.

## 2. Ler no console

```powershell
node studio/flow-console.mjs --package $pack --port 18768
```

Abra [o console local](http://127.0.0.1:18768). Ele atende em loopback, somente por GET, e lê o pacote informado na inicialização. Não aplica patch nem executa ações no jogo. Pare com `Ctrl+C`; para outro pacote, execute novamente com outro `--package`.

Leia nesta ordem:

1. **Etapas:** percorra as 12 fronteiras da ação, do controle de tela ao refresh/liberação do modal. Comece pela primeira divergência ou lacuna.
2. **Fatos e evidências:** confira caminho, símbolo, linha/offset e hash completo no JSON de origem. A existência de um listener ou de `@Transactional` é fato do texto; entrega do pacote e isolamento da transação exigem execução.
3. **Divergências:** trate diagnósticos de quantidade, decoder, consumo, S2C e filtro como candidatos a confirmar no cone correto da ação.
4. **Perguntas de captura:** converta cada pergunta em uma observação localizada. Mantenha sem resposta o que ainda não foi observado.
5. **Arquivos:** abra as fontes de identidade e os dados antes de revisar a proposta de patch.

Os arquivos principais são:

| Arquivo | Uso |
| --- | --- |
| `manifest.json` | Raízes analisadas, commit/estado local Java, hashes das fontes e dos artefatos. |
| `flow.json`, `flow.md` | Etapas, ligações encontradas, candidatos e lacunas. |
| `variables.json`, `protocol.json` | Origem/destino, quantidade, campos, tags wire e consumidores encontrados. |
| `rules.json` | Guardas, catálogos e proposta de contrato; validação de schema não comprova semântica. |
| `implementation.patch` | Proposta localizada para revisão; pode estar vazia ou não cobrir a falha. |
| `tests/`, `validation.json` | Casos/harness gerados, modos de execução e verificações ainda necessárias. |
| `ARENA.txt` | Instruções de entrega vinculadas àquela extração. |

## 3. Conferir identidade antes de editar

Registre o SHA completo do commit, o estado local e os SHA-256 completos de 64 caracteres. Um prefixo exibido na tela não serve para vincular uma correção. Confira os bytes de **todas** as fontes e artefatos listados, inclusive protobuf e catálogos. Este exemplo verifica os hashes gravados pelo extrator:

```powershell
$manifest = Get-Content -LiteralPath (Join-Path $pack 'manifest.json') -Raw | ConvertFrom-Json
foreach ($artifact in $manifest.artifacts.PSObject.Properties) {
    $actual = (Get-FileHash -LiteralPath (Join-Path $pack $artifact.Name) -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $artifact.Value) { throw "Artefato diferente: $($artifact.Name)" }
}
foreach ($group in @('client', 'protobuf', 'catalogs', 'backend')) {
    $sourceRoot = if ($group -eq 'backend') { $backend } else { $client }
    foreach ($source in $manifest.sources.$group.files) {
        $actual = (Get-FileHash -LiteralPath (Join-Path $sourceRoot $source.path) -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($actual -ne $source.sha256) { throw "Fonte diferente: $group/$($source.path)" }
    }
}
$manifest.sources.backend | Select-Object commit, dirty, dirtyFiles
git -C $backend rev-parse HEAD
git -C $backend status --porcelain
```

O commit do checkout não identifica automaticamente o JAR em execução. Para prova no jogo, registre também ambiente, identificação do teste, commit implantado, SHA-256 do JAR e digest do cliente realmente carregado. Se as fontes mudarem, gere outro pacote. Hashes conferidos demonstram consistência dos bytes referenciados; não demonstram execução, correção semântica ou autenticidade de um relato externo.

## 4. Próximas ações para os bugs relatados

### Gema nível 12, quantidade 1, e desaparecimento

Reproduza primeiro com uma única gema nível 12. Registre template, instância/slot, vínculo, origem, destino e quantidade selecionada. Exporte a bolsa completa antes/depois e marque como sentinelas outras gemas, inclusive outra pilha do mesmo template. Compare separadamente:

1. Controle de quantidade e argumento enviado: `1`, controle do usuário ou tamanho total da pilha. Não substitua toda ocorrência de `.count`; confirme a expressão exata do clique.
2. Campos do pedido, tags protobuf e argumentos retornados por `Request.decode`. Confirme direção origem → destino nos bytes reais. A inversão `wire9`/`wire10` é uma hipótese verificável, não a explicação automática de toda perda.
3. Receita, nível permitido, posse/vínculo, saldo e espaço antes do consumo. Rejeição deve conservar bolsa e saldo. Consumo, cobrança e concessão devem ser atômicos no serviço/transação existente.
4. Resultado persistido, S2C, modelo e tela. Repita com bolsa sem espaço, quantidade inválida, pedido repetido e falha de concessão em ambiente descartável. Confira sentinelas, F5 e novo login.

Um pacote pode localizar `CLIENT_STACK_QUANTITY_FORCED`, `JAVA_WIRE_FIELD_SWAP` ou `JAVA_CONSUME_BEFORE_VALIDATION`. Confirme cada ocorrência no método realmente chamado antes de corrigir. Não imponha uma unidade se a ação também oferece lote válido; preserve o controle de quantidade comprovado pelo cliente.

### Pedra da sorte sintetizada sem refresh imediato

Use `luck-stone-compose`. Capture a mesma operação com identificadores de sessão/pedido e acompanhe: gravação/concessão → resposta S2C → sincronização da bolsa → consumidor → mutação do modelo → rebuild/refresh da lista e contador → liberação do modal.

Determine a primeira fronteira faltante antes de acrescentar eventos. Se o banco recebeu o item, mas nenhum S2C da bolsa saiu, corrija a emissão no fluxo existente. Se o S2C chegou e o modelo mudou, investigue a atualização da tela. Reabrir a janela ou relogar pode ajudar a localizar a falha, mas o critério de aceitação é o item aparecer imediatamente após a síntese e continuar correto após F5/relogin, sem concessão duplicada.

### Pedra da sorte ausente na seleção do encantamento

Use `enchant-filter`. Identifique o template real no catálogo analisado e confira `MasterType`, `SonType`, propriedades, vínculo e outras restrições usadas no filtro. Os números de template/categoria das fixtures são exemplos sintéticos.

Siga o predicado do seletor e a validação autoritativa do encantamento. Demonstre que a pedra deveria ser elegível pela regra recuperada; estar catalogada não basta. Corrija o predicado ou a projeção do item no ponto exato, preservando itens inelegíveis. Valide presença no seletor, escolha, pedido, aceitação/rejeição do Java, consumo correto, resultado e refresh. Não habilite toda uma categoria para contornar um único item ausente.

### Preservar o que já funciona

Antes do patch, grave baselines atuais de conversão de nível 1 nas direções usadas pelo jogador, abertura do baú de bronze e campanha persistida. Repita os mesmos casos após a correção, no mesmo cliente e condições equivalentes. Para campanha, confira progresso e recompensa após sair e entrar novamente; para baú, compare abertura, consumo e recompensa conforme a regra de sorteio observada.

O manifesto [player-incidents.json](examples/player-incidents.json) já contém `gema-nivel-12`, `conversao-gema-nivel-1`, `bau-bronze` e `campanha-persistida`. Gere um plano novo e siga [o guia de incident-replay](INCIDENT_REPLAY.md) para preencher capturas de referência/candidata e seus hashes:

```powershell
node studio/autoforge.mjs incident-replay --cases docs/examples/player-incidents.json --out C:\WartuneUltra\flow-preservacao-plano-001
node studio/autoforge.mjs incident-replay --cases docs/examples/player-incidents.json --evidence C:\CAMINHO\EVIDENCIAS_REAIS --backend $backend --out C:\WartuneUltra\flow-preservacao-comparacao-001
```

O manifesto atual não inclui os dois casos da pedra da sorte. Crie um manifesto revisado para síntese e elegibilidade, com etapas observáveis e oráculo independente, em vez de apresentar esses casos como já cobertos.

## 5. Estados de validação separados

| Escopo | O que permite concluir | O que ainda falta |
| --- | --- | --- |
| `STATIC` | Relação encontrada nos bytes analisados, com seus limites e premissas. | Confirmar caminho executado, estado e comportamento do jogo. |
| `SOURCE_REPLAY` | Trecho isolado realmente executado para aquelas entradas e hashes. | Integração com serviço, transação, banco, transporte e UI reais. |
| `RUNTIME` | Ação observada no ambiente/cliente/JAR identificados, com os checkpoints registrados. | Generalizar para outras entradas ou versões exige evidência adicional. |

Mantenha três avaliações independentes. `RESOLVED`, porcentagem de cobertura ou `COMPLETE_STATIC_AND_WIRE` não significam gameplay homologado. `PARTIAL_NEEDS_CAPTURE`, `DYNAMIC_UNRESOLVED`, `UNVERIFIED` e perguntas abertas indicam trabalho restante. Sem erro detectado também não significa ausência de erro.

Execute os testes gerados para verificar o harness, mas confira o que eles realmente executam. Casos calculados a partir dos mesmos achados do extrator, mapas AST, expectativas geradas e modelos de bolsa não são um oráculo independente nem demonstram que o patch foi aplicado. Detectar JDK não equivale a executar o decoder. Para aceitar a correção, reproduza a falha antes e passe depois usando o método real, sem mudar a expectativa para acomodar a implementação.

Para o caso estreito de direção da gema, o adaptador existente executa trechos revisados do emissor cliente e do decoder Java. Ele recusa fontes fora do padrão revisado e exige JDK; continua sendo `SOURCE_REPLAY`:

```powershell
node studio/examples/gem-wire-repro.mjs --client $client --backend $backend --out C:\WartuneUltra\flow-gema-source-replay-001
node studio/autoforge.mjs incident-replay --cases C:\WartuneUltra\flow-gema-source-replay-001\cases.json --evidence C:\WartuneUltra\flow-gema-source-replay-001\evidence --out C:\WartuneUltra\flow-gema-source-comparacao-001
```

As fixtures e `studio/examples/gem-wire-recorded/` comprovam somente seus exemplos identificados. Não os renomeie como captura atual do servidor nem preencha lacunas com valores esperados.

## 6. Suporte atual e limites

| Consulta | Situação prática |
| --- | --- |
| `gem-transform` | Padrões de sender, quantidade, protobuf e decoder exercitados por fixtures; confirmação nas fontes reais é obrigatória. |
| `luck-stone-compose`, `enchant-filter` | Casos sintéticos exercitam diagnóstico de sincronização/refresh e elegibilidade. A semântica real exige catálogo, fluxo e captura correspondentes. |
| `troop-recruit` | Exercita extração em bundle ES5 de linha única e quantidade por controle em fixture. Não certifica formação/persistência de tropas. |
| `chest-open`, `map-settle`, `bonus-apply` | Presets de busca disponíveis. Não equivalem a implementação ou homologação de baús, campanhas, RNG ou bônus. |
| Outra `--action` com `--opcode` opcional | Busca pelos padrões reconhecidos. Resolução parcial ou ausente exige captura/adaptador revisado. |

Não estão resolvidos genericamente: dispatch dinâmico, aliases sem papel demonstrável, gramática arbitrária do bundle/Java, coerções numéricas gerais, estado do banco, locks/isolamento, RNG autoritativo, execução do JAR implantado e comportamento completo da UI. Inteiros acima de `2^53 - 1` exigem tratamento exato; não aceite arredondamento silencioso como identidade. Presença de uma transação no texto não prova atomicidade sob falha ou concorrência.

Uma proposta de contrato ou patch pode exigir correção manual. Revise os campos, limites, deltas e opcodes de `rules.json`; não promova valores exemplificativos/defaults a regras do jogo. Evite gerar um novo serviço paralelo quando o ajuste cabe no decoder, serviço, transação ou consumidor existente.

## 7. Entregar a correção estreita

Entregue ao Arena o pacote íntegro, fontes/commit correspondentes e evidências que confirmam a primeira falha. Revise `implementation.patch` por arquivo e hunk; confirme o hash base. Se cliente e Java estiverem em raízes diferentes, separe a revisão por raiz. Não aplique cegamente um diff misto na raiz do Java. Preserve alterações locais existentes e atualize o patch quando os bytes mudarem.

Depois da correção, execute os testes relevantes do backend, o repro independente antes/depois, a validação em banco descartável e as capturas de UI/persistência. Registre limitações abertas e repita os casos de preservação. Esta ferramenta não faz deploy nem reinicia serviços.

Prompt pronto para o Arena:

```text
Use docs/ACTION_FLOW_ARENA.md e o pacote NEW_DIR gerado por extract-flow com o cliente e checkout Java reais. Confira SHA completo, dirty e todos os hashes do manifest; identifique separadamente o JAR e cliente em execução. Leia etapas, fatos, evidências, divergências e captureQuestions. Ache a primeira fronteira comprovadamente quebrada. Priorize gema nível 12 quantidade 1 sem perda de sentinelas; depois refresh da síntese e elegibilidade da pedra da sorte no encantamento. Não trate fixtures, cobertura estática ou testes derivados do mesmo achado como prova runtime. Reproduza antes e depois com oráculo independente; revise um patch mínimo no fluxo existente, sem criar sistema paralelo. Preserve conversão nível 1, baú de bronze e campanha após relogin. Entregue diff, commit/hashes das fontes, evidências por STATIC/SOURCE_REPLAY/RUNTIME, testes realizados e lacunas restantes. Não faça deploy por este pedido.
```
