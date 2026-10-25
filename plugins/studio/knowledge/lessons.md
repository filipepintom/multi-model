# Lições do plugin

Lições comuns a toda a equipa, distribuídas com cada versão do plugin. O agente só as **lê**; muda-as quem mantém o plugin, por PR, normalmente a partir das candidatas que o `/studio:promote` reúne das lições pessoais.
Cada build aplica a parte **Geral** e só as secções **Stack** das tecnologias do projeto.
Uma linha acionável cada. Atualizar em vez de duplicar; apagar o que deixou de ser verdade.

# Geral

## Spec e plano

- Rate-limits, quotas e outros "verificar-depois-agir" à volta de um `await` precisam de um critério de aceitação com pedidos concorrentes (`Promise.all`), não só sequenciais: os testes sequenciais passam e a corrida só aparece na review. (origem: [[financas-pessoais]], 2026-10-24)

## Routing de modelos

## Implementação

## Review e verificação

- Test runners com descoberta automática (`node --test`, pytest, jest…) também apanham os testes de outras branches em `.claude/worktrees/`: aponta o comando de verificação para as pastas de teste do projeto ou exclui `.claude/`. (origem: [[eval-001-slugify]], 2026-10-23)
- Auditores, verificadores e reviewers nunca leem nem pedem por HTTP a pasta de dados reais do utilizador (ex.: `data/`): diz-lo no prompt de todas as lentes e reproduz numa cópia mínima com dados falsos. (origem: [[audit-dashboard]], 2026-10-24)

# Stack

<!-- Uma secção por tecnologia, criada quando aparecer a primeira lição: "## Stack: node", "## Stack: python", "## Stack: react"… -->

## Stack: node

- Cada worktree de implementer precisa do seu `npm ci` (no Windows, ~5 min): instrui-o a correr em foreground com timeout longo e a nunca o repetir a meio (repetir em paralelo dá ENOTEMPTY e `node_modules` corrompido). (origem: [[financas-pessoais]], 2026-10-24)

## Stack: react

- Testes com Testing Library: usa `user.paste` para texto (não `user.type` tecla a tecla); com agentes em paralelo, os testes de formulário tecla a tecla passam os 5 s e o verify fica intermitente. (origem: [[financas-pessoais]], 2026-10-24)

## Stack: vitest

- Desde o esqueleto, define `testTimeout` e `hookTimeout` (≥ 15–30 s) no `vitest.config`: subir só o `testTimeout` deixa os `beforeEach` pesados (BD, scrypt, `app.ready()`) nos 10 s por omissão e o verify continua a falhar sob carga. (origem: [[financas-pessoais]], [[audit-dashboard]], 2026-10-24)

## Stack: vite

- No Windows, `os.tmpdir()` pode devolver um caminho 8.3 com `~` (ex.: `EXT_TI~1`) e o Vite recusa servir caminhos com `~`: em testes que arrancam o Vite usa `realpathSync.native(mkdtempSync(...))`. (origem: [[audit-dashboard]], 2026-10-24)
