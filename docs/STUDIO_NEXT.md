# AutoForge Studio Next — integração v3 sem substituição do Core/Plus/Studio

Esta camada integra as melhorias úteis do ZIP v3 no repositório standalone.
Ela é **aditiva**: o Core 2.4, Plus v1 e Studio 2.5 permanecem intactos.
Não copia o hook invasivo do ZIP e não ativa automaticamente captura ou deploy.

## Entrada única

Use Node.js 22+. Nenhuma dependência npm nova.

    node studio/next/autoforge.mjs help
    npm test

A entrada Next também encaminha os comandos existentes para o Studio 2.5:
record, diagnose, generate, compare, audit, replay, bridge, import e bundle.
Assim, Flight Recorder/CDP, motor causal, contratos Java21, invariantes e ponte
de evidências permanecem com suas garantias atuais.

## Drift Watch (novo)

    node studio/next/autoforge.mjs drift snapshot --client C:\WartuneUltra\client-qa-java-v1 --out C:\relatorios\client-20261105.json
    node studio/next/autoforge.mjs drift diff --old A.json --new B.json --out C:\relatorios\drift-001
    node studio/next/autoforge.mjs drift diff --old discovery-old.json --new discovery-new.json --contracts-dir C:\contratos --evidence C:\relatorios\capacity.evidence.json --out C:\relatorios\drift-semantico

O snapshot calcula hashes para .js, .json, .proto, .atlas e .html.
Normaliza nomes com hash de build e rejeita colisões. O diff de discovery.json
identifica opcodes, campos protobuf, catálogos e fontes modificadas.
Tudo é estático; não prova gameplay, cliente em execução ou schema do MariaDB.

## Matriz de lacunas (nova)

    node studio/next/autoforge.mjs gaps --discovery discovery.json --backend C:\WartuneUltra\java-source\java-v1 --out C:\relatorios\gaps-001
    node studio/next/autoforge.mjs gaps --discovery discovery.json --backend C:\WartuneUltra\java-source\java-v1 --capture C:\captura-studio-001 --match GEM --out C:\relatorios\gaps-gemas

O scan é lexical. Cases encontrados não demonstram execução, ausência de case
não demonstra ausência de handler. Sem decoder revisado, tráfego é somente dica;
somente casos candidatos são priorizados. Antes de corrigir, reproduza UI ->
C2S -> handler -> transação -> S2C -> interface -> relogin.

## Frame calibration (opcional, leitura de amostras)

    node studio/next/autoforge.mjs calibrate --headers headers.json --discovery discovery.json --out C:\relatorios\layout-001

headers.json é um array de objetos {"head":"aacc0201","bytes":48}, vindo de
coleta autorizada de cabeçalhos *já revisados*. A ferramenta não coleta payloads,
não desencripta frames, não altera LayaAir e devolve UNVERIFIED se ambíguo.
Resultado INFERRED_NOT_PROVEN nunca é prova de decoder correto.

## Estatística para ações aleatórias (opcional)

    node studio/next/autoforge.mjs stats --input rates.json --out C:\relatorios\stats-001

rates.json: {"reference":{"n":400,"successes":200},"candidate":{"n":400,"successes":210},"minN":200}.
Sobreposição de intervalos Wilson 95% apenas indica compatibilidade registrada;
não prova equivalência de distribuição. O comparador de estado/persistência do
Studio 2.5 continua sendo a validação principal.

## Evidence Pack sem bypass de segredos

    node studio/next/autoforge.mjs pack --root C:\relatorios --files gap-matrix.json,GAPS.md --out C:\envio\gaps.afpack
    node studio/next/autoforge.mjs pack-verify --file C:\envio\gaps.afpack
    node studio/next/autoforge.mjs pack-text --file C:\envio\gaps.afpack --out C:\envio\gaps.txt
    node studio/next/autoforge.mjs pack-recover --file C:\envio\gaps.txt --out C:\envio\recuperado.afpack
    node studio/next/autoforge.mjs pack-unpack --file C:\envio\recuperado.afpack --out C:\envio\recuperado

Limitado a 40 arquivos de relatório explicitamente selecionados e 2 MiB.
Arquivo comprimido, SHA256 por arquivo, verificação antes de extrair, sem
sobrescrita e sem caminhos relativos perigosos. Detecta padrões comuns de
segredos e recusa o pacote; **não** possui --force. Revise manualmente
as evidências antes de publicar, pois filtros de segredos não são exaustivos.

## Contrato de segurança para o Arena

- Operar o AutoForge em seu repositório, sem copiar por cima do backend Wartune.
- Não editar C:\xampp\htdocs\2, não tocar contas protegidas, não migrar SQL.
- Não reiniciar o Java nem o runner; nenhum comando Next faz isso.
- Não adicionar hook de navegador ao cliente: manter recorder CDP existente.
- Não promover UNVERIFIED nem candidato estático a "funcional".
- Recalcular hashes contra o commit/backend/JAR realmente implantado.
- Para implementação Java, continuar usando Studio generate e os guards Core/Plus.
- Não usar referências do servidor Node como autoridade para o Java.
- Múltiplos agentes: preservar diffs e não misturar branches em andamento.

**Limites:** esta versão cobre novos diagnósticos e transporte seguro, não corrige
automaticamente ferreiro, bolsa, gemas, tropas, batalha ou UI. O Arena deve
integrar as correções no Java com contratos e evidências reais.
