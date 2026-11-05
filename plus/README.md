# AutoForge Plus v1 — revisão e correções

Complemento para **AutoForge 2.4**: detecta layout Java, compara referências textuais de protocolo LayaAir, inspeciona migrations/Flyway e o wiring Java, verifica o runtime e oferece uma **aplicação opcional** de regras geradas com backup/rollback.

**Ele não converte automaticamente todo LayaAir em Java.** A comparação de opcodes é estática, não uma captura comprovada C2S → handler → banco → S2C → interface. Ofuscação pode esconder referências. A análise do schema por regex é aproximada e não substitui MySQL/Flyway de verdade.

## Uso sem alterar o servidor

Requer Node.js 22+, Git para identidade de commit e, se fizer consulta de banco, cliente `mysql` instalado. Sem `npm install` para as verificações locais.

### No Windows, com o backend do Wartune

Executar da pasta que contém `plus/` e `integrate.mjs`:

```powershell
node .\plus\plus.mjs scan --backend 'C:\WartuneUltra\java-source\java-v1' --client 'C:\WartuneUltra\client-qa-java-v1' --out 'C:\WartuneUltra\autoforge-plus-output'
```

O `scan` é somente leitura para backend/cliente/banco. Escreve **apenas no `--out`**, que deve ficar fora das árvores protegidas. Para comparar migrations com uma base local existente, use `--base origin/main` (ou a ref relevante).

`gate` para a porta Java atual:

```powershell
node .\plus\plus.mjs gate --port 19090 --health-url http://127.0.0.1:19090/actuator/health --log-file 'C:\WartuneUltra\logs\java-live.log' --out 'C:\WartuneUltra\autoforge-plus-output'
```

O gate **não reinicia nem encerra o servidor**; se o log contiver erros históricos, poderá alertar mesmo com o servidor saudável agora. Inclua hash do JAR e PID para uma validação mais profunda. Para MySQL, use `PLUS_MYSQL_*` via variáveis de ambiente do usuário, não em Git.

### Testes

```powershell
node --test .\plus\tests\*.test.mjs
```

### Quando quiser aplicar regras geradas

`apply` modifica **somente** o pacote gerado Java e usa o `integrate.mjs` do AutoForge base. Não é deploy do Java, não aplica migrations e não encerra nenhum servidor. Primeiro confira o plano e o snapshot; depois, somente mediante decisão explícita:

```powershell
node .\plus\plus.mjs apply --from 'CAMINHO_DA_ENTREGA' --backend 'CAMINHO_DO_BACKEND' --dry-run
```

O comando `apply` sem `--dry-run` **grava código** no backend. O `rollback` **também grava código**. Não confunda esses comandos com o `scan`/`gate` de leitura. A proteção recusa destinos fora do pacote gerado e rollback se o backup tiver sumido.

## Workflow GitHub Actions

O arquivo `.github/workflows/autoforge-plus.yml` executa os testes em `ubuntu-latest` em cada push relevante. No disparo manual, **não busca o PC Windows automaticamente**: `backend` e `client` são caminhos que precisam existir dentro do checkout do próprio runner hospedado. Sem `backend`, roda apenas testes. Para varrer seu backend real no PC, use o comando local acima ou uma integração explícita e autorizada com o runner Windows.

## Correções feitas nesta revisão

- Leitura integral dos bundles LayaAir de até 64 MiB, alertando explicitamente se excederem esse limite; a versão anterior cortava silenciosamente após 8 MiB.
- Uma falha `FAIL` continua sendo falha, mesmo se constar no baseline antigo.
- Baseline positivo do runtime só é atualizado quando tudo passa (`PASS`), não quando há `WARN`.
- Saída via links simbólicos para dentro do backend/cliente é rejeitada.
- `apply` não permite escolher diretórios arbitrários com `--generated-dir`.
- `rollback` confere o backup antes de remover o código atual e confere a identidade do journal antes de escrever.
- Workflow não dispara um scan enganoso de `.` numa cópia do repo que não contém backend Java.
- Exemplo de configuração do runtime alinhado às portas 19090 do Wartune Java.
- Sete testes de regressão adicionais.

**Estado desta entrega:** revisão estática e testes sintéticos locais. Nenhum teste real no Windows, MySQL, jogo ou deploy foi realizado. Preservar o AutoForge 2.4 existente e publicar o `plus/` em uma branch antes de ativar o novo workflow.
