# Cinco funções novas — branch isolada

Branch: `feature/items-logs-intelligence`, criada a partir da main `a08cabd0b61a76e179bb6c12ec4b732fc7a0361f`. A main, o checkout do Arena e o servidor em execução não são modificados por estas ferramentas.

| Função | Comando | O que entrega |
|---|---|---|
| Índice de itens | `index`, `search` | Todos os campos originais, nomes/traduções, tipos, categorias, IDs assinados, fontes/hashes e páginas de busca |
| Explicação de item | `explain` | Dossiê de campos/referências, destinos encontrados/ausentes e semânticas ainda não comprovadas |
| Cobertura e cenários | `scenarios` | Quais itens possuem contrato, casos de sucesso/rejeição/replay/F5/relogin e bloqueios explícitos |
| Captura automática de logs | `logs` | Leitura incremental, offsets e hashes, linhas parciais/UTF8, rotação/truncamento e descarte de texto sensível |
| Incidentes relacionados aos itens | `incidents`, `log-bundle`, `recover-logs` | Sintomas com template correto, contratos de resposta, referências de código e pacote recuperável pelos logs do GitHub |

Node22+. Sem dependências npm ou instalação de ferramentas. Os comandos criam somente pastas novas de saída. A captura não controla processos, não executa SQL e não tenta elevar permissões. O runner precisa apenas de permissão de leitura no arquivo de log.

## Primeiro: leitura dos itens

```powershell
node studio/items/autoforge.mjs index --client C:\xampp\htdocs --out C:\ENTREGAS\itens-001
node studio/items/autoforge.mjs search --index C:\ENTREGAS\itens-001\item-index.json --query pocao --limit 20 --out C:\ENTREGAS\busca-001
node studio/items/autoforge.mjs explain --index C:\ENTREGAS\itens-001\item-index.json --id 208001 --client C:\xampp\htdocs --out C:\ENTREGAS\item-208001
node studio/items/autoforge.mjs scenarios --index C:\ENTREGAS\itens-001\item-index.json --contracts contratos-revisados.json --out C:\ENTREGAS\cenarios-001
```

Use a raiz do cliente que realmente quer analisar. O índice local consultado nesta implementação tinha **5.464 itens em 16 tabelas**, incluindo IDs negativos; isso descreve aquele snapshot, não garante que qualquer outro build tenha as mesmas contagens. Cada execução registra seu próprio `sourceDigest` e limites de cobertura. O dossiê pode conferir os hashes contra o cliente antes de explicar o item.

O índice pode ter dezenas de MiB. Ele é armazenado localmente e não é automaticamente publicado como evidência. Original `Property1`, `Property2` etc. não são convertidos em recompensas ou efeitos por intuição. Referência resolvida não equivale a funcionalidade pronta no backend.

Guias detalhados: [catálogos e dossiês](ITEM_CATALOGS.md), [contratos de cenários](ITEM_SCENARIOS.md).

## Segundo: captura automática sem Cloudflare

Não execute a coleta enquanto o operador não escolher o arquivo/intervalo. Uma vez iniciada, a leitura é automática e não exige cliques no cliente:

```powershell
node studio/items/autoforge.mjs logs --file C:\WartuneUltra\logs\java-live.log --from end --seconds 30 --commit BACKEND_SHA --environment windows-dev --test-id caso-item-001 --out C:\ENTREGAS\logs-001
node studio/items/autoforge.mjs log-bundle --capture C:\ENTREGAS\logs-001 --index C:\ENTREGAS\itens-001\item-index.json --out C:\ENTREGAS\incidente-001
```

`--from end` ignora o histórico anterior e observa apenas novos registros. `--from start` lê o arquivo desde o começo, respeitando limites. Cada captura é uma janela de 1 a 300 segundos na CLI. Não existe alegação de histórico contínuo entre jobs separados; cursor/rotação/limites/linhas descartadas ficam no manifest. Não é instalado nenhum daemon, serviço Windows ou tarefa agendada.

