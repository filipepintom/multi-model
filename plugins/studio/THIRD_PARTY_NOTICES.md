# Componentes de terceiros

O plugin `studio` inclui as skills seguintes, sem modificações, com a versão fixa registada em [`vendor.json`](vendor.json). Atualizam-se com `node scripts/vendor.js` (no repo do estúdio), depois de ler o código novo.

| Componente | Pasta | Origem | Licença |
|---|---|---|---|
| Impeccable | `skills/impeccable/` | https://github.com/pbakaus/impeccable | Apache-2.0 |
| Ponytail (só a skill) | `skills/ponytail/` | https://github.com/DietrichGebert/ponytail | MIT (ver `skills/ponytail/LICENSE`) |

## Notas

- **Impeccable:** o binário do detetor não está incluído. O lançador (`skills/impeccable/scripts/impeccable`) descarrega o binário certo para o sistema operativo na primeira utilização e guarda-o numa cache com a versão fixa. Os hooks do estúdio correm-no com `IMPECCABLE_NO_TELEMETRY=1`.
- **Ponytail:** só a skill está incluída. O registo de custos, a statusline e o painel do plugin original não estão. As regras chegam aos subagentes do estúdio através de `hooks/subagent.js` e ao orquestrador do build através de `hooks/knowledge.js`.
