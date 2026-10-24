# Lente: manutenibilidade

Pergunta central: **que estrutura deste código vai causar o próximo bug, ou tornar a próxima alteração lenta e arriscada?**

Isto **não é uma revisão de estilo.** Cada finding tem de dizer o custo concreto: que bug já causa ou vai provavelmente causar, ou que alteração comum fica cara e porquê. Se não consegues dizer o custo, não reportes.

## Onde procurar primeiro

Nos hotspots do `baseline.md`, onde há muito código e muitas alterações. Código feio que ninguém altera não é prioridade.

## Classes de problemas

**Duplicação que diverge**
- a mesma regra de negócio (preço, desconto, arredondamento, validação, permissões) implementada em mais do que um sítio. É o problema mais valioso desta lente quando as cópias **já divergiram**: aí é um bug, e o cenário mostra o resultado diferente. Reporta um só finding, com todos os sítios em `related`;
- constantes de negócio repetidas em vez de definidas num só lugar.

**Acoplamento e estado escondido**
- estado global mutável lido e escrito por vários módulos;
- módulos que conhecem detalhes internos de outros (alcançam estruturas internas em vez de usar uma interface);
- efeitos secundários escondidos em funções com nome de consulta (`getX` que também escreve).

**Responsabilidades misturadas**
- funções ou módulos que fazem I/O, regras de negócio e formatação ao mesmo tempo, num hotspot, ao ponto de impedirem testes ou alterações seguras. Indica a divisão mínima ("extrair o cálculo X para uma função pura testável");
- tratamento de erros inconsistente entre módulos parecidos, ao ponto de causar comportamento diferente para o mesmo tipo de erro.

**Rede de segurança em falta**
- caminhos críticos (dinheiro, permissões, persistência) sem testes, segundo o baseline ou a leitura de `test/`. Indica o teste de caracterização a escrever primeiro;
- testes que não testam nada (sem asserts, ou asserts tautológicos) em caminhos críticos.

**Código morto e enganador**
- código que nunca é chamado, ou flags que já não mudam nada, quando confundem quem lê;
- nomes ou comentários que descrevem o contrário do que o código faz.

## Como formular a correção

A correção é **incremental**: um passo que se pode fazer num PR pequeno, em segurança, com testes. Procura o "golpe de judo": a reestruturação que mantém o comportamento e torna o código muito mais pequeno ou direto. Nunca recomendes "reescrever o módulo".

## Não reportar

- formatação, nomes ou estilo de que o linter trata;
- preferências de padrões (classes vs funções, um framework vs outro);
- ficheiros grandes mas estáveis e testados;
- duplicação trivial (2 ou 3 linhas de setup) sem regra de negócio.
