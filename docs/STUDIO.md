# AutoForge Studio — roteiro para o Arena

O Studio reúne seis funções novas. Trabalha sobre capturas, contratos e snapshots explícitos. Gerar código ou localizar um opcode não comprova que o jogo esteja integrado.

| Função | Implementação | Resultado útil |
|---|---|---|
| 1. Flight Recorder + Causal Engine | `flight-recorder.mjs`, `cdp-recorder.mjs`, `causal-engine.mjs` | Ações, frames, erros, sessão e IDs relacionados a candidatos do código |
| 2. Implementação por contrato | `contract-generator.mjs` | Serviço Java21, handler tipado, teste executável e pontos exatos de integração |
| 3. Equivalência funcional | `equivalence.mjs` | Diferenças nos efeitos observados e estado UNVERIFIED quando faltam provas |
| 4. Invariantes | `invariants.mjs` | Conservação de tropas, quantidades, débito único, idempotência e persistência |
| 5. Reprodução orientada à falha | `replay-planner.mjs` | Plano conservador até a primeira fronteira ausente e API de execução com adaptador explícito |
| 6. Ponte runner ↔ Arena | `evidence-bridge.mjs` | Relatórios nos logs do GitHub, recuperáveis e verificados por SHA256, sem túnel público |

## Requisitos

Node22+. Java21 para compilar/testar código gerado. Nenhuma instalação npm é necessária: os módulos usam bibliotecas nativas. O observador CDP requer um navegador já aberto com depuração local habilitada; ele não abre, recarrega, fecha ou reconfigura o navegador. A API Playwright é opcional para um driver de QA já existente.

```powershell
node studio/autoforge.mjs help
npm test
```

## 1. Capture uma ação real no runner Windows

Adicione o rótulo `autoforge-recorder` somente ao runner Windows destinado a essa observação. Dispare manualmente `AutoForge Windows flight recorder` no GitHub. O workflow não é disparado por push, não instala navegadores e não executa deploy. As entradas entram por variáveis de ambiente, sem interpolação de comandos do usuário.

O processo Node desse runner precisa enxergar a sessão do navegador. Em uma sessão separada ou sem CDP habilitado a captura falha explicitamente. O workflow nunca abre uma nova sessão para contornar isso. Node22 precisa já estar instalado no runner.

Localmente, com o endpoint CDP previamente habilitado:

```powershell
node studio/autoforge.mjs record --cdp http://127.0.0.1:9222 --page-url http://127.0.0.1:5173/index.html --seconds 30 --capture-actions --commit BACKEND_SHA --out C:\CAPTURAS\caso-001
```

Faça a ação durante a janela de observação. Só coordenadas/tag de ponteiros são observadas; texto digitado, cookies, cabeçalhos e payloads brutos não são armazenados. Console e conteúdo dos frames ficam por hash/tamanho. Identificadores de personagem/conta podem existir em outras evidências: revise arquivos antes de publicar seus relatórios.

`transportOpcode=2` significa frame WebSocket binário, **não opcode do jogo**. Frames criptografados permanecem UNDECODED. Um driver Playwright existente pode fornecer `decodeFrame` revisado à API; a ferramenta não presume chave, offset nem formato. Ação recente é pista temporal. Sessão do transporte e sessão Java só são unidas se houver correspondência explícita capturada.

## 2. Relacione a captura ao backend correto

Use o `causal-context.json` gerado pelo Core sobre o checkout atual. Registre também o commit real e o hash do JAR implantado em sua evidência; `--commit` é informação declarada e não lê o processo remoto.

```powershell
node studio/autoforge.mjs diagnose --capture C:\CAPTURAS\caso-001 --context C:\ENTREGA\causal-context.json --server-log C:\LOGS\trecho-java.log --out C:\DIAGNOSTICOS\caso-001
```

O importador Java retém identificadores conhecidos e descarta o texto bruto. O diagnóstico pode correlacionar IDs iguais, mas não transforma proximidade de horário em causalidade. Capturas truncadas ficam declaradas. Métodos estáticos continuam candidatos, vinculados ao commit/hash do mapa.

## 3. Gere implementação e testes pelo contrato

```powershell
node studio/autoforge.mjs generate --contract contrato-revisado.json --backend C:\CHECKOUT\java-v1 --out C:\ENTREGAS\implementacao-001
```

