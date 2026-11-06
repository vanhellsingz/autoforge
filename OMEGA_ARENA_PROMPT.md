# AutoForge OMEGA — Instruções para o Arena.ai

Use o OMEGA como **orquestrador de análise estática**, sem confundir relatórios com gameplay validado.

## 1. Investigar ação específica

```powershell
npm run omega -- focus --client "C:\xampp\htdocs" --backend "C:\WartuneUltra\java-source\java-v1" --action "gem" --opcode 8538
```

> Observação: o `extract-flow` subjacente limita a varredura a 50.000 entradas e 256 MiB de fontes JS/JSON. Se `htdocs` exceder o limite, use uma cópia *somente de leitura* contendo o bundle, os Protobuf e catálogos necessários. Não apague arquivos do cliente.

O comando cria `autoforge-omega-workspace/runs/<id>/slice-package`, `plus-scan` e um dossiê único. Leia primeiro `LATEST_MISSION.md`; use `flow.json`, `ARENA.md`, `repro.json` e relatórios do Plus para evidências detalhadas.

## 2. Encontrar candidatos com o Radar

```powershell
npm run omega -- radar --client "C:\xampp\htdocs" --backend "C:\WartuneUltra\java-source\java-v1"
```

O Radar identifica **candidatos** de divergência; regex e ausência de `switch case` não comprovam ausência de handler. O opcode real vem de `clientValues` da matriz; frames WebSocket de transporte não são opcodes do jogo.

## 3. Corrigir no escopo e reexaminar

Faça somente alterações Java autorizadas, consultando o cliente como fonte de protocolo. Não modificar contas protegidas, `htdocs\2`, tutorias já funcionais ou efetuar deploy sem autorização.

```powershell
npm run omega -- verify --client "C:\xampp\htdocs" --backend "C:\WartuneUltra\java-source\java-v1" --action "gem" --opcode 8538
```

`verify` compara a análise **estática** com o dossiê anterior da mesma ação. `STATIC_NO_FINDINGS_RUNTIME_UNVERIFIED` **não é** PASS no jogo. Só declarar funcional após evidências C2S → handler → MariaDB → S2C → UI → relogin em ambiente controlado.

## 4. Limites de operação

`focus`, `radar` e `verify` não executam JAR, não modificam SQL, não reiniciam Java/runner e não fazem merge/deploy. Cada execução cria pasta nova. O `LATEST_MISSION` é sobrescrito deliberadamente no workspace, preservando histórico em `runs/`.