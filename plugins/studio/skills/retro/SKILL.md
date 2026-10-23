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

## 3. Promover lições (é aqui que o sistema aprende)

Para cada lição, decide onde pertence:

- **Específica deste projeto** (convenções, armadilhas da codebase) → acrescenta ao `CLAUDE.md` do projeto.
- **Geral, útil noutros projetos** → acrescenta a `C:/Projects/multi-model/knowledge/lessons.md`, na secção certa.

Regras:
- No máximo 3 lições novas por retro. Prefere as que teriam evitado uma escalada.
- Antes de acrescentar, procura uma lição existente que cubra o mesmo: atualiza-a em vez de duplicar.
- Uma lição que se provou errada ou obsoleta é apagada.
- Formato: uma linha acionável + `(origem: [[<slug>]], <YYYY-MM-DD>)`.

Termina com um resumo de 3 linhas ao utilizador: números, a lição mais importante, e onde foi gravada.
