# Baseline — audit-distribution (2026-11-03, macOS, Node v24.15.0)

## Testes
- `node --test plugins/studio/hooks/guard.test.js`: 11 testes, 11 passam, 0 falham.
- Cobertura de `guard.js`: 99,24 % linhas, 86,11 % ramos, 100 % funções (sem cobertura: 261–262).
- `knowledge.js`, `subagent.js`, `doctor.js`, `scripts/vendor.js`: sem testes.
- Nota: `node --test plugins/studio/hooks/` (pasta) falha em Node 24 por tratar a pasta como ficheiro; o README indica o ficheiro, que funciona.

## Validação
- `node --check` em todos os `.js` versionados fora de evals/: 0 erros.
- JSON versionados fora de evals/: 0 inválidos.
- `claude plugin validate plugins/studio`: passa. `claude plugin validate .` (marketplace): passa.
- Não há package.json nem lockfile: sem `npm audit`.

## doctor.js nesta máquina (macOS)
12 verificações: 8 ok, 4 avisos (detetor Impeccable sem detalhe, graphify global duplicado, sem regra de escrita das lições, Claude Security não instalado). REA registado. Nenhuma verificação é feita a: Chrome, Hopper/Ghidra/IDA/Kuna, JADX/Java, Humanizer, Ponytail, Context7 MCP registado na sessão.

## Hotspots (12 meses, plugins/ scripts/ .claude-plugin/)
| Alterações | Ficheiro |
|---|---|
| 16 | plugins/studio/.claude-plugin/plugin.json |
| 13 | plugins/studio/skills/build/SKILL.md |
| 7 | plugins/studio/skills/retro/SKILL.md |
| 7 | plugins/studio/agents/implementer.md |
| 6 | plugins/studio/skills/audit/SKILL.md |
| 6 | plugins/studio/hooks/hooks.json |
| 5 | plugins/studio/skills/build/templates/spec.md |
| 5 | plugins/studio/hooks/knowledge.js |
| 4 | plugins/studio/agents/reviewer.md |
| 3 | scripts/vendor.js |

## Maiores ficheiros (linhas)
| Linhas | Ficheiro |
|---|---|
| 13 557 | skills/impeccable/scripts/live-browser.js (vendored, gerado) |
| 320 | skills/impeccable/scripts/live-browser-dom.js (vendored) |
| 264 | hooks/guard.js |
| 242 | skills/impeccable/scripts/live-browser-ignores.js (vendored) |
| 239 | skills/impeccable/scripts/impeccable.cmd (lançador Windows) |
| 212 | skills/impeccable/scripts/impeccable (lançador POSIX) |
| 184 | hooks/guard.test.js |
| 160 | scripts/doctor.js |
| 116 | scripts/vendor.js |
