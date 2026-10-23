Preciso de uma app de notas pequena, de raiz (a descrição do produto está no `README.md`). Sem dependências externas: só Node 20 e HTML/CSS/JS simples no browser. Quero conseguir arrancá-la com `node server.js`, abrir no browser, criar notas, ver a lista, editar e apagar.

## Servidor

`server.js` na raiz, a arrancar com `node server.js`:

- Porta pela variável de ambiente `PORT` (por omissão 3000).
- As notas ficam guardadas num ficheiro JSON cujo caminho vem da variável `DATA_FILE` (por omissão `./data.json`). Se o ficheiro não existir, é criado. Os dados têm de sobreviver a um reinício do servidor com o mesmo `DATA_FILE`.
- `GET /` devolve uma página HTML com um formulário (`<form>`) para criar notas (título e texto) e a lista das notas existentes, com a possibilidade de editar e apagar cada uma. A página fala com a API abaixo, sem recarregar tudo.

## API

Tudo em JSON. Uma nota é `{ "id", "title", "body", "createdAt", "updatedAt" }`: `id` é uma string única, `createdAt` e `updatedAt` são datas em ISO 8601.

- `GET /api/notes` → 200 com a lista (array) de notas.
- `POST /api/notes` com `{ "title", "body" }` → 201 com a nota criada.
- `GET /api/notes/:id` → 200 com a nota.
- `PUT /api/notes/:id` com `{ "title", "body" }` → 200 com a nota atualizada (`createdAt` não muda; `updatedAt` passa a refletir a alteração).
- `DELETE /api/notes/:id` → 204 sem corpo.

Regras:

- `title` é obrigatório: string, com pelo menos um carácter para além de espaços, e no máximo 100 caracteres. `body` é opcional (string; assume `""` se faltar). Em `POST` e `PUT`, dados inválidos dão 400.
- `id` que não existe (em `GET`, `PUT` e `DELETE`) → 404.
- Corpo que não seja JSON válido, ou que seja JSON mas não um objeto → 400.
- Todos os erros (400 e 404) respondem com JSON `{ "error": "mensagem" }`, com `Content-Type: application/json`.
- O servidor nunca pode cair com um pedido mal feito.

## Testes

Inclui testes com o test runner nativo (`node --test`) que cubram a API (o fluxo normal, as validações, os 404 e a persistência) e um `package.json` com o script `test`; `npm test` tem de passar.
