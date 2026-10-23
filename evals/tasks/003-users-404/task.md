O serviço de utilizadores (`server.js`) tem dois problemas que apareceram em produção esta semana:

- `GET /users/999` (um id que não existe) responde 200 com o corpo `null`. Devia responder 404.
- `GET /users/abc` rebenta o processo inteiro e o serviço cai até alguém o reiniciar.

O que preciso:

- Id numérico que não existe: 404 com corpo JSON `{ "error": "..." }` (a mensagem fica ao teu critério).
- Id inválido (qualquer coisa que não seja um inteiro, por exemplo `abc`, `1x` ou `1.5`): 400 com corpo JSON `{ "error": "..." }`.
- O servidor tem de continuar a funcionar depois de receber pedidos inválidos.
- Os utilizadores que existem continuam a ser devolvidos como hoje, com 200.
- Acrescenta um teste que teria apanhado estes problemas.

O serviço continua a arrancar com `node server.js` e a ler a porta da variável de ambiente `PORT`. Não podes usar dependências externas.
