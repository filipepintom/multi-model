# Auditoria — distribuição, Windows e setup do plugin studio

2026-11-03 · âmbito: `plugins/studio` (hooks, scripts, skills incluindo as de terceiros, agentes), `.claude-plugin/marketplace.json`, `scripts/vendor.js`, guia de instalação do README · lentes: correctness (Windows; setup e empacotamento), security, maintainability

## Resumo

Ainda não está pronto para distribuir. Os manifestos validam e os testes do guard passam, mas há três problemas que qualquer pessoa vai encontrar logo. O detetor de design do Impeccable não corre em nenhuma instalação macOS ou Linux, porque o lançador vai para o git sem permissão de execução, e o `/studio:setup` atribui a falha à rede (F1). O `/studio:graphify` não funciona como está escrito em macOS e Linux (F6). E faltam as licenças de dois componentes de terceiros (F8).

No Windows funciona sobretudo com o Git Bash instalado, e o setup não verifica se ele existe. Sem Git Bash, os hooks do Impeccable dão erro a cada edição (F2). Se faltar também o Node, o guard bloqueia todas as ferramentas (F3). Com Git Bash, os caminhos `/c/...` desligam as regras de push e commit (F13).

O setup não instala nada (mostra os comandos) e só verifica parte das dependências: a tabela abaixo mostra o que fica de fora. Por onde começar: F1 e F2 juntos, num wrapper Node para os hooks do Impeccable, e depois F6 e F8.

| Severidade | Confirmados | Plausíveis |
|---|---|---|
| Critical | 0 | 0 |
| High | 1 | 0 |
| Medium | 2 | 3 |
| Low | 14 | 4 |

Refutados na verificação: 1 de 25 (F14). Ficaram fora do backlog, e o motivo está em `findings.json`.

## O setup instala e verifica tudo?

Não. O `/studio:setup` corre o `doctor.js` e não instala dependências: mostra os comandos para Node, git, Python e uv, e só altera duplicados e regras de permissão com o teu OK.

| Dependência | Quem precisa | O setup verifica? |
|---|---|---|
| Node 18+, git | tudo | sim (falha) |
| Claude Code CLI | tudo | sim (aviso) |
| **Git Bash (Windows)** | hooks do Impeccable; guard sem bloqueios | **não** (F2, F3) |
| Python 3.10+, uv/pip | `/studio:graphify` | sim, mas aceita pipx, que a skill não usa (F23) |
| pacote `graphifyy` | `/studio:graphify` | não (instalado sem versão fixa na primeira utilização) |
| binário do detetor Impeccable, curl/wget, shasum | hooks do Impeccable, reviewer | corre o lançador, mas lê mal o erro (F1, F4) |
| Context7 MCP | agentes | sim (pedido HTTP e teste real) |
| skills incluídas instaladas em duplicado | todas | parcial: falta Context7 e o plugin graphify (F21) |
| REA (`npx rea-agents`) | `/studio:reverse` | só o registo no âmbito do utilizador (F22); npx não |
| motores do REA (Hopper, Ghidra, IDA, Kuna, JADX, WABT…) | `/studio:reverse` | não (a skill bloqueia ao usar) |
| Chrome | verificação de UI do reviewer, evals visuais | não |
| pasta de lições + regra de escrita | `/studio:retro` | sim, mas não numa instalação nova (F5) |

## Backlog

