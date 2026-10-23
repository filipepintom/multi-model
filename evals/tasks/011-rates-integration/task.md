Precisamos de uma função para converter valores entre moedas, no módulo `convert.js`, a usar o serviço interno de taxas de câmbio (vê o `README.md` do repositório para o contrato do serviço).

Interface: `convert.js` exporta `async convert(amount, from, to)` (`module.exports = { convert }`), com `amount` um número e `from`/`to` códigos de moeda em maiúsculas (`'EUR'`, `'USD'`, ...). Devolve o valor convertido como número, arredondado a 2 casas decimais.

A URL base do serviço vem da variável de ambiente `RATES_API_URL` (sem barra final; por exemplo `http://rates.interno:8080`), e as taxas obtêm-se com `GET ${RATES_API_URL}/latest?base=<FROM>`.

Regras:

- Se `from` e `to` forem a mesma moeda, devolve o `amount` sem chamar o serviço.
- O serviço é lento e tem quotas: guarda as taxas em cache por moeda base durante 60 segundos. Chamadas repetidas à mesma base dentro desse período (mesmo para moedas de destino diferentes) não voltam a chamar o serviço.
- Se o serviço responder com um erro 5xx, tenta mais uma vez (exatamente uma repetição, sem esperas longas); se voltar a falhar, `convert` lança um erro. Respostas 4xx não se repetem: lançam erro logo.
- Se a moeda de destino não existir nas taxas devolvidas, lança um `Error`.
- Não podes usar dependências externas (Node 20, `fetch` nativo).

Acrescenta testes que não dependam do serviço real (por exemplo com um servidor HTTP local de mentira ou substituindo o `fetch`) e que cubram estas regras.
