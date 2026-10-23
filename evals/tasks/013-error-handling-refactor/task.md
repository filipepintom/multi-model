A nossa API de loja (`server.js` e `routes/`) trata erros de maneira diferente em cada rota, e já nos deu dores de cabeça em produção: um erro que responde 200 com `{ "error": ... }`, outro que devolve o `stack` do Node ao cliente, um pedido com JSON mal formado que deita o processo abaixo, e respostas de erro em texto simples numas rotas e em JSON noutras. Quem integra com isto não consegue tratar os erros de forma uniforme.

Quero o tratamento de erros centralizado e consistente em toda a API (clientes, produtos e encomendas), em vez de cada rota fazer o seu.

## Formato único

Todas as respostas de erro passam a ser JSON (`Content-Type: application/json`) neste formato:

```json
{ "error": { "code": "NOT_FOUND", "message": "Customer 7 not found" } }
```

`code` é uma destas constantes e `message` é um texto legível (em inglês, como o resto da API):

| situação | status | `code` |
| --- | --- | --- |
| dados inválidos (campos em falta, tipos errados, valores fora do permitido) | 400 | `VALIDATION_ERROR` |
| corpo do pedido que não é JSON válido | 400 | `INVALID_JSON` |
| recurso que não existe: id inexistente, cliente ou produto referido numa encomenda que não existe, rota desconhecida | 404 | `NOT_FOUND` |
| duplicado: e-mail de cliente já registado, SKU de produto já existente | 409 | `CONFLICT` |
| qualquer outro erro inesperado | 500 | `INTERNAL_ERROR` |

Regras:

- Os pedidos que correm bem ficam exatamente como estão (mesmos status e mesmos corpos).
- Nunca se pode expor ao cliente `stack` nem detalhes internos. Em `INTERNAL_ERROR` a `message` é genérica (não repete a mensagem do erro interno).
- Os erros inesperados (500) têm de ficar registados no servidor, em `stdout`/`stderr` (por exemplo com `console.error`), com informação suficiente para diagnosticar.
- O servidor não pode cair com nenhum pedido, por mais mal formado que seja.
- O servidor continua a arrancar com `node server.js` (porta em `PORT`), e `server.js` continua a exportar `createServer`.

Nota: o produto com id 99 (importado do sistema antigo, sem preço) rebenta quando se pede `GET /products/99` ou se faz uma encomenda dele (`POST /orders` com `productId: 99`). É um dado sujo que vamos tratar à parte. Não o corrijas: serve-nos de exemplo de erro inesperado e esses pedidos têm de continuar a falhar, agora com `500 INTERNAL_ERROR` no formato acima.

Os testes existentes têm de continuar a passar com `npm test`. Acrescenta testes para o novo comportamento de erros.
