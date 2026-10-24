# Lente: correção

Pergunta central: **onde é que este código produz um resultado errado, perde dados ou fica num estado inconsistente, com inputs ou condições que vão acontecer em produção?**

## Onde procurar primeiro

1. Os caminhos críticos do `map.md`: dinheiro, dados do utilizador, escrita persistente, autenticação e estado partilhado.
2. Os hotspots do `baseline.md`: os ficheiros grandes e muito alterados concentram os bugs.
3. Os testes que falham no baseline: cada um já é um finding.

## Classes de problemas

**Lógica e limites**
- off-by-one em intervalos, paginação e índices; inclusivo vs exclusivo nas fronteiras (o último dia do mês, o último item, o fim de um intervalo);
- casos vazios, nulos ou ausentes: lista vazia, campo opcional, divisão por zero, primeiro uso;
- condições invertidas e precedência de operadores; comparações com o tipo errado (string vs número, `==` solto).

**Erros e falhas parciais**
- erros engolidos: um `catch`/`except` vazio, ou que só faz log, seguido de código que assume sucesso;
- falhas a meio de uma operação com vários passos que deixam o estado inconsistente (debitou mas não registou; marcou como pago sem cobrar);
- escrita não atómica de ficheiros (abrir o ficheiro real em modo "w"; uma falha a meio trunca-o);
- recursos não libertados (ficheiros, ligações, timers) em caminhos de erro.

**Concorrência e tempo**
- ler-modificar-escrever com um `await`/IO pelo meio, sem lock nem operação atómica: duas execuções em simultâneo perdem uma atualização ou gastam duas vezes;
- TOCTOU: verificar e depois usar, com uma janela entre os dois;
- caches que ficam desatualizadas; estado global mutável partilhado entre pedidos;
- datas: fusos horários, mudança de hora, datas sem fuso misturadas com datas com fuso, fim do mês, anos bissextos.

**Números e dinheiro**
- dinheiro em `float` (somas, impostos, descontos) sem aritmética de cêntimos ou decimal;
- arredondar cada item vs arredondar o total; o arredondamento bancário do `round()` do Python vs o arredondamento comercial;
- overflow, truncagem e conversões implícitas.

**Contratos entre módulos**
- a mesma regra de negócio implementada em dois sítios, com comportamentos diferentes (por exemplo o preço mostrado vs o preço cobrado). Reporta os dois sítios num só finding, com `related`;
- uma função que devolve formas diferentes conforme o caminho (às vezes `null`, às vezes lança exceção);
- valores por omissão mutáveis (`def f(x=[])`) e objetos partilhados por referência.

## Como provar

Para cada candidato, escreve o input concreto e o resultado errado, por exemplo: "dois pedidos `POST /wallet/debit` de 80 € em simultâneo com saldo de 100 € → ambos passam a verificação → saldo final 20 € em vez de recusar o segundo". Se não consegues escrever esta frase, não reportes.

## Não reportar

- estilo, nomes, formatação, ou o que um linter já apanha;
- "falta validação" sem um input concreto que cause dano;
- tratamento de erros correto que só é diferente do que tu farias (fazer log e relançar, devolver 5xx com contexto);
- hipóteses que exigem que outro componente já esteja avariado.
