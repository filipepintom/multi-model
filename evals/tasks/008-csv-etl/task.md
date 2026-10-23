Todas as semanas recebemos a exportação de clientes do CRM em `data/customers.csv` (ver o README) e alguém a limpa à mão em Excel. Preciso de um script que o faça.

Cria `etl.py` na raiz do projeto (só biblioteca standard), usado assim:

    python etl.py <input.csv> <output.json>

O CSV de entrada tem o cabeçalho `name,email,country,amount`, é UTF-8 e pode ter células com aspas e vírgulas lá dentro. O `output.json` (também UTF-8) tem esta estrutura:

    {
      "customers": [ {"name": "...", "email": "...", "country": "...", "amount": 12.5}, ... ],
      "by_country": { "PT": {"count": 2, "total_amount": 130.7}, ... },
      "rejected": 3
    }

Regras de limpeza, por esta ordem:

1. Todos os campos são aparados de espaços nas pontas. O email passa também a minúsculas.
2. Rejeita-se a linha se o email for inválido (exatamente um `@`, parte local não vazia e um domínio com pelo menos um ponto) ou se `amount` não for um número (vazio também conta como inválido). `amount` sai no JSON como número.
3. Dos clientes que sobram, se o mesmo email aparecer mais de uma vez fica só a primeira ocorrência (pela ordem do ficheiro) e as seguintes são descartadas.
4. País em falta (vazio ou só espaços) passa a `"UNKNOWN"`. Fora isso, o país mantém-se como vem, já aparado.

Detalhes do resultado:

- `customers` mantém a ordem original do ficheiro e cada cliente tem os campos `name`, `email`, `country` e `amount`.
- `rejected` conta apenas as linhas rejeitadas pela regra 2; as duplicadas descartadas pela regra 3 não contam.
- `by_country` agrupa os clientes que ficaram em `customers`: `count` é o número de clientes e `total_amount` a soma dos `amount`, arredondada a 2 casas decimais.
- Um CSV só com o cabeçalho dá `{"customers": [], "by_country": {}, "rejected": 0}`.

Se o ficheiro de entrada não existir, o script termina com um código de saída diferente de 0. Se o de saída já existir, é substituído.
