# Artefatos verificáveis

Avaliações funcionais exigem arquivos reais com SHA256 e identidade correspondente. artifacts:[{path,sha256,format}] usa caminhos relativos ao JSON de avaliação. opaque confere apenas integridade; junit confere resultados e contagens; json-report confere commit, ambiente, testId e, no runtime, commit/hash do JAR. Nenhum formato sozinho prova execução real ou gameplay. Consulte a run Actions e seus artefatos, sem transferir um sucesso de outra branch.

O backend-snapshot.json bloqueia --apply desatualizado. Regere antes da aplicação se código, migrations, painel, build ou commit mudarem. As fontes externas configuradas permanecem somente leitura e são rechecadas.
