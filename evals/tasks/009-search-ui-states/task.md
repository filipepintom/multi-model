A pesquisa em `index.html` (a fruta do catálogo, servida pelo `server.js` de teste) funciona no caminho feliz, mas o resto é um desastre: enquanto o pedido está a decorrer não aparece nada, quando não há resultados fica um `[]` em JSON, se a API falhar a página simplesmente não reage, e se o utilizador escrever depressa às vezes aparecem resultados de uma pesquisa antiga por cima da atual. Quero que isto se comporte como uma pesquisa a sério.

O que a pessoa deve ver:

- **Sem pesquisa** (campo vazio ou só com espaços): estado neutro, sem pedidos à API.
- **A carregar**: um indicador claro de que a pesquisa está a decorrer.
- **Com resultados**: a lista de nomes (de `results`, na resposta `{ "results": [ { "id", "name" } ] }`).
- **Sem resultados**: uma mensagem que diz isso, em vez de uma lista vazia.
- **Erro** (falha de rede ou resposta que não seja 2xx): uma mensagem de erro e um botão para tentar de novo a mesma pesquisa.
- Os pedidos não devem disparar a cada tecla: esperar cerca de 300 ms depois da última tecla antes de pesquisar.
- Resultados de uma pesquisa que já foi substituída por outra (o utilizador continuou a escrever) nunca podem aparecer.
- As mudanças de estado devem ser anunciadas a quem usa leitor de ecrã.

## Interface (para eu poder testar a lógica sem browser)

A lógica de estados fica num módulo próprio, `search-state.js`, na raiz do projeto, que tem de funcionar tanto com `require('./search-state.js')` (Node/CommonJS) como carregado numa página com `<script src="search-state.js"></script>`; neste segundo caso expõe o global `SearchState`. Em ambos os casos oferece `{ initialState, reducer }`.

- `initialState` é `{ status: 'idle', query: '', results: [], error: null }`.
- `reducer(state, action)` é uma função pura (não altera o `state` recebido) e devolve o novo estado. `status` é um de `idle | loading | success | empty | error`.
- Ações (cada uma é um objeto com `type`):
  - `{ type: 'QUERY_CHANGED', query }`: se `query` for vazia ou só espaços, passa a `idle` (com `query: ''`); caso contrário passa a `loading` com `state.query` igual à `query` recebida.
  - `{ type: 'RESULTS_RECEIVED', query, results }`: a `query` é a pesquisa para a qual o pedido foi feito. Se não for igual à `state.query` atual, ou se o estado atual não for `loading`, a ação é ignorada (devolve-se o mesmo estado). Caso contrário, `results` com itens → `success` (e `state.results` com esses itens); `results` vazio → `empty`.
  - `{ type: 'REQUEST_FAILED', query, error }`: com a mesma regra de ignorar respostas desatualizadas; caso contrário passa a `error`, com `state.error` preenchido a partir de `error`.
  - `{ type: 'RETRY' }`: só tem efeito em `error`, onde volta a `loading` para a mesma `state.query`; em qualquer outro estado não faz nada.

## Na página

- `index.html` carrega `search-state.js` com uma tag `<script src="search-state.js">` e usa o reducer; cada pedido à API leva consigo a pesquisa para que foi feito, e é com ela que se despacham `RESULTS_RECEIVED`/`REQUEST_FAILED`.
- Tem uma região com `aria-live` (por exemplo `aria-live="polite"`) onde o estado é comunicado, escrita diretamente no HTML.
- O botão de tentar de novo é um `<button>` com `data-action="retry"`, escrito no próprio `index.html` (pode estar escondido enquanto não há erro).
- Podes mexer no `server.js` se for útil, mas ele só serve para testes manuais.

Acrescenta testes para o reducer com o test runner nativo (`node --test`), cobrindo pelo menos as transições principais e o caso da resposta desatualizada; `npm test` tem de passar.
