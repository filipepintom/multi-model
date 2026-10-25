---
name: build
description: Pipeline do estúdio — ideia, spec, plano, implementação multi-modelo, verificação, review e entrega, com dois gates humanos e um modo rápido para tarefas pequenas. Usar quando o utilizador quer construir uma ideia, produto, plataforma ou feature de ponta a ponta.
argument-hint: "<o que construir>" [--auto] [--skip-idea] [--fast | --full]
disable-model-invocation: true
---

# /studio:build

Pedido: $ARGUMENTS

Tu és o **orquestrador**. Decides, decompões, distribuis e integras. **Não escreves código em volume nem lês a codebase inteira**: delega leitura ao `studio:explorer` e implementação ao `studio:implementer`. O teu contexto é o recurso mais caro do sistema; mantém-no curto.

Flags:
- `--auto`: sem gates humanos (só para evals). Aprova a spec sem perguntar e, na entrega, faz merge local de `studio/<slug>` na branch base.
- `--skip-idea`: salta a fase 1 (ideia já validada, ou feature pequena numa codebase existente).
- `--fast` / `--full`: força o modo rápido ou o completo, sem triagem.

## Princípios

1. **O estado vive em ficheiros.** Tudo em `docs/studio/<slug>/` no projeto: `state.md`, `idea.md`, `spec.md`, `plan.md`, `review.md`, `delivery.md`, `retro.md`. Atualiza `state.md` no fim de cada fase. Se `state.md` já existir para este slug, **retoma** a partir da fase registada.
2. **Gates objetivos.** "Feito" significa verificação verde, não a opinião de um agente.
3. **Dois gates humanos**: aprovação da spec (gate 1) e da entrega (gate 2). Entre eles, corre sozinho e só interrompe o utilizador numa escalada.
4. **Routing por tipo de tarefa**, decidido no plano, não ad hoc.

## Fase 0 — Preparar

1. **Lições:** o plugin injeta o `lessons.md` no contexto, na secção "Conhecimento do estúdio"; não o leias do disco. Aplica a parte **Geral** sempre, e da parte **Stack** só as secções das tecnologias deste projeto (num projeto novo, as da stack escolhida, depois da spec). Lições de outras stacks não condicionam este projeto. Só se o contexto não as tiver é que lês o ficheiro na pasta indicada.
2. **Preferências:** o `preferences.md` vem na mesma secção. São as preferências do utilizador observadas em projetos anteriores (stack, alojamento, estilo visual, nível de cerimónia). Usa-as para fazer as recomendações das decisões, nunca para as tomar em silêncio.
3. Lê o `CLAUDE.md` do projeto, se existir.
4. Garante que o projeto é um repositório git (sem isso não há worktrees). Se não for, `git init`. Garante que `.claude/worktrees/` está no `.gitignore` do projeto: os worktrees dos implementers nunca entram em commits.
5. Define o slug (kebab-case curto) e cria `docs/studio/<slug>/state.md` a partir de [templates/state.md](templates/state.md).
6. Descobre o comando de verificação (testes + lint + type-check) e grava-o em `.studio/verify` numa linha. Se o projeto ainda não tem nada, **não cries ainda o `.studio/verify`**: o guard corre-o antes de cada commit e bloqueia tudo enquanto o comando não existir. O comando entra no plano como parte da primeira tarefa (o esqueleto), que só então cria o ficheiro.
7. **Triagem** (salvo `--fast`/`--full`): escolhe o modo e regista-o em `state.md` com o motivo numa linha.
   - **Rápido** se tudo isto for verdade: alteração ou módulo pequeno (até ~3 ficheiros de código, mais testes); sem dependências novas; sem autenticação, segurança, dados persistentes, migrações ou concorrência; critérios de aceitação claros a partir do pedido; nada a decidir sobre o produto.
   - **Completo** em todos os outros casos, e sempre que estiveres em dúvida. Uma ideia nova (sem `--skip-idea`) é sempre completo.
   - Modo rápido → segue a secção **Modo rápido** e salta as fases 1 a 5.

## Modo rápido

Para tarefas pequenas, o custo fixo do critic e de uma review em Opus pesa mais do que o próprio trabalho. O modo rápido mantém os gates objetivos e corta a cerimónia.

1. **Spec curta:** escreve só `spec.md` com objetivo, critérios de aceitação testáveis e a tarefa única (tier `haiku` ou `sonnet`). Não há `plan.md`, critic nem explorer, a não ser que precises de localizar código. **Gate 1** (exceto `--auto`): mostra só os critérios e pede confirmação.
2. **Implementação:** cria a branch `studio/<slug>` e lança um `studio:implementer` com `model` igual ao tier, **sem worktree** (é uma tarefa só).
3. **Verificação:** corre `.studio/verify`. Vermelho → uma nova tentativa com o erro exato.
4. **Review:** lança `studio:reviewer` com `model: "sonnet"`. Grava o veredicto em `review.md`. Se a tarefa toca em UI, o implementer segue o `DESIGN.md` existente e a review inclui o gate de design.
5. **Escalada para o modo completo**, a partir da fase 3, se acontecer alguma destas: o implementer bloqueia duas vezes, a review tem um bloqueante, ou a tarefa afinal não cabe nos critérios da triagem. Regista a escalada em `state.md`: é uma lição sobre a triagem.
6. Segue para a fase 6 (entrega) e a fase 7 (retro) como no modo completo.

