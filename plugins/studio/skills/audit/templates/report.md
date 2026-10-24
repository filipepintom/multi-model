# Auditoria — <área>

<data> · âmbito: <o que foi auditado> · lentes: <lentes>

## Resumo

<3–5 frases: o estado geral, o maior risco e o que fazer primeiro.>

| Severidade | Confirmados | Plausíveis |
|---|---|---|
| Critical | | |
| High | | |
| Medium | | |
| Low | | |

Refutados na verificação: <n> de <total>. Ficaram fora do backlog; o motivo de cada um está em `findings.json`.

## Backlog

| # | Id | Severidade | Título | Localização | Esforço | Modo | Estado |
|---|---|---|---|---|---|---|---|
| 1 | F1 | critical | <título> | `src/x.js:31` | S | completo | por fazer |

### F1 — <título>

- **Onde:** `src/x.js:31–36` (também `src/y.js:12`)
- **Cenário:** <input/estado → passos → resultado errado>
- **Impacto:** <quem é afetado e como>
- **Evidência:**
  ```
  <linhas de código>
  ```
- **Verificação:** <confirmado/plausível: o que foi corrido ou traçado>
- **Correção:** <passo incremental>
- **Pedido para o build:** `/studio:build --skip-idea --<fast|full> "<request>"`

## Também observado

<Uma linha por problema de baixa prioridade fora do backlog. Opcional.>

## Baseline

<Resumo do baseline.md: testes, cobertura, lint, dependências, hotspots.>

## Recomendações fora do backlog

<Por exemplo uma auditoria de segurança profunda com /claude-security, ou testes de caracterização num módulo crítico sem testes.>
