# AutoForge 2.4

Uma execução prepara uma pasta para o Arena com Java21 compilado, comparações JS/Java, evidências, inventário e instruções de integração. Sem dependências npm.

## Começar

Node20+ e JDK21 no PATH (ou JAVA_HOME). Na raiz do Ultra:

```powershell
node tools/autoforge-v2/run.mjs
```

O padrão usa os assets preservados na raiz do checkout e salva em `../autoforge-v2-output`, fora do cliente. Para o cliente local do servidor:

```powershell
node tools/autoforge-v2/run.mjs --client C:\WartuneUltra\client-qa-java-v1 --out C:\WartuneUltra\autoforge-entrega
```

No Windows também existe `tools\autoforge-v2\autoforge.cmd` com os mesmos argumentos. `--help` mostra as opções. Apenas investigação, sem exigir Java: acrescente `--discover-only`.

## O que faz

- Descobre nomes de assets com hash, recusando versões ambíguas.
- Inventaria catálogos, famílias de itens, candidatos de código e protocolos. Hash e offsets UTF8 permitem voltar ao ponto de origem. Mensagens/opcodes são evidências estáticas, sem captura do tráfego.
- Extrai custo, chance, requisitos e limiar de confirmação do encantamento comum.
- Gera FightingCapacity de personagem, guardião e arma rara com vetores de atributos, coeficientes e taxas explícitos.
- Extrai o vocabulário conhecido de condições de missão e lista tipos ainda sem nome.
- Compila todos os quatro tipos Java e compara fórmulas contra transcrições JS revisadas independentes. Falha diante de fonte desconhecida, divergência ou compilador ausente. Se o cliente mudar durante a execução, a entrega é recusada.
- Gera manifest com hashes e entrega ao instalador. Uma falha invalida o manifest anterior e informa a etapa exata em handoff.json.

## Entrega guiada para o Arena

`CAUSAL_CONTEXT.md` e `causal-context.json` acrescentam navegação por inventário, equipamentos, vendas, forja, tropas, campanhas e poder: métodos exatos, assinaturas, linhas, hash do arquivo/corpo, chamadas candidatas, opcodes e tabelas citadas. O Arena deve localizar a primeira falha entre ação → handler → serviço/transação → resposta → atualização da interface. O scanner não resolve tipos/overloads nem infere execução; cortes de cobertura e ausência de provas ficam explícitos. Isso evita tratar um método encontrado como uma funcionalidade pronta.

Acrescente `--backend CAMINHO_JAVA_V1` ao comando de geração. Além das classes e evidências, ele produz `COMECE_AQUI.md`, quatro tarefas numeradas, `INPUTS.md`, `arena-plan.json`, `RESULTADO_ARENA.md` e `arena-steps.ps1`.

Cada tarefa lista métodos gerados, referências e candidatos no backend com linha/hash, contratos, lacunas e verificações. Imports e chamadas são evidência de referência, sem comprovar o funcionamento do sistema.

Para preparar uma entrega já gerada, sem repetir as comparações:

```powershell
node tools/autoforge-v2/prepare.mjs --from CAMINHO_DA_ENTREGA --backend CAMINHO_JAVA_V1 --client CLIENTE_REAL
```

O verificador confere os hashes das classes, relatórios e fontes do cliente. Ele recusa evidência alterada ou fonte diferente. A origem estática do relatório e o comportamento no cliente em execução continuam sendo evidências distintas.

Atalho Windows (na pasta de entrega):

```powershell
.\arena-steps.ps1 -ToolRoot CAMINHO_TOOLS_AUTOFORGE_V2 -Backend CAMINHO_JAVA_V1 -Client CLIENTE_REAL
```

Por padrão faz verificação, planejamento e prévia. Acrescente `-ApplyGenerated` para instalar os tipos gerados. O script não compila nem reinicia o jogo; a conexão dos serviços continua descrita nas quatro tarefas.

## Commit, estado existente, MySQL e painel

A fila agora acrescenta os seis pontos de integração: commit/estado local analisado, método exato quando resolvido, classificação com evidências, dependências SQL/admin/protocolo, instruções de adição/preservação e provas no jogo.

