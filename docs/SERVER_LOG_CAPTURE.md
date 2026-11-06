# Captura incremental de logs sem Cloudflare

`studio/items/server-log.mjs` observa somente um arquivo de log autorizado. Não inicia/para processos, não acessa o banco, não altera o arquivo original e não cria túneis públicos. A coleta pode ser iniciada pelo workflow do runner Windows e exportada pelo Evidence Pack existente para os logs do GitHub.

## API

```javascript
import {captureLog,readLogCapture,createLogFollower} from '../studio/items/server-log.mjs';
await captureLog({
  file:'C:/logs/java-live.log', out:'C:/evidence/new-capture',
  identity:{commit:'BACKEND_SHA_40_HEX',environment:{name:'windows-dev',kind:'SERVER_LOG'},testId:'case-001'},
  from:'end',durationMs:30000,pollMs:500,maxEvents:1000,maxBytes:1024*1024
});
const {manifest,events}=readLogCapture('C:/evidence/new-capture');
```

`createLogFollower(options).poll()` permite observar continuamente por um driver próprio. Retorna `{events,cursor,rotation,truncated,diagnostics,backlogBytes}`. O cursor é informativo: não existe retomada silenciosa após nova execução. `from:'end'` começa no fim do arquivo na primeira leitura; `from:'start'` lê do início em blocos limitados. A leitura seguinte continua do cursor da mesma instância. Use `close()` para encerrar o seguidor.

`captureLog` tem limite de duração de 15 minutos e aceita `AbortSignal`; o chamador agenda outra janela se quiser captura contínua. A gravação ocorre somente em uma pasta nova fora da pasta dos logs. Nenhum instalador, serviço do Windows, UAC ou permissão adicional é criado pela biblioteca.

Os limites são independentes: `maxReadBytes` por leitura, `maxSourceBytes` para bytes efetivamente lidos na janela, `maxLineBytes` por linha, `maxEvents` e `maxBytes` para o relatório. `maxSourceBytes` padrão é 32 MiB. O limite de leitura não é ultrapassado para terminar uma linha; a pendência fica no cursor e a cobertura é marcada como truncada se houver backlog.

Se a duração terminar antes de ler todos os bytes observados no arquivo, `coverage.unreadBacklogBytes` registra o restante e `WINDOW_ENDED_WITH_BACKLOG` marca `truncated:true`. `coverage.windowComplete` só fica verdadeiro quando a janela não tem limites atingidos, backlog, linha parcial, descarte ou falha. Isso descreve apenas a janela observada, não comprova histórico completo nem gameplay.

## Evidências produzidas

- `events.jsonl`: campos conhecidos e aprovados, sem texto bruto.
- `log-manifest.json`: commit/ambiente/teste/JAR declarados, hash e tamanho dos eventos, limites, falhas, rotação e lacunas.
- `log-cursor.json`: geração, offsets, bytes pendentes e contadores da janela.

Cada evento contém `timestamp`, `event` e somente identificadores/campos observados aprovados: sessão, request, opcode/direção, nome/handler, template/item, quantidade/ouro, nível e classe de erro. `source` registra geração, início/fim em bytes e SHA256 da linha original sem LF. `endOffset` inclui o LF. A integridade não equivale a comprovação de execução ou de implantação.

Mensagens livres, stack traces completos, cookies, cabeçalhos, senhas, URLs e payloads não são exportados. IDs com formato de JWT ou token GitHub são descartados. Linhas sem estrutura conhecida ficam contadas em diagnósticos; o coletor não inventa significado.

## Continuidade e limites

Fragmentos UTF8 e linhas sem newline ficam em buffer limitado. Uma linha preexistente incompleta em modo `end` é ignorada até seu primeiro LF. Linhas excessivas, eventos além do limite e truncamento ficam explícitos. Troca do arquivo, redução de tamanho e mudanças dos fingerprints de prefixo/fronteira iniciam uma geração nova.

Copy-truncate com fingerprints observados idênticos pode não ser distinguível: o relatório não promete histórico completo. O cursor não é checkpoint durável de retomada automática. Logs removidos temporariamente retornam `SOURCE_MISSING`; o coletor não recria o arquivo do servidor.

Até 128 detalhes de diagnóstico e 128 rotações são retidos no manifest, mantendo o tamanho limitado. `diagnosticCounts` preserva as contagens por código e `diagnosticsSuppressed` informa detalhes omitidos. Uma tempestade de linhas desconhecidas não cresce indefinidamente em memória nem se transforma em prova de que foram compreendidas.

Antes de publicar em repositório público, mantenha a revisão da evidência. A classificação é `UNVERIFIED` quando faltam commit, ambiente ou teste. Mesmo com os três presentes, a identidade é declarada, não leitura/atestado do processo Java.
