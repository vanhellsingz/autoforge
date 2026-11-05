# Origem e validade das evidências

Cada observação está vinculada ao commit (quando resolvido), hashes, ambiente e teste/extrator. evidence-lineage.json liga cada relatório numérico pelo SHA256; as evidências estáticas levam evidenceContext.

Código analisado, teste local e versão implantada são escopos distintos. A versão implantada não foi inspecionada. Um sucesso em branch antiga não comprova o JAR atual. Assets sem Git ficam com commit nulo e hashes explícitos, nunca com commit inventado.

Avaliações de runtime precisam declarar ambiente, teste, commit e SHA256 do JAR implantado. A validação desses metadados não executa novamente nem certifica os artefatos externos citados.