O compilador suporta deltas inteiros limitados em inventário/moedas/atributos, validação, overflow e porta transacional/idempotente. Regras arbitrárias, RNG, teto de energia, tempo e SQL não são inferidos. Contratos fora dessa gramática são recusados. O exemplo `examples/studio/contract.json` é fictício e não fornece IDs ou regra oficial do Wartune.

Leia `implementation-plan.json` e `INTEGRATE.md`. A implementação real de `Transactions` deve usar as transações, locks/versionamento e idempotência persistida existentes no MariaDB. O handler tipado precisa dos codecs, sessão autenticada e mensagens reais já existentes; o cliente não pode escolher livremente o characterId. O adaptador em memória pertence somente ao teste. Nenhum comando aplica classes ao backend, altera schema ou reinicia o Java.

## 4. Compare efeitos e proteja invariantes

Registre a mesma ação/entradas no servidor de referência e no Java, com inventário/moedas antes e depois, checkpoints da interface e leitura após relogin. Anexe relatórios JSON com hashes e identidades correspondentes. Cada comparação registra o commit/ambiente/teste de cada lado; evidência do Node não é transferida ao Java.

```powershell
node studio/autoforge.mjs compare --reference referencia.json --candidate java.json --out C:\ENTREGAS\comparacao-001
node studio/autoforge.mjs audit --action java.json --rules invariantes.json --out C:\ENTREGAS\invariantes-001
```

Resultados: DIVERGENT para diferenças observadas, UNVERIFIED para lacunas e EQUIVALENT_RECORDED apenas para evidência estruturada consistente. Esse último confirma o conteúdo registrado; não é atestado independente de execução real. A forma dos relatórios está em `docs/equivalence.md`. As fixtures sem artefatos permanecem UNVERIFIED.

## 5. Prepare reprodução e entrega única

```powershell
node studio/autoforge.mjs bundle --capture C:\CAPTURAS\caso-001 --context C:\ENTREGA\causal-context.json --reference referencia.json --candidate java.json --contract contrato-revisado.json --backend C:\CHECKOUT\java-v1 --out C:\ENTREGAS\arena-001
```

O bundle reúne diagnóstico, plano de reprodução, comparação, invariantes e fontes Java. O replay preserva ações anteriores porque dependências ocultas podem existir; não se declara cenário mínimo comprovado. O comando `replay` apenas prepara o plano. `runReplay(plan,adapter,{allowActions:true})` executa um adaptador revisado, passa AbortSignal, para na primeira observação com falha/lacuna e exige autorização explícita. O adaptador precisa respeitar cancelamento para que uma ação pendente não continue após timeout.

## 6. Entregue ao Arena sem Cloudflare

O workflow do recorder publica `events.jsonl` e `capture-manifest.json` nos logs. Recupere a run correspondente:

```powershell
gh run view RUN_ID --repo vanhellsingz/autoforge --log > captura-github.log
node studio/autoforge.mjs import --log captura-github.log --expected-sha256 HASH_EXIBIDO --out C:\CAPTURAS\recuperada-001
```

Para transportar outros relatórios revisados:

```powershell
node studio/autoforge.mjs bridge --root C:\ENTREGAS\arena-001 --files studio-report.json,causal-report.json --out C:\TRANSPORTE\arena-001
```

O limite total é 2 MiB, adequado a relatórios; vídeos e capturas grandes exigem armazenamento de artefatos revisado. Logs duplicados/truncados, paths inseguros, links, hashes alterados e sobrescrita são recusados. O hash prova integridade, não autenticidade nem que um teste ocorreu. Os logs seguem as permissões/retenção do repositório; neste repositório público, publique somente evidências revisadas.

## Fluxo final para o Arena

1. Use checkout/hash atuais e capture a falha autorizada.
2. Localize a primeira fronteira sem prova: UI → C2S → handler → transação → S2C → UI → relogin.
3. Preserve o que está comprovado; não remova função só porque o scanner não a encontrou.
4. Gere somente contratos com semântica recuperada e pontos de integração exatos.
5. Rode testes específicos e compare efeitos/invariantes.
6. Faça o deploy pelo procedimento do jogo somente quando autorizado, com configuração efetiva, banco e JAR identificados. Os workflows deste projeto não fazem deploy nem controlam serviços do Wartune.
