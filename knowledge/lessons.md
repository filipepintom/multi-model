# Lições do estúdio

Lições acumuladas pelas retros. Cada `/studio:build` lê a parte **Geral** e só as secções **Stack** das tecnologias do projeto.
Uma linha acionável cada. Atualizar em vez de duplicar; apagar o que deixou de ser verdade.

# Geral

## Spec e plano

- Rate-limits, quotas e outros "verificar-depois-agir" à volta de um `await` precisam de um critério de aceitação com pedidos concorrentes (`Promise.all`), não só sequenciais: os testes sequenciais passam e a corrida só aparece na review. (origem: [[financas-pessoais]], 2026-10-24)

## Routing de modelos

## Implementação

## Review e verificação

- Test runners com descoberta automática (`node --test`, pytest, jest…) também apanham os testes de outras branches em `.claude/worktrees/`: aponta o comando de verificação para as pastas de teste do projeto ou exclui `.claude/`. (origem: [[eval-001-slugify]], 2026-10-23)

# Stack

<!-- Uma secção por tecnologia, criada quando aparecer a primeira lição: "## Stack: node", "## Stack: python", "## Stack: react"… -->

## Stack: node

- Cada worktree de implementer precisa do seu `npm ci` (no Windows, ~5 min): instrui-o a correr em foreground com timeout longo e a nunca o repetir a meio (repetir em paralelo dá ENOTEMPTY e `node_modules` corrompido). (origem: [[financas-pessoais]], 2026-10-24)

## Stack: react

- Testes com Testing Library: usa `user.paste` para texto (não `user.type` tecla a tecla) e `testTimeout` ≥ 15 s no Vitest desde o esqueleto; com agentes em paralelo, os testes de formulário passam os 5 s e o verify fica intermitente. (origem: [[financas-pessoais]], 2026-10-24)