- `analysis-snapshot.json`: HEAD real do checkout e hashes dos arquivos, incluindo a indicação de alterações locais. Não presume que esse commit é o JAR em execução.
- `integration-contracts.json`: métodos com assinatura/linhas e opcodes/handlers observados. Sintaxe não suportada e direções não resolvidas ficam explícitas.
- `data-admin-map.json`: SQL referenciado, migrations relacionadas e candidatos de componentes/rotas do painel. Não consulta o banco.
- `MYSQL_ADMIN.md` e `MYSQL_PREFLIGHT.sql`: contrato de integração e consultas somente leitura para conferir esquema e Flyway na conexão escolhida.
- `IMPLEMENTATION_STATES.md` e `ASSESSMENT_TEMPLATE.json`: estados ausente/parcial/funcional/divergente declarados por revisão. Sem comprovação fica `unverified`.

Para anexar uma revisão, acrescente `--assessment REVISAO.json` a `prepare.mjs` ou `run.mjs`. O schema é `{schemaVersion:1, assessments:[{rule,status,commit,sourceHashes:[{path,sha256}],evidence:[{kind,id,description,result}]}]}`. Status aceitos: `absent`, `partial`, `functional`, `divergent`. `functional` exige declarações de teste e runtime aprovadas; `divergent` exige comparação independente divergente. Commit e hashes devem corresponder ao checkout analisado. A ferramenta valida metadados; não certifica artefatos externos citados.

O atalho PowerShell aceita `-Assessment REVISAO.json`. Replanejamento preserva o relatório preenchido `RESULTADO_ARENA.md` e o template de avaliação existente. Não criar migrations/tabelas apenas porque uma fórmula foi extraída; reaproveitar transações, serviços, permissões e auditoria. Conferir o esquema efetivo antes de definir a próxima migration.

## Instalar classes no backend

```powershell
node tools/autoforge-v2/integrate.mjs --from C:\WartuneUltra\autoforge-entrega --backend C:\CAMINHO\java-v1
node tools/autoforge-v2/integrate.mjs --from C:\WartuneUltra\autoforge-entrega --backend C:\CAMINHO\java-v1 --apply
```

O primeiro comando só mostra a prévia. O segundo instala os tipos no pacote `com.wartuneultra.autoforge.v2`. Arquivos existentes sem marca da ferramenta e arquivos gerados editados à mão provocam conflito. Hashes, caminhos e alterações entre planejamento e escrita são conferidos. As escritas são atômicas por arquivo; a instalação de vários arquivos não é uma transação única.

A integração instala funções puras. Conectar chamadas, projeções de atributos, persistência, protocolo, transações e aplicar o JAR exige o trabalho descrito em [PROMPT_ARENA.md](PROMPT_ARENA.md). A ferramenta não reinicia o jogo. A ausência de corpo no pacote de encantamento não demonstra ausência do material: consultar os slots persistidos.

## Entregáveis

- `discovery.json`: catálogos, famílias de itens, candidatos, opcodes e schemas parciais; limites de busca explícitos.
- `generated/*.java`: quatro tipos Java.
- `*.evidence.json`: fontes, expressões, entradas, comparações e lacunas.
- `manifest.json`: arquivos e hashes, com estado validated.
- `handoff.json`: resultado, etapas e instruções.
- `PROMPT_ARENA.md`: ordem de integração e aplicação.

Exemplo real validado: [examples/validated](examples/validated). É um snapshot de evidência; execute novamente contra o cliente que for usar. Os exemplos não representam todos os sistemas implementados.

## Verificação

```powershell
node --test tools/autoforge-v2/tests/*.test.mjs
```

O scanner não executa os bundles. Os geradores só emitem a gramática suportada. Fluxos arbitrários e sintaxe diferente dos padrões conhecidos falham e exigem novo adaptador. Encontrar milhares de itens não implementa seus efeitos. Agregação completa de equipamentos, skills, pets, montarias, efeitos consumíveis, handlers e migrações continua fora do recorte automatizado atual.

