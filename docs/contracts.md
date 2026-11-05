# Gerador por contrato

API: `generateImplementation({contract,backend?,out})`, em `studio/contract-generator.mjs`. `contract` aceita objeto ou caminho JSON; `out` precisa ser uma pasta nova e fora do backend. Nada e instalado automaticamente.

O contrato exige `schemaVersion:1`, `id`, `packageName`, `className`, opcodes explicitos, `amount:{min,max}`, `deltas:[{domain,key,perUnit}]` e `evidence:[{path,sha256}]`. Dominios aceitos: `inventory`, `currencies`, `attributes`. Somente deltas inteiros limitados, com quantidade 1..1000000, aritmetica checked e estado nao negativo. Formula arbitraria, RNG, SQL e codecs desconhecidos nao sao inventados.

Com `backend`, exija tambem `backend:{commit,sources:[{path,sha256}],targets:[{path,method}]}`. Commit, arquivo e metodo exatos sao verificados; overload ambiguo bloqueia. O plano registra linhas, assinatura, hash do corpo e preservacao. Uma referencia de evidencia declarada nao e validacao do seu conteudo.

A saida contem servico Java21, handler tipado e teste standalone real. O servico requer a interface `Transactions`: o adaptador de producao deve usar a transacao MariaDB existente, controle concorrente, idempotencia persistida e commit atomico de todos os deltas e do recibo. O adaptador em memoria existe somente no teste. O handler declara os opcodes, mas usa o codec e a autenticacao reais existentes para integracao. Nunca aceite characterId do pacote sem conferir a sessao.

`implementation-plan.json` marca compilacao, MariaDB, gameplay e deploy como nao executados. Compile os tres arquivos gerados com `javac --release 21 -d classes ...` e rode `java -cp classes PACOTE.CLASSETest`. O teste prova consumo/credito, rejeicao, rollback local e replay sob um adaptador de teste; nao prova persistencia real ou clique.

`examples/studio/contract.json` e explicitamente ficticio: IDs, itens e valores nao devem ser aplicados ao Wartune. Substitua por contrato sustentado pelas capturas e catalogos reais; o exemplo apenas demonstra o compilador.
