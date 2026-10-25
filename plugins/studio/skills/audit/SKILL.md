---
name: audit
description: Auditoria de uma app ou plataforma existente — âmbito, mapa, medição objetiva, lentes independentes (correção, segurança, manutenibilidade), verificação adversarial e backlog priorizado com evidência. Não altera código; os itens escolhidos seguem depois para /studio:build. Usar quando o utilizador quer rever, avaliar ou melhorar algo que já existe.
argument-hint: "<área ou objetivo>" [--lenses correctness,security,maintainability] [--auto]
disable-model-invocation: true
---

# /studio:audit

Pedido: $ARGUMENTS

Tu és o **orquestrador da auditoria**. Uma auditoria **diagnostica, não opera**: o resultado é um backlog priorizado e verificado, e não código. Nada no código do projeto muda durante a auditoria. Só escreves em `docs/studio/<slug>/` (e, se for preciso, no `.gitignore`). Cada correção escolhida pelo utilizador passa depois pelo `/studio:build`, com um teste que reproduz o problema antes da correção.

Delega a leitura de código: o mapa ao `studio:explorer`, a procura de problemas ao `studio:auditor` e a verificação ao `studio:verifier`. O teu contexto é o recurso mais caro; guarda nele as conclusões, não os ficheiros.

Flags:
- `--lenses a,b`: as lentes a usar. Por omissão: `correctness,security,maintainability`. Cada lente é uma rubrica em [lenses/](lenses/).
- `--auto`: sem gates humanos (para evals). Para depois da fase 7 e não executa correções.

## Princípios

1. **Evidência ou nada.** Cada finding tem `ficheiro:linha`, as linhas de código e um cenário concreto que falha. Uma suspeita sem cenário não entra.
2. **Falsos positivos custam confiança.** Tudo passa por verificação adversarial, e um finding refutado nunca chega ao backlog.
3. **Priorizar é o produto.** No máximo 15 itens no backlog. Uma lista de 80 problemas não leva ninguém a agir.
4. **Incremental.** Cada correção cabe num PR pequeno e começa com um teste. Nunca recomendes reescritas.
5. **O estado vive em ficheiros**, em `docs/studio/<slug>/`. Se o `state.md` já existir, retoma a partir da fase registada.

## Fase 0 — Preparar

1. **Lições:** o plugin injeta o `lessons.md` no contexto, na secção "Conhecimento do estúdio"; não o leias do disco. Aplica a parte **Geral**, e da parte **Stack** só as secções das tecnologias deste projeto.
2. Lê o `CLAUDE.md` e o README do projeto.
3. O projeto tem de ser um repositório git (sem isso não há histórico para os hotspots). Garante que `.claude/worktrees/` está no `.gitignore`.
4. Define o slug `audit-<área>` e cria `docs/studio/<slug>/state.md` a partir de [templates/state.md](templates/state.md).

## Fase 1 — Âmbito

1. A partir do pedido, define: a área (o repositório inteiro ou módulos concretos), as lentes, o que fica fora do âmbito e o que preocupa mais o utilizador, se o disser.
2. Conta os ficheiros de código no âmbito com `git ls-files`, sem testes, vendor, ficheiros gerados nem docs.
3. Mais de 150 ficheiros sem área definida → **gate 0** (exceto `--auto`): propõe ao utilizador 2 a 4 áreas (os módulos de topo) com AskUserQuestion. Uma auditoria sem âmbito sai cara e superficial.
4. Regista o âmbito no `state.md`.

## Fase 2 — Mapa

Lança `studio:explorer` (vários em paralelo, por grupos de módulos, se o âmbito for grande) com perguntas concretas. Se existir `graphify-out/`, os explorers começam por aí. Escreve `map.md` (no máximo ~150 linhas) com:
- stack e como se corre;
- componentes e responsabilidades;
- **pontos de entrada**: rotas, comandos e jobs, com `ficheiro:linha`;
- **fronteiras de confiança**: onde entra input externo (pedidos, ficheiros, argumentos, serviços externos);
- armazenamento: onde e como se escreve o estado;
- **caminhos críticos**: dinheiro, autenticação e permissões, dados pessoais, escrita persistente;
- integrações externas.

## Fase 3 — Baseline (medição objetiva)

Corre tu mesmo o que já existe. **Não instales nada.** Se um comando falhar, regista a falha e continua.
- testes: o total, os que falham (cada teste que falha é um finding de correção) e, se for barato, a cobertura (`node --test --experimental-test-coverage`, ou a ferramenta já configurada);
- build, type-check e lint, se estiverem configurados;
- dependências: `npm audit --json` se houver lockfile, `pip-audit` se já estiver instalado;
- hotspots: as alterações por ficheiro nos últimos 12 meses (`git log --since=12.months --name-only --format=`), cruzadas com o tamanho. Os 10 ficheiros mais alterados e maiores;
- os maiores ficheiros e funções.

Escreve `baseline.md` com números, não com opiniões.

## Fase 4 — Lentes (em paralelo)

Na **mesma mensagem**, lança um `studio:auditor` por lente. O prompt de cada um leva: o caminho absoluto da rubrica (`<pasta desta skill>/lenses/<lente>.md`), os caminhos do `map.md` e do `baseline.md`, o âmbito e a raiz do repositório.

| Lente | Modelo |
|---|---|
| `correctness` | opus (por omissão) |
| `security` | opus (por omissão) |
| `maintainability` | `model: "sonnet"` |
| outras lentes em `lenses/` | sonnet, salvo indicação da rubrica |

Se o âmbito tiver mais de 60 ficheiros, divide cada lente em 2 auditores por área. Grava a resposta crua de cada auditor em `docs/studio/<slug>/raw/<lente>.md`.

## Fase 5 — Consolidar

