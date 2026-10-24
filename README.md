# Estúdio multi-modelo

Um plugin do Claude Code (`studio`) que leva uma ideia até à entrega: o Opus orquestra, e o Sonnet e o Haiku executam. Há dois gates humanos, guardrails determinísticos e evals para medir se cada mudança ajuda.

```
/studio:build "Plataforma de reservas de salas com login Microsoft"
```

Ideia (critic) → Spec (**gate 1**) → Plano com tiers → Implementação paralela em worktrees → Verificação + review independente → Entrega (**gate 2**) → Retro

## Estrutura

| Caminho | O que é |
|---|---|
| `plugins/studio/agents/` | `critic` (Opus), `explorer` (Haiku), `implementer` (Sonnet), `reviewer` (Opus) |
| `plugins/studio/skills/build/` | O pipeline `/studio:build` e os templates (state, spec, plan) |
| `plugins/studio/skills/retro/` | `/studio:retro`: transforma falhas em lições |
| `plugins/studio/hooks/` | Guardrails (ver abaixo) |
| `plugins/studio/.mcp.json` | Context7 (documentação atualizada de bibliotecas) |
| `knowledge/lessons.md` | Lições entre projetos, lidas no início de cada build |
| `evals/` | Tarefas de referência com checks escondidos |

Em cada projeto, o estúdio escreve em `docs/studio/<slug>/` (spec, plano, review, entrega, retro) e em `.studio/verify` (o comando de verificação). Se um build parar a meio, retoma a partir do `state.md`.

## Instalar

```bash
claude plugin marketplace add C:/Projects/multi-model
```

```bash
claude plugin install studio@studio-local
```

Depois de alterar o plugin, atualiza a instalação (ou reinstala). As evals usam sempre a cópia de trabalho via `--plugin-dir`.

**Corre a sessão principal em Opus**, porque é ela o orquestrador.

## Guardrails (hooks)

Sempre ativos:
- bloqueiam `rm -rf` / `Remove-Item -Recurse` sobre a raiz, a home ou `..`
- bloqueiam `curl | sh` e `iwr | iex`
- bloqueiam a escrita em `.env` e conteúdo com secrets (chaves AWS, GitHub, Anthropic, OpenAI, Slack, Google, chaves privadas)

Só em projetos com `.studio/`:
- bloqueiam push forçado e push para `main`/`master`
- **exigem `.studio/verify` verde antes de cada commit**

Testar o guard: `printf '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"}}' | node plugins/studio/hooks/guard.js` deve sair com código 2.

## Evals

```bash
node evals/run.js --dry-run
```

```bash
node evals/run.js --label baseline
```

Cada tarefa vive em `evals/tasks/<id>/` e tem:

| Ficheiro | Para quê |
|---|---|
| `task.md` | O pedido, escrito como um ticket ou uma ideia real |
| `fixture/` | O código inicial (opcional) |
| `check.js` | O check escondido, só copiado depois do agente terminar |
| `reference/` | Uma solução correta, usada só para validar o check |
| `flags` | Flags extra do `/studio:build` (opcional). Por omissão é `--skip-idea`; com o ficheiro vazio, a fase de ideia corre |

O `--dry-run` valida cada check nos dois sentidos: tem de falhar no fixture e passar com a referência. O agente em teste só tem acesso ao plugin e a `knowledge/`, por isso `evals/` (checks e referências) fica-lhe inacessível.

Os resultados (passou, custo, duração, turnos, modelo, versão do estúdio) vão para `evals/results.csv`.

**Regra:** antes de adicionar uma skill, mudar um modelo ou mexer num prompt, corre as evals com `--label` antes e depois, e compara. Faz commit do estúdio antes, para que a versão fique registada.

**A mistura importa.** As evals têm de ter a mesma distribuição daquilo que queres que o estúdio construa. Se forem todas da mesma stack, vais otimizar para essa stack sem dares por isso.

