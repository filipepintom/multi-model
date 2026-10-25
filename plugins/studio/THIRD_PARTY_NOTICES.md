# Componentes de terceiros

O plugin `studio` inclui as skills seguintes, sem modificações salvo indicação em contrário, com a versão fixa registada em [`vendor.json`](vendor.json). Atualizam-se com `node scripts/vendor.js` (no repo do estúdio), depois de ler o código novo.

| Componente | Pasta | Origem | Licença |
|---|---|---|---|
| Impeccable | `skills/impeccable/` | https://github.com/pbakaus/impeccable | Apache-2.0 |
| Ponytail (só a skill) | `skills/ponytail/` | https://github.com/DietrichGebert/ponytail | MIT (ver `skills/ponytail/LICENSE`) |
| graphify | `skills/graphify/` | https://github.com/safishamsi/graphify | MIT ou Apache-2.0 |
| Context7, skill de uso do MCP | `skills/context7-mcp/` | https://github.com/upstash/context7 | MIT (ver `skills/context7-mcp/LICENSE`) |

O **servidor do Context7** não é copiado: é um servidor MCP remoto (`https://mcp.context7.com/mcp`) declarado em `.mcp.json`. Funciona sem chave, com limites de uso. Segundo a skill, só envia o nome da biblioteca e o texto da pergunta, nunca código. A CLI `ctx7` (que exige Node 22.13 ou mais recente) não é usada.

## Notas

- **Impeccable:** o binário do detetor não está incluído. O lançador (`skills/impeccable/scripts/impeccable`) descarrega o binário certo para o sistema operativo na primeira utilização e guarda-o numa cache com a versão fixa. Os hooks do estúdio correm-no com `IMPECCABLE_NO_TELEMETRY=1`.
- **graphify:** única alteração, `disable-model-invocation: true`. Só corre com `/studio:graphify`, porque a descrição original faz a skill disparar em qualquer pergunta sobre código. Na primeira utilização instala o pacote Python `graphifyy` (uv, pipx ou pip). Os agentes do estúdio usam o grafo quando existe `graphify-out/` no projeto.
- **Ponytail:** só a skill está incluída. O registo de custos, a statusline e o painel do plugin original não estão. As regras chegam aos subagentes do estúdio através de `hooks/subagent.js` e ao orquestrador do build através de `hooks/knowledge.js`.
