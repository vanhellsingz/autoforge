# Comece aqui — Arena

1. Abra tasks/01-ForgeEnhancementCost.md e siga a fila 01 → 02 → 03 → 04. Cada arquivo inclui métodos, fontes, locais do backend, lacunas e critérios de aceitação.
2. Confira arena-plan.json: READY_FOR_IMPLEMENTATION.
3. Use INPUTS.md para os índices exatos dos vetores. Leia MYSQL_ADMIN.md, MYSQL_PREFLIGHT.sql, IMPLEMENTATION_STATES.md e ARTIFACTS.md. analysis-snapshot.json registra commit e hashes; EVIDENCE_LINEAGE.md separa commit/ambiente/teste de cada evidência; cada tarefa traz método, dependências e testes no jogo.
4. Execute os comandos abaixo no checkout que contém a ferramenta. Primeiro a prévia; --apply só instala os tipos gerados.

```powershell
node tools/autoforge-v2/verify.mjs --from "CAMINHO_DA_ENTREGA" --client "CLIENTE_REAL"
node tools/autoforge-v2/prepare.mjs --from "CAMINHO_DA_ENTREGA" --backend "JAVA_V1" --client "CLIENTE_REAL"
node tools/autoforge-v2/integrate.mjs --from "CAMINHO_DA_ENTREGA" --backend "JAVA_V1"
node tools/autoforge-v2/integrate.mjs --from "CAMINHO_DA_ENTREGA" --backend "JAVA_V1" --apply
```

Atalho Windows: arena-steps.ps1 recebe -ToolRoot, -Backend e opcionalmente -Client; por padrão só verifica e mostra a prévia. -ApplyGenerated instala as classes.

5. Conecte os serviços conforme as tarefas, compile e valide persistência/protocolo. Depois use o procedimento autorizado de aplicação do projeto; confira caminhos efetivos, migrações e compatibilidade do rollback. O script apply-local-game.ps1 de outro checkout pode conter diretórios fixos diferentes do servidor atual: revisar antes de executar.
6. Copie RESULTADO_ARENA.md para seu relatório e preencha somente evidências efetivamente obtidas.

Referência ou import encontrado não comprova integração funcional. Não trocar pacotes/imports automaticamente sem revisar o contrato. O gerador não altera a conta nem reinicia o servidor.

Antes de alterar fluxos de inventário, equipamentos, venda, forja, tropas, campanha ou poder, leia CAUSAL_CONTEXT.md e causal-context.json. São atalhos com métodos/linhas/hashes e chamadas candidatas; localizar um símbolo não prova execução. Trace a primeira fronteira que falhou, preserve o fluxo existente e registre esperado/obtido por commit, ambiente e teste.
