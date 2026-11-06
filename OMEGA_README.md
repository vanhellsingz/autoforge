# AutoForge OMEGA 2.7.0

Orquestrador local de diagnóstico estático: AST LayaAir + protocolo Protobuf + Java slice, AutoForge Plus e Radar de candidatos a lacunas. Não altera código do jogo, bancos ou serviço.

- `npm run omega -- focus --client CLIENT_DIR --backend JAVA_DIR --action gem --opcode 8538`
- `npm run omega -- verify --client CLIENT_DIR --backend JAVA_DIR --action gem --opcode 8538`
- `npm run omega -- radar --client CLIENT_DIR --backend JAVA_DIR`

Os resultados ficam no diretório irmão `autoforge-omega-workspace`, com histórico em `runs/` e ponteiros `LATEST_MISSION.json/.md` e `LATEST_RADAR.json`.

**Importante**: `verify` compara apenas evidência estática. Não equivale à execução real C2S → handler → MariaDB → S2C → UI → relogin.

`runExtractFlow` impõe limites à varredura do cliente (50 mil entradas, 256 MiB de fontes). No caso do cliente completo do Wartune, prepare um checkout reduzido com JS/Protobuf/catálogos relevantes.