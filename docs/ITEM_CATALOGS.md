# Leitura de itens por evidencias

`studio/items/item-index.mjs` le os catalogos em `res/release/config` sem executar o cliente, consultar banco ou alterar arquivos de origem. Suporta o formato real Laya `{t_s_itemtemplate:[...]}`, arrays, wrappers `rows/data/records/items` e mapas de registros com identidade explicita.

API:

```js
const index = buildItemIndex({client: 'CLIENT_ROOT'});
const page = searchItemIndex(index, {query: 'pocao', offset: 0, limit: 50});
const dossier = explainItem(index, '2129001', {client: 'CLIENT_ROOT'});
```

O indice usa `schemaVersion:'autoforge.items-index.v1'` e fornece `sourceDigest`, `sources`, `items`, `tables` e `coverage`. Cada item tem `id` textual normalizado, `name`, `fields` originais, `fieldTypes` e `source` com path/rowKey/SHA256. IDs negativos existentes no catalogo sao preservados: nao devem ser descartados nem tratados como IDs de instancias do inventario. A tabela primaria nao duplica os campos completos em `tables.rows`; eles ficam em `items`.

O nome exibido prefere traducao portuguesa, depois inglesa e nome generico. Todos os nomes e descricoes originais continuam em `fields`. A busca remove acentos apenas para comparar texto; o catalogo nao e reescrito. Filtros de categoria exigem campo original e valor explicito, por exemplo `category:{field:'SonType',value:5}`. A ferramenta nao inventa o significado de cada MasterType/SonType.

O dossie explica cada campo e preserva o valor. `Property1..6` continuam sem semantica universal. Um SellGold positivo informa preco de catalogo, nao prova que o handler de venda aceita o item. StrengthenMax informa um limite, nao o custo, chance nem aplicacao do encantamento.

Referencias sao limitadas a campos comprovadamente estruturados: TransformId para template de item, Material1..4/NewMaterial da tabela de composicao e listas `id,quantidade|...` da forja divina. Mesmo uma referencia resolvida e somente relacionamento de catalogo; nao concede premio, transforma item ou autoriza uma operacao. SuiteId e alvos ausentes ficam UNRESOLVED. Numeros arbitrarios de Property, ouro ou nivel nao sao tratados como IDs de itens.

Cada fonte registra hash dos bytes originais, tamanho e local do registro. `explainItem(...,{client})` revalida as fontes contra os bytes atuais e recusa snapshot desatualizado. Builds ambiguos e identidades duplicadas de item sao recusados. Links/junctions, chaves perigosas de objetos e limites invalidos sao recusados.

Limites padrao: 64 arquivos, 32MiB por arquivo, 128MiB totais e 200.000 linhas. Arquivos omitidos, estruturas nao suportadas e cortes de linhas tornam `coverage.complete:false`/`truncated:true`, com motivo explicito. Nao se declara cobertura completa se algo ficou fora. O indice serializado pode ultrapassar 32MiB porque preserva campos e tipos; um consumidor deve usar leitura limitada adequada (por exemplo 128MiB) e manter a cobertura visivel.

O proximo passo para implementar um item continua sendo encontrar o consumidor no cliente, C2S autenticado, transacao MariaDB, S2C/UI e leitura depois do relogin. Essas duas funcoes organizam os dados e suas referencias; nao afirmam que todos os efeitos dos itens estejam implementados.
