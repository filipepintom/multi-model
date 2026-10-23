Queria uma pequena ferramenta de linha de comandos para gerir uma lista de tarefas, em Python (só biblioteca standard). O repositório está praticamente vazio, só tem o README.

O ponto de entrada é `todo.py` na raiz do projeto, usado como `python todo.py <subcomando> ...`. As tarefas ficam guardadas num ficheiro JSON cujo caminho vem da variável de ambiente `TODO_FILE`; se o ficheiro não existir, é criado quando for preciso.

Subcomandos:

- `add "<texto>"`: acrescenta uma tarefa (por fazer) e imprime o id novo, apenas o número, numa linha.
- `list`: imprime as tarefas, uma por linha, ordenadas por id, no formato `<id> [ ] <texto>` para as por fazer e `<id> [x] <texto>` para as concluídas (um espaço entre cada parte). Sem tarefas não imprime nada.
- `done <id>`: marca a tarefa como concluída.
- `remove <id>`: apaga a tarefa.

Os ids são números inteiros, a começar em 1, e nunca se reutilizam: se apagar a tarefa 3 (a última) e depois acrescentar outra, a nova é a 4. Isto tem de se manter entre execuções diferentes do programa.

Códigos de saída: 0 em caso de sucesso; 1 quando o id não existe (`done` ou `remove`), com uma mensagem no stderr; 2 para uso inválido (falta o subcomando, subcomando desconhecido, argumentos em falta ou um id que não é um inteiro). O comportamento por omissão do `argparse` para erros de uso serve.

Acrescenta testes automáticos com `unittest`, de modo que `python -m unittest discover` na raiz do projeto os encontre e passem. Os testes não devem mexer em ficheiros fora de uma pasta temporária.
