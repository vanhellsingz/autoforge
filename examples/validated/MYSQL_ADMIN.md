# Contrato MySQL e painel

A análise lê migrations, SQL no Java e fontes do painel; não conecta ao banco nem altera dados. O preflight é validado como SELECT/metadados somente leitura. Formulário localizado não comprova gravação; exigir requisição real, readback, auditoria, permissão e relogin. Ausência de evidência não autoriza remover ou desabilitar uma função.

1. Reutilizar tabelas e serviços existentes quando cobrirem o estado. Uma fórmula pura não exige tabela própria.
2. Se houver estado novo, documentar entidade/dono, colunas, tipos, limites, índices e chaves; criar nova migration apenas depois de conferir o maior número no repositório e a Flyway efetiva. Não reescrever migrations aplicadas.
3. Operações de ouro, itens, material e recompensa devem usar a mesma transação autoritativa, validação de posse e quantidades e controle de repetição/concorrência.
4. No painel, reaproveitar rotas, componentes, permissões e auditoria existentes. Validar no servidor; prévia/confirmar e versão esperada devem impedir alterações concorrentes e repetidas.
5. A edição administrativa deve chamar o serviço do domínio, recalcular projeções e atualizar/invalidate caches/sessões conforme o fluxo existente. Não editar diretamente um poder derivado sem contrato de override explícito.
6. A evidência de migrations e SQL no código não prova que a tabela/coluna existe na instância em execução. Executar MYSQL_PREFLIGHT.sql somente na conexão/esquema selecionado e anexar resultado sem credenciais.
7. Antes de publicar, comparar operações normais e administrativas para os mesmos dados, conferir logs de auditoria, autorização negada e persistência após relogin.

Cada tarefa contém referências específicas. data-admin-map.json mantém os vínculos e seus limites. MYSQL_PREFLIGHT.sql é somente leitura e deve ser executado na conexão escolhida pelo operador. O painel deve reutilizar serviços, validações, permissões e auditoria existentes.
