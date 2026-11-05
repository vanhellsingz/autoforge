// Delivery guidance for persistence/admin contracts. All instructions require review in the active backend.
export const PERSISTENCE_ADMIN_GUIDE = [
 'Reutilizar tabelas e serviços existentes quando cobrirem o estado. Uma fórmula pura não exige tabela própria.',
 'Se houver estado novo, documentar entidade/dono, colunas, tipos, limites, índices e chaves; criar nova migration apenas depois de conferir o maior número no repositório e a Flyway efetiva. Não reescrever migrations aplicadas.',
 'Operações de ouro, itens, material e recompensa devem usar a mesma transação autoritativa, validação de posse e quantidades e controle de repetição/concorrência.',
 'No painel, reaproveitar rotas, componentes, permissões e auditoria existentes. Validar no servidor; prévia/confirmar e versão esperada devem impedir alterações concorrentes e repetidas.',
 'A edição administrativa deve chamar o serviço do domínio, recalcular projeções e atualizar/invalidate caches/sessões conforme o fluxo existente. Não editar diretamente um poder derivado sem contrato de override explícito.',
 'A evidência de migrations e SQL no código não prova que a tabela/coluna existe na instância em execução. Executar MYSQL_PREFLIGHT.sql somente na conexão/esquema selecionado e anexar resultado sem credenciais.',
 'Antes de publicar, comparar operações normais e administrativas para os mesmos dados, conferir logs de auditoria, autorização negada e persistência após relogin.'
];
export const PRESERVE = [
 'Contas, personagens, inventário, saldos, progresso, permissões e registros de auditoria existentes.',
 'Diffs concorrentes do Arena; usar commit e hashes registrados e regenerar a análise se os arquivos mudarem.',
 'Contratos protobuf, IDs, arredondamentos, limites e ordem de inicialização comprovados pelo cliente.',
 'Estado persistido correto e cálculos equivalentes já validados; não duplicar sistemas, bônus, tabelas ou handlers.',
 'Migrations aplicadas e compatibilidade do JAR de rollback; aplicação é etapa separada da geração de classes.'
];
export const GAMEPLAY_PROOFS = {
 'forge.common.enhancement.gold':[
  {action:'Registrar template/nível do item e saldo; calcular custo com gold(...) para o mesmo estado.',observe:'O cliente mostra o custo esperado no ramo comum.',persist:'O template/nível usados são os do item possuído, não dados arbitrários do pacote.'},
  {action:'Executar uma tentativa aceita; repetir com ouro insuficiente e item no limite.',observe:'A tentativa responde e renova inventário/saldo; os casos recusados exibem recusa.',persist:'Cobrança e item seguem a política comprovada do serviço; recusa não altera estado. Registrar separadamente sucesso/falha e material.'},
  {action:'Relogar e consultar o detalhe no painel autorizado.',observe:'Nível/saldo coincidem com a sessão anterior.',persist:'Comparar dados persistidos e auditoria administrativa quando o painel tiver sido usado.'}
 ],
 'forge.common.enhancement.rate':[
  {action:'Comparar grau inicial, bordas e material presente/ausente nos slots persistidos.',observe:'Chance exibida coincide com successRate para os mesmos parâmetros.',persist:'Registrar o slot/material realmente resolvido; pacote vazio não autoriza presumir zero.'},
  {action:'Testar sucesso e falha com RNG controlado no teste de serviço, não alterando o jogador real.',observe:'Resposta/grade refletem cada ramo, e o clique não fica bloqueado.',persist:'Consumo e custo seguem cada ramo comprovado; repetir pacote não duplica efeitos.'}
 ],
 'attributes.fighting-capacity':[
  {action:'Registrar sem equipamento; equipar, substituir e retirar um item; repetir com passiva conhecida.',observe:'Ficha, HUD e estado de batalha usam a mesma projeção e origem de dados.',persist:'Itens/skills persistem; valores derivados são recalculados com coeficientes e taxas de origem comprovada.'},
  {action:'Relogar e realizar uma edição administrativa de atributo/estado suportada pelo domínio.',observe:'Painel e cliente convergem após o mecanismo existente de atualização; registrar se requer relogin.',persist:'Estado autoritativo muda uma vez, auditoria registra antes/depois e a projeção não acumula bônus.'}
 ],
 'quest.condition.vocabulary':[
  {action:'Escolher uma condição de semântica comprovada e disparar o evento real no jogo.',observe:'Contador avança para o alvo correto e a conclusão só ocorre no requisito exigido.',persist:'Progresso e recompensa persistem; evento/requisição repetido não concede novamente.'},
  {action:'Testar tipo ainda desconhecido e reabrir após relogin.',observe:'Estado desconhecido fica explícito; não marcar concluído por palpite.',persist:'Nenhuma recompensa inventada ou sobrescrita de progresso válido.'}
 ]
};
export function mysqlPreflight(observedTables=[]) {
 const names=[...new Set(observedTables.filter(n=>typeof n==='string'&&/^[A-Za-z_][A-Za-z0-9_]*$/.test(n)))].sort();
 const filter=names.length?` AND table_name IN (${names.map(n=>"'"+n+"'").join(', ')})`:'';
 return `-- SOMENTE LEITURA. Selecione explicitamente a conexão/esquema correto antes de executar.\n-- A ferramenta não executa estas consultas. Nenhum dado de conta/personagem é solicitado.\nSELECT DATABASE() AS effective_schema, VERSION() AS database_version;\nSELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()${filter} ORDER BY table_name;\nSELECT table_name, column_name, column_type, is_nullable FROM information_schema.columns WHERE table_schema = DATABASE()${filter} ORDER BY table_name, ordinal_position;\n-- Execute a próxima consulta apenas se flyway_schema_history existir no esquema efetivo:\nSELECT installed_rank, version, description, type, script, checksum, success FROM flyway_schema_history ORDER BY installed_rank;\n`;
}
// Validates this tool's narrow generated preflight; not a general SQL parser.
export function assertReadOnlyPreflight(sql) {
 if(typeof sql!=='string')throw Error('Preflight SQL must be text');
 const code=sql.replace(/--[^\r\n]*/g,' ').replace(/'(?:''|[^'])*'/g,"'literal'");
 if(/\/\*|\*\/|:=|\b(?:INSERT|UPDATE|DELETE|REPLACE|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|CALL|SET|LOCK|UNLOCK|INTO|OUTFILE|DUMPFILE|PROCEDURE|GET_LOCK|RELEASE_LOCK|SLEEP|BENCHMARK)\b/i.test(code))throw Error('Preflight contains a forbidden non-read operation');
 for(const match of code.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)){if(!['DATABASE','VERSION','IN'].includes(match[1].toUpperCase()))throw Error('Preflight function outside the metadata allowlist');}
 const statements=code.split(';').map(s=>s.trim()).filter(Boolean);
 if(!statements.length||statements.some(s=>!/^SELECT\b/i.test(s)))throw Error('Preflight permits SELECT statements only');
 for(const statement of statements) {
  if(!/\b(?:information_schema\.(?:tables|columns)|flyway_schema_history)\b/i.test(statement)&&!/^SELECT\s+DATABASE\(\)\s+AS\s+effective_schema\s*,\s*VERSION\(\)\s+AS\s+database_version$/i.test(statement))throw Error('Preflight query outside the generated metadata scope');
 }
 return true;
}
