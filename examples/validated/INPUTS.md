# Contrato de entradas do FightingCapacity

A ordem vem da extração do cliente. Os valores devem vir de estado resolvido. As tabelas não atribuem valores padrão. O vetor base contém pesos percentuais; rates contém taxas de conversão.

## stats

| Posição Java | Campo do cliente |
| --- | --- |
| stats[0] | power |
| stats[1] | agility |
| stats[2] | intel |
| stats[3] | physi |
| stats[4] | captain |
| stats[5] | attack |
| stats[6] | defence |
| stats[7] | magicattack |
| stats[8] | magicdefence |
| stats[9] | live |
| stats[10] | conat |
| stats[11] | forcehit |
| stats[12] | parry |
| stats[13] | fireResi |
| stats[14] | waterResi |
| stats[15] | windResi |
| stats[16] | electResi |
| stats[17] | darkResi |
| stats[18] | lightResi |
| stats[19] | reduceResi |
| stats[20] | defensePenetration |
| stats[21] | criticalResistance |
| stats[22] | parryPenetration |

## basePercentWeights

| Posição Java | Campo do cliente |
| --- | --- |
| base[0] | power |
| base[1] | intel |
| base[2] | physi |
| base[3] | agility |
| base[4] | captain |
| base[5] | attack |
| base[6] | magicattack |
| base[7] | defence |
| base[8] | magicdefence |
| base[9] | live |
| base[10] | conat |
| base[11] | forcehit |
| base[12] | parry |

## rates

| Posição Java | Campo do cliente |
| --- | --- |
| rates[0] | attackRate |
| rates[1] | magicAttackRate |
| rates[2] | defenceRate |
| rates[3] | liveRate |
| rates[4] | conatRate |
| rates[5] | forcehitRate |
| rates[6] | parryRate |

Antes de conectar, verificar no serviço a origem e a etapa de cada atributo. Não passar um atributo já convertido para um campo que a função converte novamente.
