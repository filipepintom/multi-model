O `GET /items` do nosso catálogo (`server.js`) devolve os ~45 artigos todos de uma vez e qualquer pessoa pode chamá-lo. Precisamos de o proteger e de o paginar.

**Autenticação**
- O pedido tem de trazer o cabeçalho `Authorization: Bearer <token>`, em que o token é o valor da variável de ambiente `API_TOKEN` (lida quando o servidor arranca).
- Sem cabeçalho, com outro esquema ou com token errado: 401 com corpo JSON `{ "error": "..." }`.

**Paginação**
- Parâmetros de query `page` (começa em 1, por omissão 1) e `limit` (por omissão 10, máximo 50).
- A resposta deixa de ser um array e passa a ser `{ "items": [...], "page": n, "limit": n, "total": n }`, onde `total` é o número total de artigos (todos, não só os da página), e `page` e `limit` são os valores efetivamente usados (números).
- Os artigos mantêm a ordem atual.
- Uma página para lá do fim não é erro: 200 com `items` vazio.
- `page` ou `limit` inválidos (não inteiros, menores que 1, ou `limit` acima de 50): 400 com corpo JSON `{ "error": "..." }`.

O serviço continua a arrancar com `node server.js` e a ler a porta de `PORT`. Sem dependências externas. Atualiza o teste existente e acrescenta testes para o comportamento novo.
