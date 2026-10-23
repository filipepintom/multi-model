# Plano — <título>

Spec: [spec.md](spec.md)

## Grupos de execução

Tarefas no mesmo grupo correm em paralelo; os grupos correm por ordem.

| Grupo | Tarefas |
|---|---|
| G1 | T1, T2 |
| G2 | T3 |

## Tarefas

### T1 — <título>

- **Tier:** haiku | sonnet | opus
- **Objetivo:** <o que muda>
- **Ficheiros prováveis:** <caminhos>
- **Depende de:** <ids ou "nada">
- **Feito quando:**
  - <critério testável, ligado a CAx da spec>
- **Verificação:** `<comando>`
- **Estado:** pendente | em curso | feito | bloqueado (tentativas: 0)