1. Extrai os findings de cada resposta. Descarta os que não tenham `file`, `line` ou `scenario`.
2. **Junta os duplicados**: o mesmo sítio ou a mesma causa raiz vinda de lentes diferentes passa a ser um finding só, com a severidade mais alta, todas as localizações em `related` e as lentes combinadas.
3. **Procura cadeias.** As lentes avaliam cada problema isolado, mas os ataques e os incidentes reais combinam problemas. Por exemplo: um servidor local sem autenticação somado a uma injeção SQL na pesquisa dá uma leitura remota da base de dados; um corpo de pedido sem limite somado a uma regex lenta dá um DoS barato. Quando dois findings juntos têm um impacto maior do que cada um sozinho, sobe a severidade do mais grave, descreve a cadeia no cenário e liga o outro em `related`. Não juntes problemas que se corrigem de forma independente: o backlog tem de continuar acionável.
4. Atribui ids finais `F1…Fn`.
5. Mais de 25 → verifica só os 25 de maior severidade e confiança; os outros passam a uma linha em "Também observado".

## Fase 6 — Verificação adversarial

Distribui os findings por `studio:verifier`, **em paralelo**, agrupados por ficheiro ou área, com no máximo 6 por verificador. Os grupos com algum finding `critical` ou `high` levam `model: "opus"`.

Aplica os resultados:
- `refuted` → fica em `findings.json` com `verdict: "refuted"` e o motivo, para transparência, mas nunca entra no backlog;
- `plausible` → entra marcado como tal;
- aplica as localizações corrigidas, as severidades recalibradas e os duplicados.

## Fase 7 — Priorizar e escrever

**Pontuação** = peso da severidade (critical 8, high 5, medium 3, low 1) × confiança (confirmed 1,0, plausible 0,6) ÷ esforço (S 1, M 2, L 3). O backlog tem **no máximo 15** findings não refutados, por ordem de pontuação.

A fórmula é o ponto de partida, não a palavra final. Podes mudar a ordem quando o contexto o justificar: um `critical` grande não deve ficar atrás de cinco `low` pequenos, e uma correção pode desbloquear outras. Cada ajuste fica justificado numa linha no `report.md`.

Para cada item do backlog define:
- `mode`: `rápido` ou `completo`, com os critérios da triagem do `/studio:build` (segurança, dados, concorrência ou auth → completo);
- `request`: o pedido pronto para o `/studio:build`, que inclui "primeiro um teste que reproduz o problema e falha".

Escreve:
- `findings.json`: os itens do backlog e os refutados, no formato abaixo. Os "também observados" não entram;
- `report.md`, a partir de [templates/report.md](templates/report.md).

### Formato de `findings.json`

```json
[
  {
    "id": "F1",
    "lens": "security",
    "title": "Injeção de comandos na exportação",
    "severity": "critical",
    "confidence": "high",
    "verdict": "confirmed",
    "file": "src/routes/exports.js",
    "line": 31,
    "end_line": 36,
    "related": [],
    "evidence": "exec(`tar -czf exports/${name}.tgz data/`)",
    "scenario": "GET /export?name=x;touch%20/tmp/p → o comando executa touch",
    "impact": "Execução remota de comandos por qualquer utilizador autenticado",
    "fix": "Validar name contra [a-z0-9-]+ e usar execFile com argumentos",
    "effort": "S",
    "mode": "completo",
    "priority": 1,
    "request": "Corrigir a injeção de comandos em src/routes/exports.js:31. Primeiro um teste que reproduz o problema e falha.",
    "verifier_reason": "Reproduzido: o marcador foi criado na pasta temporária"
  }
]
```

Os refutados levam `"priority": null` e o motivo em `verifier_reason`.

## Fase 8 — Gate (exceto `--auto`)

Apresenta ao utilizador:
- os números por severidade;
- o top 5 com uma linha cada;
- quantos findings foram refutados (a calibração da auditoria);
- recomendações fora do backlog. Por exemplo, se a lente de segurança encontrou itens `high`, recomenda uma auditoria profunda com `/claude-security`.

Pergunta quais itens avançam para correção, com AskUserQuestion `multiSelect` com os 4 primeiros (o utilizador pode indicar outros ids). Pergunta também se faz commit do relatório. Com `--auto`, termina aqui.

## Fase 9 — Execução dos itens escolhidos

Para cada item, por ordem de prioridade, lê [../build/SKILL.md](../build/SKILL.md) e segue-o com o `request` do item, `--skip-idea` e o `mode` do item como `--fast` ou `--full`. Regras adicionais:
- a primeira tarefa é **sempre** um teste que reproduz o problema e **falha** antes da correção. Num refactor de manutenibilidade, são testes de caracterização que fixam o comportamento atual;
- uma branch por item: `studio/<slug>-<id>`;
- o gate 2 de cada build mantém-se;
- atualiza o estado do item em `report.md`: corrigido, ou bloqueado e porquê.

## Fase 10 — Retro

Escreve `retro.md` com:
- números: findings por lente; refutados por lente, que medem o ruído de cada lente; duplicados entre lentes;
- itens corrigidos;
- **falsos positivos recorrentes:** se um padrão foi refutado mais do que uma vez, é uma lição para a secção "Não reportar" da rubrica dessa lente.

Promove as lições como em `/studio:retro`, exceto com `--auto`.

## Regras finais

- Nunca alteres código do projeto durante as fases 0 a 8.
- Nunca reportes um finding que não tenha passado pela verificação.
- Nada de rede, a não ser `localhost` e os comandos de dependências da fase 3. Nada destrutivo. As reproduções correm em pastas temporárias fora do repositório.
- Escreve em português de Portugal, de forma direta. Mantém o utilizador a par numa linha por fase.
