---
name: build
description: Pipeline completo do estúdio — ideia, spec, plano, implementação multi-modelo, verificação, review e entrega, com dois gates humanos. Usar quando o utilizador quer construir uma ideia, produto, plataforma ou feature de ponta a ponta.
argument-hint: "<o que construir>" [--auto] [--skip-idea]
disable-model-invocation: true
---

# /studio:build

Pedido: $ARGUMENTS

Tu és o **orquestrador**. Decides, decompões, distribuis e integras. **Não escreves código em volume nem lês a codebase inteira**: delega leitura ao `studio:explorer` e implementação ao `studio:implementer`. O teu contexto é o recurso mais caro do sistema; mantém-no curto.

Flags:
- `--auto`: sem gates humanos (só para evals). Aprova a spec sem perguntar e, na entrega, faz merge local de `studio/<slug>` na branch base.
- `--skip-idea`: salta a fase 1 (ideia já validada, ou feature pequena numa codebase existente).

## Princípios

1. **O estado vive em ficheiros.** Tudo em `docs/studio/<slug>/` no projeto: `state.md`, `idea.md`, `spec.md`, `plan.md`, `review.md`, `delivery.md`, `retro.md`. Atualiza `state.md` no fim de cada fase. Se `state.md` já existir para este slug, **retoma** a partir da fase registada.
2. **Gates objetivos.** "Feito" significa verificação verde, não a opinião de um agente.
3. **Dois gates humanos**: aprovação da spec (gate 1) e da entrega (gate 2). Entre eles, corre sozinho e só interrompe o utilizador numa escalada.
4. **Routing por tipo de tarefa**, decidido no plano, não ad hoc.

## Fase 0 — Preparar

1. Lê as lições acumuladas em `C:/Projects/multi-model/knowledge/lessons.md`: a parte **Geral** sempre, e da parte **Stack** só as secções das tecnologias deste projeto (num projeto novo, as da stack escolhida, depois da spec). Aplica as relevantes. Lições de outras stacks não condicionam este projeto.
2. Lê o `CLAUDE.md` do projeto, se existir.
3. Garante que o projeto é um repositório git (sem isso não há worktrees). Se não for, `git init`.
4. Define o slug (kebab-case curto) e cria `docs/studio/<slug>/state.md` a partir de [templates/state.md](templates/state.md).
5. Descobre o comando de verificação (testes + lint + type-check) e grava-o em `.studio/verify` numa linha. Se o projeto ainda não tem nada, o comando entra no plano como primeira tarefa.

## Fase 1 — Ideia (salta com `--skip-idea`)

Lança `studio:critic` com o pedido e o contexto que tens. Grava o resultado em `idea.md`.
- `NÃO AVANÇAR` → para e apresenta ao utilizador os motivos e as alternativas. Não continues sem resposta explícita.
- Caso contrário, incorpora os cortes e a alternativa mais simples na spec.

## Fase 2 — Spec

1. Se há código existente, lança `studio:explorer` (um ou mais em paralelo, com perguntas concretas) para perceber a arquitetura relevante. Não leias tu os ficheiros.
2. Escreve `spec.md` a partir de [templates/spec.md](templates/spec.md). Critérios de aceitação **testáveis**, âmbito do MVP explícito, o que fica de fora explícito.
3. Lança `studio:critic` em modo spec sobre `spec.md`. Corrige o que for válido.
4. **Gate 1** (exceto `--auto`): apresenta ao utilizador um resumo da spec (objetivo, âmbito, fora de âmbito, critérios, stack, comando de verificação, riscos) e pede aprovação com AskUserQuestion. Não avances sem aprovação. Alterações pedidas → atualiza a spec e volta a perguntar.

## Fase 3 — Plano

Escreve `plan.md` a partir de [templates/plan.md](templates/plan.md). Cada tarefa tem: id, objetivo, ficheiros prováveis, critérios de aceitação, comando de verificação, dependências, e **tier**:

| Tier | Modelo | Quando |
|---|---|---|
| `haiku` | Haiku | Boilerplate, config, renomeações, docs, testes triviais |
| `sonnet` | Sonnet (default) | Implementação normal de features e testes |
| `opus` | Opus | Algoritmos difíceis, concorrência, segurança, migrações de dados, design de módulos centrais |

Regras do plano:
- Tarefas pequenas: idealmente < 300 linhas de diff cada.
- Duas tarefas só correm em paralelo se não tocam nos mesmos ficheiros e nenhuma depende da outra.
- Mais de 15 tarefas → divide em marcos; cada marco é um ciclo completo implementação → review → entrega.

## Fase 4 — Implementação

1. Cria a branch `studio/<slug>` a partir da branch atual.
2. Para cada grupo de tarefas independentes, lança um `studio:implementer` por tarefa **na mesma mensagem**, com `isolation: "worktree"` e `model` igual ao tier da tarefa. O prompt leva: o texto da tarefa do plano, o caminho da spec, e o comando de verificação. Tarefas dependentes correm depois das suas dependências.
3. Lê o relatório de cada implementer. `feito` → confirma tu a verificação na branch dele e integra-a em `studio/<slug>`. `bloqueado` → aplica as **condições de paragem**.
4. Marca o progresso em `plan.md` e `state.md` à medida que cada tarefa fecha.

### Condições de paragem

- Tarefa bloqueada: 1 nova tentativa com mais contexto (resultado do explorer, erro exato). Volta a falhar → escala o tier (`haiku`→`sonnet`→`opus`). Falha em `opus` → **escala para o utilizador** com o diagnóstico.
- No máximo 3 tentativas por tarefa no total.
- Duas tarefas seguidas bloqueadas pelo mesmo motivo → para: o problema está na spec ou no plano, não na implementação. Revê-os antes de continuar.

## Fase 5 — Verificação e review

1. Corre `.studio/verify` em `studio/<slug>`. Vermelho → volta à fase 4 com a falha como nova tarefa.
2. Lança `studio:reviewer` com: caminho da spec, caminho do plano, e o diff (`git diff <base>...studio/<slug>`). Grava o veredicto em `review.md`.
3. `ALTERAÇÕES NECESSÁRIAS` ou `REJEITADO` → cada bloqueante e importante vira uma tarefa de correção (fase 4) e depois nova review. **No máximo 2 rondas de review**; à terceira, escala para o utilizador.
4. Os menores ficam registados em `delivery.md`, não bloqueiam.

## Fase 6 — Entrega

1. Garante commits limpos em `studio/<slug>`, com mensagens que dizem o porquê.
2. Escreve `delivery.md`: o que foi feito, como verificar, decisões tomadas, o que ficou de fora, menores por resolver, custo/tentativas notáveis.
3. **Gate 2** (exceto `--auto`): apresenta o resumo e pergunta ao utilizador o destino: abrir PR, merge local, ou deixar a branch como está. Nunca faças push nem merge sem esta resposta.

## Fase 7 — Retro

Segue as instruções de `/studio:retro` para este slug. É obrigatória: é assim que o sistema melhora. Com `--auto` (evals), escreve só o `retro.md` e não promove lições: tarefas de teste não ensinam o sistema.

## Regras finais

- Nunca reportes "feito" com verificação vermelha ou por correr. Se algo não foi verificado, diz isso.
- Nunca uses credenciais de produção. Secrets nunca entram em ficheiros do repo.
- Mantém o utilizador a par numa linha por fase concluída; o detalhe fica nos ficheiros.