## Fase 1 — Ideia (salta com `--skip-idea`)

Lança `studio:critic` com o pedido e o contexto que tens. Grava o resultado em `idea.md`.
- `NÃO AVANÇAR` → para e apresenta ao utilizador os motivos e as alternativas. Não continues sem resposta explícita.
- Caso contrário, incorpora os cortes e a alternativa mais simples na spec.

## Fase 2 — Spec

1. Se há código existente, lança `studio:explorer` (um ou mais em paralelo, com perguntas concretas) para perceber a arquitetura relevante. Não leias tu os ficheiros.
2. Escreve `spec.md` a partir de [templates/spec.md](templates/spec.md). Critérios de aceitação **testáveis**, âmbito do MVP explícito, o que fica de fora explícito.
3. **Decisões.** Identifica as escolhas que mudam o produto, o custo ou o risco: arquitetura, onde vivem os dados, acesso e autenticação, âmbito, integrações, direção visual. Escreve cada uma na secção "Decisões" com opções, trade-offs, a tua recomendação e o custo de mudar depois. As recomendações têm em conta as preferências conhecidas do utilizador (fase 0). No máximo ~7; o resto vai para "Assumido".
4. **Direção de design** (só se o projeto tem interface). Sem direção, os implementers produzem a interface por omissão, que é genérica. Segue a secção **Design** abaixo antes do gate 1.
5. Lança `studio:critic` em modo spec sobre `spec.md`. Corrige o que for válido.
6. **Gate 1** (exceto `--auto`): segue a secção **Gate 1 — revisão guiada** abaixo. Com `--auto`, todas as decisões ficam aceites como recomendadas.

### Gate 1 — revisão guiada

O objetivo é que o utilizador gaste o tempo nas 3 ou 4 decisões que importam, e não a ler a spec inteira.

1. **Apresenta, numa só mensagem:**
   - o resumo em 5 a 8 linhas: objetivo, âmbito, fora de âmbito, stack e, se houver interface, a direção de design;
   - uma tabela das decisões: id, a pergunta, a tua recomendação numa linha e o custo de mudar depois;
   - o caminho do `spec.md`, para quem quiser o detalhe.
2. **Pergunta com AskUserQuestion:** "Aprovar tudo como recomendado" (primeira opção), "Discutir decisões", "Alterar o âmbito". A opção livre fica para outros pedidos.
3. **Discutir decisões:** pergunta quais (AskUserQuestion `multiSelect` com as decisões; com mais de 4, as 4 de maior custo de mudar depois, e as outras pela opção livre). Depois, **uma de cada vez**:
   - explica a decisão em linguagem simples: o que muda para o utilizador, o custo, o risco e se se pode reverter;
   - apresenta a tua recomendação com o melhor argumento **contra** ela. Uma discussão em que o agente só concorda não serve ninguém;
   - responde às perguntas. Se o utilizador escolher outra opção, aceita-a sem insistir, a não ser que crie um risco sério; nesse caso diz qual, uma vez;
   - atualiza a decisão (`Estado: alterada pelo utilizador → …`) e **propaga a alteração**: critérios de aceitação, âmbito, riscos e design afetados. Mostra numa lista curta o que mudou na spec.
4. **Alterar o âmbito:** recebe o pedido, atualiza o âmbito e os critérios, e mostra o que mudou.
5. Se uma alteração mexer na arquitetura, na stack, nos dados ou na segurança, volta a correr o `studio:critic` só sobre as partes afetadas.
6. Repete a pergunta do passo 2 até o utilizador aprovar. Regista no `state.md` as decisões que o utilizador alterou e porquê: alimentam as preferências na retro.

### Design (projetos com interface)

O gosto do utilizador entra **aqui**, no gate 1, e não depois de a interface estar feita.

