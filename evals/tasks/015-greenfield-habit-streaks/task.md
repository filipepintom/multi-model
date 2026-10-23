Queria uma app simples para acompanhar hábitos: ir ao ginásio, ler meia hora, beber mais água, esse tipo de coisas. A ideia é marcar os dias em que cumpri e ver quantos dias seguidos já consegui, para me motivar a não quebrar a sequência. É só para uso pessoal, não quero contas nem servidor.

Ainda não decidi bem o formato. Pode ser uma app de linha de comandos, uma página web ou outra coisa, e não sei se faz sentido seguir vários hábitos ao mesmo tempo ou só um por app. Se a ideia já existir feita por aí e for boa, digam-me. Senão, escolham o que for mais razoável para uma primeira versão e digam-me o que escolheram.

## Contrato mínimo

Seja qual for a forma da app, a lógica das sequências tem de viver num módulo Python `habits.py` na raiz do projeto (só biblioteca standard, sem efeitos ao importar), com duas funções:

- `current_streak(check_ins: list[str], today: str) -> int`
- `longest_streak(check_ins: list[str]) -> int`

Regras:

- As datas são strings ISO `YYYY-MM-DD`. `check_ins` são os dias em que o hábito foi cumprido, pode vir desordenado e com datas repetidas (o mesmo dia contado duas vezes conta como um).
- Uma sequência é um conjunto de dias de calendário consecutivos, com viragens de mês, de ano e anos bissextos tratados corretamente.
- `longest_streak` devolve o comprimento da maior sequência de sempre; 0 se não houver registos.
- `current_streak` conta a sequência que termina em `today`. Se hoje ainda não tem registo, a sequência não se perde por isso: uma sequência que termina ontem continua a contar. Se o último registo é anterior a ontem, a sequência atual é 0.