Só campos conhecidos de eventos são exportados. Mensagens livres, stacks completos, cookies, credenciais, URLs e payloads brutos não são copiados. O JSON inclui apenas identificadores aprovados, classe de erro quando reconhecida, números observados, hash da linha e offsets. Identificadores de conta/sessão ainda podem ser dados internos: revise a política de visibilidade do repositório antes de habilitar a publicação automática. O pacote faz uma verificação adicional de conteúdo sensível e falha em vez de publicar um conteúdo recusado.

Detalhes: [coletor incremental](SERVER_LOG_CAPTURE.md).

## Pelo GitHub, usando esta branch sem tocar na main

Foi estendido **somente nesta branch** o workflow já conhecido pelo GitHub, `autoforge-flight-recorder.yml`. Isso permite selecionar `--ref feature/items-logs-intelligence`, sem registrar um workflow novo na main.

O runner Windows destinado à leitura precisa ter o rótulo `autoforge-recorder` e Node22+. A ferramenta não altera rótulos, permissões, serviço do runner ou UAC automaticamente. Se o runner estiver ocupado pelo Arena, o job aguarda na fila; não interrompe o trabalho dele.

```powershell
gh workflow run autoforge-flight-recorder.yml --repo vanhellsingz/autoforge --ref feature/items-logs-intelligence -f mode=server-logs -f log_file=C:\WartuneUltra\logs\java-live.log -f seconds=30 -f backend_commit=BACKEND_SHA
```

O job lê o arquivo durante a janela, diagnostica os eventos e publica um Evidence Pack nos próprios logs do GitHub. Não abre túnel HTTP e não depende da cota de upload-artifact. O mode `browser` anterior foi preservado e não é executado em mode `server-logs`.

Depois da conclusão do job:

```powershell
gh run view RUN_ID --repo vanhellsingz/autoforge --log > github-run.txt
node studio/items/autoforge.mjs recover-logs --file github-run.txt --out C:\ENTREGAS\logs-recuperados-001
```

O pacote verifica hashes e recusa arquivo alterado, truncado, paths inseguros ou destino existente. Os logs do GitHub podem não ficar disponíveis integralmente pela API até o job terminar; esta solução não promete streaming em tempo real. O tamanho é limitado a 2 MiB por pacote. A CLI do coletor limita eventos/bytes para favorecer capturas pequenas e marca truncamento explicitamente.

## Como o Arena deve usar os incidentes

1. Confira commit, ambiente, teste e hash do JAR quando informado; são identidades declaradas, não inspeção do processo implantado.
2. Use `templateId` para ligar o evento ao catálogo. `itemId` de instância não identifica automaticamente um template.
3. Leia o dossiê do item e o contrato observado antes de implementar seu efeito.
4. Um opcode ignorado ou um erro registrado é sintoma. Não comprova, por si só, qual método está errado.
5. Para detectar ausência de resposta, forneça `--response-contracts` com `[{requestOpcode,responseOpcodes,windowMs}]`. Sem janela completa, continuidade e IDs de sessão/request correspondentes, o resultado é UNVERIFIED.
6. Compare inventário/moedas/UI/persistência com os verificadores já existentes. Cenários planejados nunca são contados como executados.
7. Preserve as funcionalidades existentes. Nenhuma dessas funções aplica patch, migra banco ou faz deploy.

## Prompt pronto para o Arena

> Use a branch feature/items-logs-intelligence do repositório vanhellsingz/autoforge; não faça merge nem altere a main sem instrução. Leia docs/ITEMS_LOGS_START.md. Gere o índice do cliente efetivo, consulte o dossiê de cada família e use somente contratos com evidência correspondente aos hashes. Para coletar logs, use o workflow existente com --ref desta branch e mode=server-logs, ou o comando logs no runner autorizado. Recupere o Evidence Pack pelos logs do GitHub. Relacione somente templateIds e IDs de sessão/request comprovados. Preserve desconhecidos como UNVERIFIED, teste a implementação no seu checkout e não reinicie serviços por causa destas ferramentas.
