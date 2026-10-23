O registo de utilizadores em `signup.py` aceita tudo: `create_user(payload)` guarda o que lhe passarem, incluindo emails inválidos, passwords fracas e a password em texto simples. Já nos apareceram contas duplicadas e lixo na base. Preciso que passe a validar.

O `payload` é um dict com as chaves `email` e `password` (pode trazer outras, como `name`, que não precisam de validação). Regras:

- Se o input for inválido, `create_user` levanta `ValueError`. É inválido quando:
  - o email falta, está vazio ou não passa numa verificação simples: exatamente um `@`, parte local não vazia e um domínio com pelo menos um ponto (ex.: `ana@example.com` é válido, `ana@localhost` não);
  - a password falta, tem menos de 8 caracteres ou não tem nenhum dígito;
  - já existe um utilizador com esse email, sem distinguir maiúsculas de minúsculas.
- Antes de validar e guardar, o email é limpo de espaços nas pontas e passado para minúsculas.
- Um pedido rejeitado não pode deixar nada registado (por exemplo, o mesmo email deve poder ser usado depois com uma password válida).
- Em caso de sucesso, `create_user` devolve um dict com pelo menos a chave `email` (já normalizado). A password em texto simples não pode ir nesse dict nem ficar guardada em memória; se quiseres guardar algo para uso futuro, que seja um hash.

A assinatura `create_user(payload: dict) -> dict` mantém-se. Acrescenta testes unitários com `unittest`, de modo que `python -m unittest discover` na raiz do projeto os encontre e passem.
