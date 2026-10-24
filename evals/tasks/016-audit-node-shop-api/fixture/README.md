# shop-api

API HTTP da loja online (piloto). Node 20, sem dependências externas: `http`, `crypto` e o test runner do próprio Node.

## Arrancar

```bash
npm start          # porta 3000 (ou PORT)
npm test
```

Os dados vivem em memória (`src/db.js`) enquanto não há base de dados. O catálogo e os cupões são carregados no arranque.

## Estrutura

```
src/
  server.js           arranque e registo das rotas
  router.js           router mínimo com parâmetros (:id) e middleware
  http.js             respostas JSON, erros HTTP e logging
  auth.js             passwords (scrypt), sessões e middleware requireAuth
  db.js               store em memória
  static.js           /assets/* a partir de public/
  middleware/body.js  leitura do corpo JSON
  routes/             uma pasta de rotas por recurso
  services/           regras de negócio (preços, checkout, carteira, pagamentos)
public/               logótipo e CSS usados nos e-mails
var/uploads/          manuais dos produtos (carregados pelo backoffice)
var/exports/          arquivos de exportação gerados a pedido dos clientes
```

## Endpoints

| Método | Caminho | Auth | Descrição |
|---|---|---|---|
| GET | `/health` | — | estado do serviço |
| GET | `/version` | — | versão e commit |
| GET | `/assets/*` | — | ficheiros estáticos |
| POST | `/users` | — | registo (`email`, `password`, `name`) |
| POST | `/sessions` | — | login; devolve `token` (Bearer) |
| GET | `/users/me` | sim | perfil |
| GET | `/wallet` | sim | saldo e movimentos da carteira |
| GET | `/products` | — | catálogo (`?category=`) |
| GET | `/products/:id` | — | detalhe do produto |
| GET | `/cart` | sim | carrinho com o preço calculado |
| POST | `/cart/items` | sim | adiciona `{ productId, qty }` |
| DELETE | `/cart/items/:productId` | sim | remove uma linha |
| POST | `/cart/coupon` | sim | aplica um cupão `{ code }` |
| POST | `/orders` | sim | cria uma encomenda pendente a partir do carrinho |
| GET | `/orders` | sim | encomendas do utilizador |
| GET | `/orders/:id` | sim | detalhe de uma encomenda |
| POST | `/orders/:id/pay` | sim | paga com `{ method: "wallet" }` ou `{ method: "card", cardToken }` |
| POST | `/exports` | sim | gera um `.tgz` com o histórico de encomendas (`{ name }` opcional) |
| GET | `/files?name=` | — | descarrega um manual de produto |

## Regras de negócio

- Os preços do catálogo são sem IVA; o IVA é de 23% sobre o valor líquido (subtotal menos desconto).
- Portes de 4,90 € abaixo de 40 € líquidos; grátis a partir daí.
- Um cupão nunca desconta mais de metade do subtotal.
- Todos os valores são em euros, ao cêntimo.
- A carteira é carregada pelo backoffice (reembolsos e cartões-oferta); o cliente só a usa para pagar.
- Pagamentos com cartão passam pelo PSP (`services/psp.js`, ligado à sandbox neste ambiente).
