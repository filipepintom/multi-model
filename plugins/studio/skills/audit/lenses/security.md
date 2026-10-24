# Lente: segurança

Pergunta central: **que input controlado por um atacante chega a um sítio onde causa dano, e o que o impede, se é que alguma coisa o impede?**

Trabalha **da fonte para o destino**. As fontes são as fronteiras de confiança do `map.md`: parâmetros de rota e query, corpo do pedido, headers, cookies, ficheiros carregados ou importados, argumentos de linha de comandos, variáveis de ambiente controláveis e dados de serviços externos. Para cada fonte no âmbito, segue o valor até aos destinos perigosos.

## Destinos perigosos

**Injeção**
- shell: `exec`, `spawn` com `shell: true`, `subprocess` com `shell=True`, `os.system`, crases. Concatenar ou interpolar input no comando é a falha;
- SQL ou NoSQL: queries construídas com concatenação, template strings, f-strings ou `%`/`.format`, em vez de placeholders;
- caminhos: input juntado a um diretório base sem resolver e confirmar que fica lá dentro (`../`, caminhos absolutos, symlinks);
- desserialização: `pickle`, `yaml.load` sem SafeLoader, `eval`/`Function`/`exec`, `vm` com input;
- templates e HTML: XSS em HTML gerado no servidor, sem escaping; injeção de headers.

**Autenticação e autorização**
- rotas que verificam *quem* és mas não *se podes* aceder àquele recurso (IDOR): obter, alterar ou apagar por id sem confirmar o dono ou o papel;
- verificação de autorização só no cliente, ou só em algumas rotas do mesmo recurso;
- tokens previsíveis (`Math.random`, timestamps), sessões sem expiração, comparações de segredos que não são em tempo constante, quando isso for explorável;
- passwords guardadas sem hash lento com salt (bcrypt, scrypt, argon2, PBKDF2).

**Disponibilidade e limites**
- corpo de pedido, upload ou ficheiro importado sem limite de tamanho;
- regex com backtracking catastrófico sobre input do utilizador;
- operações caras sem limite (paginação sem máximo, exportações completas).

**Exposição**
- segredos no código ou em ficheiros versionados;
- stack traces, queries ou dados internos nas respostas de erro;
- dados sensíveis em logs (passwords, tokens, dados pessoais ou financeiros);
- SSRF: um URL fornecido pelo utilizador e pedido pelo servidor.

**Dependências**
- vulnerabilidades conhecidas que o `baseline.md` reporte. Só são findings se o código usar a parte vulnerável.

## Como provar

Escreve o caminho completo: `fonte (ficheiro:linha) → transformações → destino (ficheiro:linha)`, com um payload concreto e inofensivo. Por exemplo: `GET /export?name=x;touch /tmp/pwn` → `routes/exports.js:31` interpola `name` em `exec(...)` → o comando corre. Confirma que nenhum middleware ou validação pelo caminho bloqueia o payload.

## Não reportar

- `exec` ou `subprocess` com comando constante ou lista de argumentos sem shell;
- caminhos que já são resolvidos e confirmados como estando dentro do diretório base;
- hashes não criptográficos usados para cache ou ETag (`md5(..., usedforsecurity=False)`), e `Math.random` para coisas que não são de segurança;
- "boas práticas" genéricas sem vetor concreto (falta de CSP numa API JSON, headers recomendados) que não tenham impacto explorável neste código.

Para auditorias de segurança profundas de um repositório inteiro, recomenda no relatório o Claude Security (`/claude-security`) como passo seguinte.