- **Se a skill `impeccable` estiver disponível**, usa-a: o fluxo `init` escreve o `PRODUCT.md` (quem usa, em que situação, para fazer o quê), e o fluxo de trabalho novo (`shape`/new-work) escolhe o mundo visual e escreve o `DESIGN.md`, com tipografia, cor, espaçamento, componentes e tokens. As perguntas que ela faz ao utilizador fazem parte da conversa do gate 1. Com `--auto`, ela infere a partir do pedido e marca o que inferiu.
- **Sem a skill**, preenche tu a secção "Direção de design" da spec (modo, contexto de uso, tom, referências e anti-referências, densidade, restrições) e escreve um `DESIGN.md` mínimo com os tokens.
- O resumo do gate 1 mostra a direção em 3 a 5 linhas: o modo, o tom, a tipografia e a cor de base, e uma referência. A direção visual é uma das decisões do gate 1 e pode ser discutida como as outras.

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
- **Interface:** marca as tarefas de UI com `UI: sim`. Num projeto novo com interface, a primeira tarefa de UI é o **sistema visual**: os tokens, a tipografia, o layout base e os componentes base a partir do `DESIGN.md`, no tier `opus`. Todas as outras tarefas de UI dependem dela e reutilizam os seus componentes, em vez de cada uma inventar o seu estilo.

## Fase 4 — Implementação

1. Cria a branch `studio/<slug>` a partir da branch atual.
2. Para cada grupo de tarefas independentes, lança um `studio:implementer` por tarefa **na mesma mensagem**, com `isolation: "worktree"` e `model` igual ao tier da tarefa. O prompt leva: o texto da tarefa do plano, o caminho da spec, e o comando de verificação. Nas tarefas `UI: sim`, leva também os caminhos do `DESIGN.md` e do `PRODUCT.md`. Tarefas dependentes correm depois das suas dependências.
3. Lê o relatório de cada implementer. `feito` → confirma tu a verificação na branch dele e integra-a em `studio/<slug>`. **Depois de integrar, remove o worktree e a branch dele** (`git worktree remove --force <caminho>` e `git branch -D <branch>`). Cada worktree pode ter o seu próprio `node_modules` ou venv, e deixá-los acumular enche o disco. **A limpeza nunca bloqueia o pipeline:** se a remoção falhar (no Windows, um processo que ficou a correr pode bloquear a pasta), regista-o em `state.md`, segue para a tarefa seguinte e tenta outra vez na fase 6. `bloqueado` → aplica as **condições de paragem**.
4. Marca o progresso em `plan.md` e `state.md` à medida que cada tarefa fecha.

### Condições de paragem

- Tarefa bloqueada: 1 nova tentativa com mais contexto (resultado do explorer, erro exato). Volta a falhar → escala o tier (`haiku`→`sonnet`→`opus`). Falha em `opus` → **escala para o utilizador** com o diagnóstico.
- No máximo 3 tentativas por tarefa no total.
- Duas tarefas seguidas bloqueadas pelo mesmo motivo → para: o problema está na spec ou no plano, não na implementação. Revê-os antes de continuar.

## Fase 5 — Verificação e review

1. Corre `.studio/verify` em `studio/<slug>`. Vermelho → volta à fase 4 com a falha como nova tarefa.
2. Lança `studio:reviewer` com: caminho da spec, caminho do plano, e o diff (`git diff <base>...studio/<slug>`). Grava o veredicto em `review.md`.
3. **Interface:** se o diff toca em UI, a review inclui o **gate de design** (ver o `studio:reviewer`): o detetor do Impeccable corre sobre a app a correr, em desktop e em mobile, e os findings dele entram no veredicto. Se existir o agente `impeccable-finish-reviewer`, lança-o em paralelo com o `studio:reviewer`, com o `DESIGN.md` como contrato, e junta os findings materiais dele ao `review.md`.
4. `ALTERAÇÕES NECESSÁRIAS` ou `REJEITADO` → cada bloqueante e importante vira uma tarefa de correção (fase 4) e depois nova review. **No máximo 2 rondas de review**; à terceira, escala para o utilizador.
5. Os menores ficam registados em `delivery.md`, não bloqueiam.

## Fase 6 — Entrega

1. Garante commits limpos em `studio/<slug>`, com mensagens que dizem o porquê. Confirma que não ficaram worktrees nem branches de implementers (`git worktree list`, branches `worktree-agent-*`). Remove os que já estejam integrados e corre `git worktree prune`.
2. Escreve `delivery.md`: o que foi feito, como verificar, decisões tomadas, o que ficou de fora, menores por resolver, custo/tentativas notáveis.
3. **Gate 2** (exceto `--auto`): apresenta o resumo e pergunta ao utilizador o destino: abrir PR, merge local, ou deixar a branch como está. Nunca faças push nem merge sem esta resposta.

## Fase 7 — Retro

Segue as instruções de `/studio:retro` para este slug. É obrigatória: é assim que o sistema melhora. Com `--auto` (evals), escreve só o `retro.md` e não promove lições: tarefas de teste não ensinam o sistema.

## Regras finais

- Nunca reportes "feito" com verificação vermelha ou por correr. Se algo não foi verificado, diz isso.
- Nunca uses credenciais de produção. Secrets nunca entram em ficheiros do repo.
- Mantém o utilizador a par numa linha por fase concluída; o detalhe fica nos ficheiros.
