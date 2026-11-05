# Flight Recorder + Causal Engine

Observa uma pagina Playwright **ja aberta**; o modulo nao abre browsers, nao realiza login e nao inicia/encerra servicos. Playwright pertence ao ambiente autorizado do runner: nao ha download, npm install ou bootstrap automatico. Um observador pode acompanhar cliques manuais no Opera/Chrome somente quando o ambiente ja fornecer uma pagina automatizavel; uma janela comum sem conexao de automacao nao e capturavel por este adaptador.

```js
import {createFlightRecorder, attachFlightRecorder} from './studio/flight-recorder.mjs';
const recorder = createFlightRecorder({out:'capture-new',identity:{
  commit:'COMMIT_EXATO_40_HEX',environment:{name:'windows-runner',kind:'CLIENT_SESSION'},
  // jarSha256: hash do JAR comprovadamente utilizado, se disponivel
}});
const detach = await attachFlightRecorder(page,{recorder,captureActions:true,
  // decodeFrame(bytes, {direction,socketId}) { return [{opcode,sessionId,requestId,actionId}]; }
  // Somente fornecer um decoder revisado para este protocolo/estado da sessao.
});
// O operador usa a pagina normalmente. Checkpoints aprovados podem ser registrados:
recorder.record({kind:'checkpoint',actionId:'sell-1',data:{boundary:'ui',gold:123}});
await detach();
recorder.close();
```

O decoder opcional e uma funcao fornecida explicitamente pelo programa chamador, nunca carregada de codigo externo pelo JSON. Sem ele, frames criptografados recebem hash/tamanho e opcode desconhecido. Nao ha tentativa de adivinhar numero do opcode a partir de bytes cifrados. Uma decodificacao pode devolver varios frames. Capturas guardam `events.jsonl` e `capture-manifest.json`; `readCapture(dir)` verifica integridade, contagem e sequencia. A identidade declarada precisa ser confirmada pelo procedimento do runner, nao e atestacao do processo ativo.

Cada evento tem `schemaVersion:1,runId,sessionId,actionId,requestId,timestamp,sequence,kind,data`, com direction C2S/S2C e opcode opcional. Kinds: action, frame, console, error, lifecycle, server, checkpoint. `record()` aceita eventos aprovados pelo chamador; `frame()` grava hash/tamanho, nunca payload. Console/erros guardam somente tipo/hash/tamanho, sem o texto. URLs de socket guardam somente origin; cliques guardam coordenadas e tipo do elemento, sem texto de inputs. Ainda assim, snapshots fornecidos pelo integrador devem ser revisados para evitar dados sensiveis. Limites de tempo, bytes e eventos sinalizam `truncated`, sem declarar cobertura completa.

`correlateTrace(events, causalContext)` liga apenas identificadores explicitos na mesma sessao. `recentActionHint` e um indício temporal e fica separado. Fontes/metodos do mapa estatico sao candidatos, nunca prova de chamada em runtime. `javaLogEvent(line)` importa somente campos conhecidos de linhas Java com timestamp, event e sessionId, sem persistir a linha bruta.

`parseServerLog(text,{identity,runId,maxEvents,maxBytes})` aceita logs estruturados JSON e linhas Java conhecidas. Retorna `{events,identity,sourceSha256,ignoredLines,truncated}`; os eventos tem sequencia propria e somente campos permitidos. Reindexe as sequencias ao combinar com outra captura e preserve a origem de cada registro. Linhas sem sessionId/timestamp/event ficam ignoradas, sem inventar vinculo pela proximidade no relogio.

Para falhas de UI: capture a acao, localize o primeiro limite sem evidencia (C2S, resposta, mutacao, UI, persistencia), verifique o candidato no commit correto e complete os checkpoints de estado no verificador de equivalencia. Frame presente ou HTTP200 nao demonstra inventario, recompensa ou relogin corretos.