[REFERENCES.md](REFERENCES.md) explica as metodologias aproveitadas de REA/reverse-skill. Nenhum script externo desses projetos foi executado.

### Escopo de validade por evidência

`evidence-lineage.json` vincula cada relatório pelo SHA256 ao commit de fonte resolvido (ou null explícito), ao ambiente e ao teste/extrator. Evidências estáticas de métodos, SQL, painel e protocolo recebem `evidenceContext`. `EVIDENCE_LINEAGE.md` explica os escopos. Nenhuma evidência da análise comprova automaticamente a versão implantada.

Cada entrada de `evidence` em uma avaliação precisa também de `commit`, `environment:{name,kind}` e `testId`. Evidência `runtime` exige `deployment:{commit,jarSha256}`, com commit correspondente à revisão. Metadados de uma branch antiga ou artefato diferente são recusados; referências externas continuam declaradas pelo revisor, sem execução automática de seus testes.

## Proteções 2.4 antes da instalação

`prepare.mjs --backend ...` gera `backend-snapshot.json`. `integrate.mjs --apply` agora exige esse snapshot e confere commit, destino, conjunto de arquivos críticos e hashes antes de criar arquivos temporários e novamente antes dos renames. Alterar, adicionar ou remover Java, migrations, painel, protocolo ou configuração de build bloqueia a aplicação. Regere a fila no backend ativo. O pacote de classes geradas é tratado separadamente para permitir instalação idempotente. O atalho `-ApplyGenerated` usa o planejamento existente; não o regenera silenciosamente.

Artefatos de avaliações usam `artifacts:[{path,sha256,format}]`, relativos ao arquivo de avaliação. Formatos: `opaque` (log/vídeo: somente integridade), `junit` (estrutura, contagens e falhas, sem identidade de implantação), `json-report` (resultados e identidade). Uma classificação `functional` exige relatório JSON aprovado que corresponda ao commit, ambiente, testId e, para runtime, commit/hash do JAR. O relatório tem `{schemaVersion:1,commit,testId,environment:{name,kind},result,checks:[{id,result}],deployment?:{commit,jarSha256}}`. A ferramenta confirma a consistência dos resultados registrados, sem provar por si só que o teste realmente ocorreu.

Fontes externas são opt-in e somente leitura:

```powershell
node tools/autoforge-v2/prepare.mjs --from ENTREGA --backend JAVA_V1 --editor-root legado=C:\xampp\htdocs\2
```

Não existe leitura automática de `htdocs\2`. A ferramenta não executa PHP, SQL ou HTTP, não grava no editor e exclui configurações/credenciais, dependências, backups e links. Formulário e chamada de gravação são candidatos distintos e permanecem sem prova de persistência. Raízes configuradas são preservadas ao replanejar a mesma entrega, e os hashes são conferidos antes do apply. Para escolher outro conjunto sem herdar raízes, use uma nova pasta de entrega. O atalho Windows aceita `-EditorRoot` para planejamento.

A CI `AutoForge isolated validation` usa runner hospedado, Node22 e Java21 e não faz deploy. Cada execução identifica seu próprio SHA. Testes, geração, verificação e publicação de evidências nos logs são obrigatórios; apenas o transporte adicional via upload-artifact é opcional, para não bloquear pela cota de armazenamento. A falha de upload é mostrada como aviso explícito.

## Recuperar evidências sem depender da cota de artefatos

O passo `Publish verifiable evidence` guarda JUnit e relatório JSON completos em base64 com SHA256. Baixe os logs da run correspondente (por exemplo, `gh run view RUN_ID --repo vanhellsingz/ultra --log > run.log`) e execute:

```powershell
node tools/autoforge-v2/ci-evidence.mjs recover run.log PASTA_NOVA
```

Bytes alterados, logs truncados, bundles duplicados e tentativas de sobrescrever arquivos são recusados. O relatório JSON identifica commit, ambiente, teste e run; comprova somente a validação da ferramenta. Logs precisam permanecer disponíveis no GitHub; exporte-os para retenção duradoura. Uma CI verde não demonstra integração de gameplay nem deploy.