| Complexidade | Tarefas |
|---|---|
| Pequena | 001 slugify, 002 desconto no carrinho, 003 404 em utilizadores, 004 validação de registo, 005 regressão do parser CSV |
| Média | 006 autenticação e paginação, 007 CLI de tarefas, 008 ETL de CSV, 009 estados de UI de pesquisa, 010 migração de esquema, 011 integração de câmbios |
| Grande | 012 app de notas CRUD, 013 refactor de error handling |
| Greenfield (com fase de ideia) | 014 dividir despesas, 015 streaks de hábitos |

## Obsidian

Abre `C:/Projects/multi-model` como vault para ver e curar `knowledge/`. Para um projeto, abre a pasta `docs/studio/` dele. As lições usam `[[slug]]` para ligar à origem. O agente não precisa do Obsidian: lê os ficheiros diretamente.

## Fase 2: acrescentar só quando as evals ou uma falha real o justificarem

Lê cada skill antes de a instalar e fixa a versão. São código que corre com as tuas permissões.

| Ferramenta | Para quê | Onde liga |
|---|---|---|
| Ponytail (`DietrichGebert/ponytail`) | Menos over-building | implementer |
| addyosmani/agent-skills | Adaptar práticas ao pipeline (não correr em paralelo) | build |
| thermo-nuclear review (só a skill, sem o pstack) | Review estrutural em marcos | reviewer, ocasional |
| Impeccable (`pbakaus/impeccable`) | Design de UI sem cara de template; 62 regras determinísticas, sem LLM | implementer de frontend (skill), reviewer ou hook (detetor). **Desligar a telemetria.** Primeiro candidato de UI: entra se a app de finanças sair genérica |
| Emil Kowalski (`emil-design-eng`) | Motion e polish de UI | implementer de frontend. Só se o motion importar, e nunca com o Impeccable em simultâneo para a parte visual |
| 21st.dev Magic MCP | Componentes React/Tailwind | implementer de frontend |
| Humanizer (`blader/humanizer`) | Prosa que não soa a IA, sem mudar o conteúdo | **Já instalado.** Na entrega, para README, `delivery.md` e documentação para utilizadores. Nunca em specs nem planos: são contratos e a precisão vale mais do que o estilo |
| Strix | Pentest dinâmico contra staging | CI / entrega |
| graphify | Mapa de codebases grandes | explorer, reviewer (já suportado se existir `graphify-out/`) |
| Playwright / Chrome DevTools MCP | Verificação de UI no browser | reviewer |

### Avaliadas e rejeitadas

Ficam aqui para não voltarem a ser avaliadas do zero. Só se reabrem se o motivo deixar de valer.

| Ferramenta | Motivo |
|---|---|
| pstack (plugin completo) | O router dele compete com o orquestrador. Só se aproveita a skill thermo-nuclear |
| Hallmark (`Nutlope/hallmark`) | Duplica o Impeccable; duas skills de design em simultâneo dão instruções contraditórias |
| Scrapling (`D4Vinci/Scrapling`) | Sem falha de pesquisa que o justifique: o WebFetch, o Chrome DevTools MCP e o Context7 cobrem os casos. O ponto forte é contornar anti-bot (stealth, Cloudflare), um risco de termos de serviço. Reabrir só se as retros mostrarem falhas de leitura de páginas, e mesmo assim sem o modo stealth |
| Agent-Reach (`Panniantong/Agent-Reach`) | Copia cookies das sessões do Chrome para aceder a sites com login (risco de conta e de termos de serviço) e instala-se com instruções remotas executadas pelo agente (supply chain). Não usar num computador da empresa |
| Harness² (`google-research/harness2`) | Só Linux, Vertex AI e executores OpenCode/Codex. A ideia (melhorar o harness com evidência) já está nas evals; um `/studio:improve` só faz sentido com dezenas de builds reais e evals não saturadas |
