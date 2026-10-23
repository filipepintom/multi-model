Quero uma coisa simples para dividir despesas de jantares e viagens entre amigos. Hoje fazemos isto numa folha de cálculo e acaba sempre mal: alguém paga o restaurante, outro paga a gasolina, outro o alojamento, e no fim ninguém sabe quem deve quanto a quem. Gostava de qualquer coisa que se abrisse, se metessem as despesas à medida que aparecem, e no fim dissesse quem tem de pagar a quem para ficar tudo certo, com o menor número possível de transferências (ninguém quer fazer cinco MB Way quando bastavam dois).

Não sei bem se isto deve ser uma app web, uma ferramenta de linha de comandos ou outra coisa; o que interessa é que seja fácil e que dê para confiar nas contas. Tem de aguentar o caso do jantar de 10 € dividido por 3 sem ninguém ficar a dever 1 cêntimo que não existe. Não precisamos de contas de utilizador, de cobrar nada, nem de várias moedas: euros, e pronto.

## Contrato mínimo

Seja qual for a forma final, o coração das contas é um módulo `split.js` na raiz do projeto (CommonJS, sem dependências) que exporta `settle(expenses)`:

- `expenses` é uma lista de despesas `{ paidBy: string, amount: number, participants: string[] }`: quem pagou, o valor em euros, e as pessoas entre as quais a despesa é dividida em partes iguais. Quem pagou pode ou não estar entre os participantes.
- Devolve a lista de transferências que acerta as contas, cada uma `{ from, to, amount }` (`from` paga `amount` a `to`), com `amount` em euros arredondado ao cêntimo.
- Depois de feitas as transferências, o saldo de toda a gente fica a zero (com a tolerância de arredondamento de 1 cêntimo).
- O número de transferências é no máximo (número de pessoas com saldo diferente de zero) − 1.
- Nunca há transferências com valor menor ou igual a zero, nem de uma pessoa para ela própria.
- Sem despesas, devolve `[]`. A função não altera o que recebe.
