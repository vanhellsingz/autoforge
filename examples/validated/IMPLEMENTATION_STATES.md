# Estados de implementação

Por padrão: unverified. O scanner não converte presença de código em funcionalidade pronta.

Estados declarados por revisão: absent, partial, functional, divergent. Use --assessment ARQUIVO.json em prepare.mjs ou run.mjs. O arquivo deve ter schemaVersion:1 e assessments:[]. Cada entrada contém rule, status, commit completo, sourceHashes:[{path,sha256}] e evidence:[{kind,id,description,result}].

functional exige declarações de teste e runtime aprovados; divergent exige comparação independente divergente. O planejador valida metadados, commit e hashes: não executa nem certifica os artefatos externos referidos. Detalhes do schema estão em backend-provenance.mjs.

Commit analisado: 65cd3732380d8ae197d483a0c16abe59a5949e6b. Estado local modificado: false. analysis-snapshot.json contém os hashes efetivos. Regerar a fila no checkout ativo do Arena após alterações; não tratar este exemplo como diagnóstico do servidor em execução.
