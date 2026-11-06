# Mapa do repositório

| Camada | Entrada | Finalidade |
|---|---|---|
| Studio | `studio/autoforge.mjs` | Captura, diagnóstico causal, contratos Java, equivalência, invariantes, reprodução e transporte de evidências |
| Core 2.4 | `run.mjs`, `prepare.mjs`, `integrate.mjs` | Extrair fórmulas suportadas e preparar sua integração |
| Plus v1 | `plus/plus.mjs` | Inspecionar protocolo, MySQL/Flyway, wiring, runtime e instalação limitada de classes |
| Exemplos | `examples/studio/`, `examples/validated/` | Fixtures declarados e snapshots com procedência; não são homologação do jogo |
| Validação | `.github/workflows/autoforge-studio.yml` | Suíte completa em Windows/Linux, Node22/Java21, JUnit com hashes nos logs |
| Captura Windows | `.github/workflows/autoforge-flight-recorder.yml` | Observador manual em runner local explicitamente identificado |

Os módulos existentes ficam nos caminhos originais para preservar imports e instruções antigas. A organização nova oferece uma entrada única e guias por função, sem copiar outra versão do Core ou do Plus.

Comece pelo [guia do Studio](STUDIO.md), depois leia [captura](flight-recorder.md), [contratos](contracts.md) e [equivalência](equivalence.md).


Studio Next 2.6: [drift, lacunas, calibração, estatística e pacote de evidências](STUDIO_NEXT.md). Entrada: `node studio/next/autoforge.mjs help`. É aditivo: o Studio 2.5 continua intacto.
