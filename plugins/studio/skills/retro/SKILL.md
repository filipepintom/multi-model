---
name: retro
description: Retrospetiva de um build do estúdio — transforma falhas e escaladas em lições reutilizáveis. Corre no fim de cada /studio:build ou manualmente sobre um slug.
argument-hint: "[slug]"
disable-model-invocation: true
---

# /studio:retro

Slug: $ARGUMENTS (se vazio, usa o `docs/studio/*/state.md` modificado mais recentemente).

## 1. Recolher factos

Lê, em `docs/studio/<slug>/`: `state.md` (escaladas), `plan.md` (tentativas por tarefa, tiers), `review.md` (rondas e bloqueantes) e `delivery.md`. Usa só factos destes ficheiros; não inventes.

## 2. Escrever `docs/studio/<slug>/retro.md`

```
# Retro — <slug>

## Números
- Tarefas: <n> · bloqueadas: <n> · escaladas de tier: <n> · escaladas para humano: <n>
- Rondas de review: <n> · bloqueantes encontrados: <n>

## O que correu mal (causa, não sintoma)
- <problema> → <causa raiz> → <o que o teria evitado>

## Routing
- Tarefas cujo tier estava errado: <id, tier previsto → tier que precisou>

## Lições
- <lição>
```

## 3. Gravar lições (é aqui que o sistema aprende)

O contexto já traz, na secção "Conhecimento do estúdio" injetada pelo plugin, as **lições do plugin** (de base, só leitura), as **tuas lições** e as **tuas preferências**, com o caminho da pasta pessoal. Usa esse conteúdo para procurar duplicados e conflitos sem voltares a ler os ficheiros.

Para cada lição, decide onde pertence:

- **Específica deste projeto** (convenções, armadilhas da codebase) → acrescenta ao `CLAUDE.md` do projeto.
- **Útil noutros projetos** → nas **tuas lições** (`lessons.md` na pasta pessoal): na parte **Geral** (processo, spec, routing, verificação) ou numa secção `## Stack: <tecnologia>` (cria-a se não existir). Na dúvida entre geral e stack, é stack.
- **Nunca editas as lições do plugin.**

Regras:
- No máximo 3 lições novas por retro. Prefere as que teriam evitado uma escalada.
- **Sem duplicados:** se uma lição do plugin ou uma tua já cobre o mesmo, não acrescentas. Se a tua experiência a refina, atualizas a tua.
- **Conflitos:** se uma lição tua contradiz uma do plugin, mantém a tua (vale para este utilizador), acrescenta `(contradiz a lição do plugin: <resumo>)` e menciona-o no resumo final. Ou a lição comum está errada, ou é um caso especial que merece ser registado.
- **Consolidar:** se as tuas lições passarem de ~40 linhas, junta as parecidas e apaga as obsoletas antes de acrescentar.
- Uma lição que se provou errada ou obsoleta é apagada.
- Formato: uma linha acionável + `(origem: [[<slug>]], <YYYY-MM-DD>)`.
- Com `--auto` (evals), não gravas lições.

## 4. Atualizar as tuas preferências

As lições dizem como o estúdio deve trabalhar; as preferências dizem o que **este utilizador** tende a querer. Lê no `state.md` as decisões que o utilizador alterou no gate 1, e qualquer feedback dele sobre a entrega. Para cada padrão claro, acrescenta ou atualiza uma linha no `preferences.md` da pasta pessoal, na secção certa (cria-a se não existir: Produto e âmbito, Arquitetura e dados, Acesso e publicação, Design), com a origem.

- Só registas o que o utilizador escolheu ou disse, nunca o que inferiste sem evidência.
- Uma escolha isolada e muito específica do projeto não é uma preferência. Duas escolhas no mesmo sentido, ou uma afirmação explícita do utilizador, são.
- Se uma preferência nova contradiz uma antiga, substitui a antiga: as pessoas mudam de ideias.
- Com `--auto` (evals), não alteras as preferências.

Termina com um resumo de 3 linhas ao utilizador: números, a lição mais importante e onde foi gravada, e os conflitos, se houver.
