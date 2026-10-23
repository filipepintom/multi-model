Estamos a preparar o módulo de perfis e precisamos de mexer na tabela `users`. Temos um sistema de migrações minimalista em `migrate.py`: `python migrate.py <db_path> [--to N]` aplica por ordem os ficheiros `migrations/NNN_*.py` (cada um define `up(conn)`) e regista a versão na tabela `schema_version`. Neste momento só existe a `001_create_users.py`.

Cria a migração `002` seguindo a mesma convenção, com duas alterações à tabela `users`:

1. Uma coluna nova `full_name`, preenchida nos registos que já existem com o primeiro e o último nome separados por um espaço (`"Ana Silva"`), sem espaços sobrantes nas pontas (se faltar um dos nomes, fica só o outro).
2. O email passa a ser único sem distinguir maiúsculas de minúsculas: inserir `ANA@x.com` quando já existe `ana@x.com` tem de falhar com um erro de integridade do SQLite. Podes assumir que os dados que já lá estão não têm emails repetidos, nem sequer em variantes de maiúsculas/minúsculas.

O resto do código continua a inserir utilizadores só com `first_name`, `last_name` e `email`, e isso tem de continuar a funcionar.

Voltar a correr `python migrate.py <db_path>` depois de tudo aplicado não pode alterar nada nem dar erro. O `migrate.py` já faz isto para a 001, por isso só confirma que a 002 também respeita.
