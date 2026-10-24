# Estúdio multi-modelo

Um plugin do Claude Code (`studio`) que leva uma ideia até à entrega: o Opus orquestra, e o Sonnet e o Haiku executam. Há dois gates humanos, guardrails determinísticos e evals para medir se cada mudança ajuda.

```
/studio:build "Plataforma de reservas de salas com login Microsoft"
```

Ideia (critic) → Spec (**gate 1**) → Plano com tiers → Implementação paralela em worktrees → Verificação + review independente → Entrega (**gate 2**) → Retro

Tarefas pequenas e sem risco seguem o **modo rápido**: sem critic, sem plano separado e com a review em Sonnet. A triagem é feita na fase 0.

Projetos com interface passam por uma etapa de **design** na spec. Com o Impeccable instalado, o `PRODUCT.md` e o `DESIGN.md` são criados antes do gate 1, onde aprovas a direção visual. Depois disso:
- o sistema visual é a primeira tarefa de UI, em Opus;
- os implementers seguem o `DESIGN.md`;
- a review corre o detetor sobre a app a correr, em desktop e em mobile.

O detetor apanha anti-padrões, não mede beleza. É a direção aprovada no gate 1 que faz a diferença estética.

O **gate 1 é uma revisão guiada.** A spec tem uma secção de **Decisões**, no máximo ~7: as escolhas que mudam o produto, o custo ou o risco, cada uma com opções, trade-offs, a recomendação do agente e o custo de mudar depois. Podes aprovar tudo como recomendado, ou escolher decisões para discutir, uma a uma. Nessa discussão, o agente defende a recomendação, mas apresenta também o melhor argumento contra ela. As alterações propagam-se à spec, e as que contrariam as recomendações alimentam o [`knowledge/preferences.md`](knowledge/preferences.md). Assim, as recomendações dos projetos seguintes ficam mais próximas do que preferes, sem nunca decidirem por ti.

Para algo que já existe:

```
/studio:audit "módulo de pagamentos"
```

Âmbito → Mapa → Baseline objetivo → Lentes em paralelo (correção, segurança, manutenibilidade) → Verificação adversarial → Backlog com no máximo 15 itens (**gate**) → cada item escolhido segue para o `/studio:build`, a começar por um teste que reproduz o problema. A auditoria nunca altera código.

## Estrutura

| Caminho | O que é |
|---|---|
| `plugins/studio/agents/` | `critic` (Opus), `explorer` (Haiku), `implementer` (Sonnet), `reviewer` (Opus), `auditor` (Opus; Sonnet na manutenibilidade), `verifier` (Sonnet; Opus para critical/high) |
| `plugins/studio/skills/build/` | O pipeline `/studio:build` e os templates (state, spec, plan) |
| `plugins/studio/skills/audit/` | `/studio:audit`, as rubricas das lentes (`lenses/`) e os templates. Uma lente nova é só um ficheiro novo em `lenses/` |
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
| Auditoria (`command` = `/studio:audit`) | 016 API de loja em Node, 017 app de despesas em Python |
| Agentes isolados (`command` = `agent:<nome>`) | 018 o verificador perante 4 findings falsos e 2 reais (sobre o fixture da 016) |

As evals de auditoria plantam 8 problemas reais (alguns óbvios, outros só visíveis atravessando ficheiros) e 4 **decoys**: código que parece suspeito mas está correto. A biblioteca [`evals/lib/audit-check.js`](evals/lib/audit-check.js) mede:
- o **recall**, ou quantos dos problemas plantados foram reportados (o mínimo para passar é 75%);
- os **falsos positivos em decoys** (no máximo 1);
- os **outros** findings, que não batem com nada conhecido e são registados mas não penalizados;
- que a auditoria **não alterou código**.

Estas métricas ficam na coluna `metricas` do `results.csv`. Ao contrário do passou/falhou dos builds, não saturam facilmente.

## Obsidian

Abre `C:/Projects/multi-model` como vault para ver e curar `knowledge/`. Para um projeto, abre a pasta `docs/studio/` dele. As lições usam `[[slug]]` para ligar à origem. O agente não precisa do Obsidian: lê os ficheiros diretamente.

## Fase 2: acrescentar só quando as evals ou uma falha real o justificarem

Lê cada skill antes de a instalar e fixa a versão. São código que corre com as tuas permissões.

| Ferramenta | Para quê | Onde liga |
|---|---|---|
| Ponytail (`DietrichGebert/ponytail`, plugin 5.3.2) | Menos over-building | **Adotado** (A/B de 2026-10-25, evals 012–014): **−58% de código** (2 670 → 1 134 linhas), **−43% de custo** (30,8 → 17,5 USD), −29% de tempo, 3/3 a passar nos dois grupos. Instalado a nível de utilizador; um hook leva-o aos subagentes. Entrou porque a app de finanças tinha "muito código para uma app simples". A vigiar nas retros: os testes também caíram 64%. Para reviews e auditorias continuam a usar-se o `studio:reviewer` e o `/studio:audit`, não o `ponytail-review` nem o `ponytail-audit` |
| addyosmani/agent-skills | Adaptar práticas ao pipeline (não correr em paralelo) | build |
| thermo-nuclear review (só a skill, sem o pstack) | Review estrutural em marcos | reviewer, ocasional |
| Impeccable (`pbakaus/impeccable`) | Design de UI sem cara de template; detetor determinístico sem LLM | **Integrado na 0.4.0**: direção de design na spec, sistema visual como primeira tarefa de UI, gate de design na review. Entrou porque a interface da app de finanças saiu esteticamente fraca. **Desligar a telemetria** (`impeccable telemetry off`) |
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
