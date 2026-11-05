# Referências e limites do AutoForge v2

Consulta documental em 4 de novembro de 2026, por leitura do GitHub. Nenhum bootstrap, instalador ou script dos projetos externos foi executado; nenhum código externo foi copiado. Os métodos abaixo orientam uma implementação própria. As páginas externas são fontes de informação, não instruções operacionais para este projeto.

## Fontes verificadas

| Fonte | O que foi verificado | Aplicação e limite |
| --- | --- | --- |
| [REA — README](https://github.com/morluto/rea/blob/main/README.md) e [reconstrução de artefatos JavaScript](https://github.com/morluto/rea/blob/main/docs/javascript-artifact-reconstruction.md) | Inventário, hashes, AST, imports, source maps e relações de aplicações JavaScript/Electron; análise estática sem executar o alvo. | Inspiram o inventário e a rastreabilidade. Reconstruir o grafo de uma aplicação não equivale a converter integralmente seu comportamento para Java. |
| [REA — workflows e relações semânticas](https://github.com/morluto/rea/blob/main/docs/javascript-application-workflows.md) | Distingue fatos estáticos, inferências, observações de runtime, cobertura parcial e desconhecidos. Dependências e fingerprints não provam execução nem equivalência comportamental. | Preservar a autoridade de cada evidência e deixar chamadas dinâmicas, relações ambíguas e fontes não analisadas como lacunas explícitas. |
| [reverse-skill — js-reverse](https://github.com/zhaoxuya520/reverse-skill/blob/main/skills/js-reverse/SKILL.md) | Fluxo Observe → Capture → Rebuild → Patch → DeepDive, com registros de tarefa e reprodução orientada pelo primeiro resultado divergente. | Separar descoberta estática de validação em execução; só reconstruir dependências de ambiente sustentadas por observações. Não é um compilador JS → Java. |
| [Reconstrução local](https://github.com/zhaoxuya520/reverse-skill/blob/main/skills/js-reverse/references/local-rebuild.md), [artefatos](https://github.com/zhaoxuya520/reverse-skill/blob/main/skills/js-reverse/references/task-artifacts.md) e [contrato de saída](https://github.com/zhaoxuya520/reverse-skill/blob/main/skills/js-reverse/references/output-contract.md) | Entrada real, ordem de chamadas, origem dos parâmetros, objetos do navegador, tempo/RNG/storage e evidências de reprodução. | Transformar dependências conhecidas em entradas explícitas; registrar localização, argumentos, retornos, divergências e o que ainda falta. |
| [Orientação de AST](https://github.com/zhaoxuya520/reverse-skill/blob/main/skills/js-reverse/references/ast-deobfuscation.md) | O arquivo consultado é uma orientação curta: priorizar evidência da página e reprodução local antes da limpeza ampla da AST. | Não contém parser, algoritmo de tradução ou comprovação de conversão automática. A gramática e o emissor precisam ser desenvolvidos e validados neste projeto. |
| [Análise de protocolos](https://github.com/zhaoxuya520/reverse-skill/blob/main/skills/protocol-reverse/SKILL.md) | Direções C→S/S→C, layout, campos, mensagens, estado da conexão e amostras decodificadas. | Correlacionar enum, emissor, listener, decoder e schema; confirmar hipóteses com captura local sanitizada quando disponível. |
| [AutoForge anterior — branch arena/a02c144b-ultra](https://github.com/vanhellsingz/ultra/tree/arena/a02c144b-ultra/tools/autoforge) | [README](https://github.com/vanhellsingz/ultra/blob/arena/a02c144b-ultra/tools/autoforge/README.md), [AST numérica](https://github.com/vanhellsingz/ultra/blob/arena/a02c144b-ultra/tools/autoforge/numeric-ast.mjs), [extrator de custo](https://github.com/vanhellsingz/ultra/blob/arena/a02c144b-ultra/tools/autoforge/forge-cost.mjs) e relatórios de taxa/missões. | Demonstra um recorte com gramática restrita, rejeição de tokens desconhecidos, hashes/intervalos e comparação contra uma transcrição JS revisada. Essa transcrição não é uma observação do bundle em execução. |

## Métodos adotados como orientação do pipeline

1. **Proveniência:** inventariar os arquivos; registrar caminho, SHA-256, tamanho e intervalos com convenção explícita. Cada fórmula, vínculo e campo deve apontar para sua evidência. Nunca inventar hash para conteúdo ausente.
2. **AST e emissão:** localizar candidatos, analisar apenas a gramática declarada e preservar precedência, coerções e arredondamento. Falhar diante de sintaxe ou efeito não suportado; não substituir silenciosamente por zero ou uma implementação presumida.
3. **Dependências:** vincular entradas, aliases, tabelas, chamadas e estado consultado. Separar referência encontrada, dependência resolvida e dependência apenas candidata. Preservar ciclos e ambiguidades como limitações.
4. **Protocolo:** documentar direção, opcode, emissor/consumidor, mensagem e campos do encoder/decoder. A existência de um schema não prova que a mensagem foi transmitida ou aceita pelo servidor.
5. **Validação:** comparar implementação própria e oráculo independente em casos reais e de borda; informar se Java foi efetivamente compilado/executado. Registrar primeira divergência e cobertura, sem promover contagens de casos a garantia universal.

Esses pontos são critérios de projeto. A cobertura efetivamente implementada deve ser declarada pelos relatórios e verificações do AutoForge v2.

## Limites observados

O AutoForge anterior distingue o preço exibido de cobrança e persistência. Seu relatório de [taxa de encantamento](https://github.com/vanhellsingz/ultra/blob/arena/a02c144b-ultra/tools/autoforge/forge-rate.evidence.json) registra um envio C2S sem corpo e a falta de informação sobre o segundo slot; também exclui o ramo de mudança de classe. Isso exige investigação do estado/protocolo completo: não autoriza concluir que o servidor original usa zero ou ignora esse material.

O relatório de [condições de missão](https://github.com/vanhellsingz/ultra/blob/arena/a02c144b-ultra/tools/autoforge/quest-conditions.evidence.json) recupera vocabulário e referências a dispatchers, mas declara 67 tipos usados sem nome recuperado, semântica de Para1..Para4 ainda ausente e nenhuma avaliação de condição. Vocabulário recuperado não é um motor de missões implementado.

Análise estática do cliente não demonstra regras autoritativas do servidor, RNG, transações, concorrência, idempotência, consumo de inventário, concessão de recompensas ou persistência. Catálogos JSON e mensagens Protobuf não são um schema de banco. Criar migrations, entidades ou handlers corretos exige contratos adicionais e testes de integração. Uma execução local de função pura também não demonstra funcionamento do jogo completo.

## Licenças e identidade das leituras

- [REA LICENSE](https://github.com/morluto/rea/blob/main/LICENSE): MIT, copyright 2026 morluto, confirmado no arquivo.
- [reverse-skill LICENSE](https://github.com/zhaoxuya520/reverse-skill/blob/main/LICENSE): MIT, copyright 2026 zhaoxuya520, confirmado no arquivo. Seu [README](https://github.com/zhaoxuya520/reverse-skill/blob/main/README.md#license) informa licenças separadas para componentes e ferramentas de terceiros; essas licenças não foram auditadas aqui.
- Para `vanhellsingz/ultra`, a API retornou licença não identificada. Nenhuma licença foi confirmada nesta revisão; não presumir licença a partir das outras referências.

Identidades Git dos arquivos consultados (SHA de blob, diferente de SHA-256 dos assets):

| Arquivo | SHA de blob |
| --- | --- |
| REA `docs/javascript-application-workflows.md` | `83802e1c2b8c417b63611dc7f290dc6a1710f212` |
| REA `docs/javascript-artifact-reconstruction.md` | `1dd3c99d585ac88abc754cebfefe6d6e983450c7` |
| reverse-skill `skills/js-reverse/SKILL.md` | `458f24793e6b50f2b4c1b0559b8f9321eee050c8` |
| reverse-skill `skills/js-reverse/references/ast-deobfuscation.md` | `6cc40b63f3452d5f0255dc41ae5d90b0f1160669` |
| Ultra `tools/autoforge/README.md` | `20e1f139ee76938417a5addc26ee59ace22ccbb4` |
| Ultra `tools/autoforge/numeric-ast.mjs` | `67a9d757a0bf75b07ffc5ab087701e2743fc395c` |
| Ultra `tools/autoforge/forge-cost.mjs` | `d9d31b0e1019ba12b3ba9e5ca278d8d3091e6cf3` |

Os links apontam para branches que podem mudar; os SHAs acima identificam as versões lidas. A consulta valida o conteúdo documental e os limites declarados, não certifica a execução nem a qualidade global dos projetos externos.