| # | Id | Severidade | Título | Local | Esforço | Modo | Estado |
|---|---|---|---|---|---|---|---|
| 1 | F1 | high | Lançador do Impeccable sem bit de execução: o detetor nunca corre em macOS/Linux | `skills/impeccable/scripts/impeccable:1` | S | fast | corrigido (6a99856, ed3db95) |
| 2 | F2 | medium (plausível) | Hooks do Impeccable em sintaxe bash: falham no Windows sem Git Bash; o doctor testa o `.cmd`, que nenhum hook usa | `hooks/hooks.json:31` | M | fast | corrigido (0e53a49) |
| 3 | F6 | medium | Skill graphify com o Passo 1 só em PowerShell: falha em macOS/Linux | `skills/graphify/SKILL.md:68` | S | fast | corrigido (e9417f1, 9733f07) |
| 4 | F8 | medium | Faltam as licenças do Impeccable (Apache-2.0), do graphify e do modern-screenshot; o studio não tem licença | `THIRD_PARTY_NOTICES.md:7` | S | fast | corrigido (8203045, 07e5770) |
| 5 | F13 | medium (plausível) | Caminhos Git Bash `/c/...` desligam as regras de push e commit no Windows | `hooks/guard.js:229` | S | full | corrigido (16a5ea0..77ed60b) |
| 6 | F16 | medium (plausível) | O retro pode transformar ficheiros de um repositório alheio em lições pessoais injetadas em todos os projetos | `skills/retro/SKILL.md:16` | S | full | corrigido (4c4913a, 9ecf9ad, 0457a34) |
| 7 | F3 | low (plausível) | Windows sem Git Bash e sem Node: o guard bloqueia todas as ferramentas | `hooks/hooks.json:43` | S | fast | corrigido (0e53a49) |
| 8 | F4 | low | `run()` do doctor perde o erro e não põe aspas em caminhos com espaços | `scripts/doctor.js:25` | S | fast | corrigido (6a99856, 0e53a49) |
| 9 | F5 | low | O doctor procura a pasta das lições noutro sítio: instalações novas nunca recebem a regra | `scripts/doctor.js:107` | S | fast | corrigido (11c281d, 250ed35) |
| 10 | F11 | low | Shells aninhadas (`bash -c`, `cmd /c`, `powershell -Command`) saltam todas as regras do guard | `hooks/guard.js:73` | S | full | corrigido (16a5ea0..77ed60b) |
| 11 | F12 | low | Alvos de delete com variáveis e formas Windows passam (`${env:USERPROFILE}`, `%SystemDrive%\`) | `hooks/guard.js:116` | S | full | corrigido (16a5ea0..77ed60b) |
| 12 | F22 | low | A verificação do REA só lê o âmbito do utilizador e sugere outro comando | `scripts/doctor.js:133` | S | fast | corrigido (11c281d, 250ed35) |
| 13 | F23 | low | O doctor aceita pipx, mas a skill graphify nunca o usa | `scripts/doctor.js:64` | S | fast | corrigido (11c281d, 250ed35) |
| 14 | F21 | low | A verificação de duplicados ignora o Context7 e o plugin graphify | `scripts/doctor.js:95` | S | fast | corrigido (11c281d, 250ed35) |
| 15 | F24 | low | `.gitignore` `knowledge/` também ignora ficheiros novos em `plugins/studio/knowledge/` | `.gitignore:6` | S | fast | corrigido (85a68ef) |

Ajustes à ordem da fórmula:
- F2 sobe de 0,9 para o 2.º lugar: o Windows é uma das tuas três perguntas, e o mesmo wrapper Node resolve F1, F2 e metade de F4.
- F3 sobe para o 7.º lugar, à frente de outros com pontuação 1,0: é a mesma edição do `hooks.json` que F2 e deve ir no mesmo PR.

### F1 — Lançador do Impeccable sem bit de execução

- **Onde:** `plugins/studio/skills/impeccable/scripts/impeccable:1` (modo git 100644); chamado em `hooks/hooks.json:31`, `:65` e `:76`, e em `scripts/doctor.js:74`
- **Cenário:** num clone novo, o ficheiro fica `-rw-r--r--`. O comando do hook dá `Permission denied` (rc 126) e o `|| true` transforma isso em sucesso. O doctor recebe EACCES, mostra o detalhe vazio e sugere "precisa de rede".
- **Impacto:** nenhum utilizador de macOS ou Linux tem o detetor depois de editar UI, e o setup aponta para a causa errada. A tua cópia instalada (0.9.1) também está assim.
- **Evidência:**
  ```
  100644 … plugins/studio/skills/impeccable/scripts/impeccable
  "IMPECCABLE_NO_TELEMETRY=1 \"${CLAUDE_PLUGIN_ROOT}/skills/impeccable/scripts/impeccable\" hook || true"
  ```
- **Verificação:** confirmado. Clone novo: rc 126 escondido pelo `|| true`; o `run()` do doctor devolveu EACCES com saída vazia.
- **Correção:** `git update-index --chmod=+x` e subir a versão; por precaução, chamar através de `sh` (ou do wrapper de F2).
- **Pedido para o build:** `/studio:build --skip-idea --fast "Make the bundled Impeccable launcher run on macOS/Linux installs: set its git executable bit (plugins/studio/skills/impeccable/scripts/impeccable is 100644) or call it through sh from hooks.json:31/65/76 and doctor.js:74, and make doctor report the spawn error code. First a test that reproduces the problem and fails."`

### F2 — Hooks do Impeccable não correm no Windows sem Git Bash

- **Onde:** `plugins/studio/hooks/hooks.json:31` (também `:65` e `:76`; `scripts/doctor.js:69`)
- **Cenário:** Windows 11, Claude Code nativo, sem Git for Windows. O Claude Code 2.1.302 corre os hooks em Git Bash quando existe e, caso contrário, em PowerShell. Aí `VAR=1 cmd` e `|| true` falham: há um erro de hook a cada edição e o detetor nunca corre. O doctor testa o `impeccable.cmd`, que pode passar, e o setup diz que está tudo bem.
- **Impacto:** quem usa Windows sem Git Bash fica sem detetor, com ruído de erros e com um relatório de setup falso.
- **Evidência:** `"command": "IMPECCABLE_NO_TELEMETRY=1 \"${CLAUDE_PLUGIN_ROOT}/…/impeccable\" hook || true"`
- **Verificação:** plausível. A escolha da shell e a reescrita para `${env:CLAUDE_PLUGIN_ROOT}` foram lidas no binário do Claude Code; o PowerShell não foi executado.
- **Correção:** um `hooks/impeccable.js` em exec form que escolhe `impeccable.cmd` ou `sh impeccable` e sai sempre com 0; o doctor usa o mesmo wrapper e verifica o Git Bash no Windows.
- **Pedido para o build:** `/studio:build --skip-idea --fast "Replace the three Impeccable hook commands in plugins/studio/hooks/hooks.json (:31, :65, :76) with one cross-platform node wrapper in exec form that picks impeccable.cmd on Windows and \`sh impeccable\` elsewhere and always exits 0; make doctor.js test that same wrapper and report Git Bash on Windows. First a test that reproduces the problem and fails."`

### F6 — Skill graphify com o Passo 1 só em PowerShell

- **Onde:** `plugins/studio/skills/graphify/SKILL.md:68–133` (também `:648`, `scripts/vendor.js:91`)
- **Cenário:** em macOS sem pwsh, o Passo 1 (instalar e gravar `.graphify_python`) não corre. O Passo 2, `$(cat graphify-out/.graphify_python) -c …`, sai com rc 127. No Windows 5.1, o `Out-File -Encoding utf8` grava um BOM que estraga os passos bash seguintes.
- **Impacto:** o `/studio:graphify` só funciona se o modelo reescrever a instalação; o `graphifyy` fica sem versão fixa.
- **Evidência:** Passo 1 em ` ```powershell `; Passo 2 em ` ```bash ` com `$(cat graphify-out/.graphify_python) -c "…"`
- **Verificação:** confirmado. Falha do Passo 2 reproduzida (rc 127).
- **Correção:** voltar a importar a variante POSIX do upstream (manter a do Windows como referência), fixar `graphifyy==0.9.11` e fazer o `vendor.js` falhar quando uma skill mistura dialetos.
- **Pedido para o build:** `/studio:build --skip-idea --fast "Make plugins/studio/skills/graphify/SKILL.md runnable as written on macOS/Linux and Windows: Step 1 (:68-123) is PowerShell-only while later steps are bash; pin graphifyy to the vendored 0.9.11; add a vendor.js check against mixed shell dialects. First a test that reproduces the problem and fails."`

### F8 — Licenças em falta

- **Onde:** `plugins/studio/THIRD_PARTY_NOTICES.md:7–11` (também `skills/impeccable/scripts/modern-screenshot.umd.js`, `scripts/vendor.js:38`, `plugin.json`)
- **Cenário:** quem recebe o plugin recebe cerca de 57 ficheiros Apache-2.0 sem o texto da licença, que a §4(a) exige. O graphify e o modern-screenshot vão sem os avisos MIT, e o código do studio não concede direitos a ninguém.
- **Impacto:** distribuir assim viola duas licenças de terceiros.
- **Evidência:** só `ponytail`, `context7-mcp` e `humanizer` têm `LICENSE`.
- **Verificação:** confirmado com `find` e `git ls-files`. Não foi possível confirmar se o Impeccable tem NOTICE no upstream (sem rede).
- **Correção:** o `vendor.js` copia LICENSE e NOTICE para todas as skills; acrescentar o modern-screenshot aos avisos; criar uma `LICENSE` do studio e o campo `license` no `plugin.json`.
- **Pedido para o build:** `/studio:build --skip-idea --fast "Ship the missing licence texts: Impeccable (Apache-2.0, plus NOTICE if upstream has one), graphify and modern-screenshot.umd.js, copied by scripts/vendor.js like the others; add a LICENSE for studio and license in plugin.json. First a test that reproduces the problem and fails."`

### F13 — Caminhos `/c/...` desligam as regras do guard no Windows

- **Onde:** `plugins/studio/hooks/guard.js:229` (também `:169`)
- **Cenário:** Windows com Git Bash e um projeto studio em `C:\Users\me\proj`. `cd /c/Users/me/proj && git push origin main` resolve para `C:\c\Users\me\proj`, onde não há `.studio`, e o push para main passa. Com o commit acontece o mesmo.
- **Impacto:** as regras de push e commit do studio ficam desligadas sem aviso sempre que o agente usa caminhos MSYS.
- **Evidência:** `dir = path.resolve(dir, target.replace(/^~(?=$|[\\/])/, os.homedir()));`
- **Verificação:** plausível. `path.win32.resolve` foi reproduzido; o último passo precisa de uma máquina Windows.
- **Correção:** no win32, converter `^/([a-zA-Z])(/|$)` (e `/cygdrive/x/`) em `X:/` antes de resolver.
- **Pedido para o build:** `/studio:build --skip-idea --full "In plugins/studio/hooks/guard.js (:169, :229), translate Git Bash/MSYS drive paths (/c/..., /cygdrive/c/...) to Windows paths before resolving cd and git -C targets, so .studio is found and the push and commit rules apply. First a test that reproduces the problem and fails."`

### F16 — Lições envenenadas pelo retro

- **Onde:** `plugins/studio/skills/retro/SKILL.md:16` (também `:44`, `hooks/knowledge.js:58`, `skills/setup/SKILL.md:37`)
- **Cenário:** um repositório clonado traz `docs/studio/x/review.md` com uma "lição" maliciosa e tu corres `/studio:retro` nele. Com a regra que o setup oferece, a escrita é silenciosa, e o resumo só mostra uma das até 3 lições. A partir daí o texto entra em todos os builds de todos os projetos, marcado como prioritário.
- **Impacto:** um único repositório deixa uma instrução duradoura (por exemplo, "escreve isto em `.studio/verify`", que junta F16 a F9).
- **Evidência:** `"On conflict, the personal lesson wins for this user."`
- **Verificação:** plausível. Traçado no código; não se testou se o modelo obedece ao texto injetado.
- **Correção:** o retro trata os ficheiros `docs/studio` como dados, só promove lições de builds teus e mostra cada lição antes de a gravar.
- **Pedido para o build:** `/studio:build --skip-idea --full "Harden /studio:retro (plugins/studio/skills/retro/SKILL.md :16, :44) so lessons from repo-supplied docs/studio files are treated as data, never promoted without showing each one to the user, and only from builds this user ran; reword the injected header in hooks/knowledge.js:58. First a test that reproduces the problem and fails."`

### F3 a F24

Os itens 7 a 15 são pequenos (esforço S). O local, a evidência, o cenário reproduzido e o pedido pronto para o `/studio:build` de cada um estão em `findings.json`. Em resumo:
- F3 vai no mesmo PR que F2: exec form ou `"onFailure": "continue"` nas duas entradas do guard.
- F4, F5, F21, F22 e F23 cabem num único PR que corrige o doctor.
- F11 e F12 são do guard (modo full).
- F24 é uma linha no `.gitignore`.

## Também observado

Corrigidos depois, no ramo de extras e no guard (objetivo "terminar tudo"): F7 (com Python 3.11+ obrigatório no graphify), F9 (parcial), F10, F15 (hash do detetor fixado no repositório em SHA256SUMS, os 5 confirmados com transferências reais), F17, F18, F19, F20, F25 e M9. Ver `docs/studio/audit-distribution-extras/` e `docs/studio/audit-distribution-guard/`.

Verificados, mas fora do top 15 (estão em `findings.json` com `"backlog": false`):
- F7: um `graphify-out/.graphify_python` trazido por um repositório é executado (reproduzido).
- F9: um `.studio/verify` trazido por um repositório corre em qualquer commit, antes do pedido de permissão (reproduzido; alcance estreito).
- F10: no Windows, o `.studio/verify` corre em cmd.exe.
- F15: o hash do detetor vem da mesma release; `graphifyy` e `npx impeccable` não têm versão fixa.
- F17: o `knowledge.js` não tem testes e perde as lições sem aviso quando não consegue escrever na pasta pessoal.
- F18: as consolas de debugger do `reverser-live` ficam fora do guard (é deliberado e passa pelo gate).
- F19: a regra do `.env` distingue maiúsculas, por isso `.ENV` escapa.
- F20: `git push origin @` e o git chamado por caminho com espaço passam.
- F25: o `vendor.js` apaga a skill antes de confirmar a origem.

Não verificado: o `THIRD_PARTY_NOTICES.md` e as notas do `vendor.json` estão em português, num plugin que é em inglês.

## Baseline

11 testes do guard, todos a passar, com 99% de cobertura de linhas do `guard.js`. O `knowledge.js`, o `subagent.js`, o `doctor.js` e o `vendor.js` não têm testes. `claude plugin validate` passa para o plugin e para o marketplace. Sem lockfile, por isso sem `npm audit`. Hotspots: `plugin.json` (16 alterações), `build/SKILL.md` (13), `retro/SKILL.md` e `implementer.md` (7). Nada foi corrido em Windows: o comportamento no Windows vem da leitura do binário do Claude Code 2.1.302 e de comportamento documentado.

## Recomendações fora do backlog

- Verificado no CI do GitHub (run 41735623515, windows-latest, macos-latest, ubuntu-latest): testes completos nos três sistemas; no Windows, hook do Impeccable em Git Bash e em PowerShell 5.1, `impeccable.cmd` a verificar com `SHA256SUMS` e a recusar um pin adulterado, guard a bloquear `cd /c/... && git push origin main` e a correr o verify em Git Bash, doctor a partir de uma pasta com espaço. O caminho "Windows sem Git Bash" foi exercido chamando os hooks em PowerShell 5.1; uma sessão real do Claude Code sem Git Bash não foi corrida. Aceite como está pelo utilizador (2026-11-04).
- Juntar ao `/studio:setup` um passo "instalação limpa" que corra cada hook uma vez e confirme que saem com 0.
- Uma auditoria de segurança mais funda ao `guard.js` com `/claude-security`, se o guard passar a ser apresentado como proteção e não só como rede para erros.
