Recebemos uma queixa de um utilizador: depois da última versão, a importação de ficheiros CSV deixou de funcionar com campos entre aspas. Exemplos reais:

- `a,"b,c",d` devia dar 3 campos (`a`, `b,c`, `d`), mas está a dar 4.
- `"ele disse ""olá""",x` devia dar `ele disse "olá"` e `x`, e as aspas vêm todas mal.

Vê o `CHANGELOG.md`, acho que foi daí que veio a regressão. A função `parseLine(line)` em `csv.js` tem de voltar a tratar uma linha CSV como no RFC 4180:

- campos entre aspas duplas podem conter vírgulas;
- dentro de um campo entre aspas, `""` representa uma aspa dupla literal;
- campos vazios são válidos, incluindo no início e no fim da linha (`,a,` dá `['', 'a', '']`);
- uma linha vazia dá `['']`;
- linhas simples sem aspas continuam a funcionar como agora.

Só tens de tratar uma linha de cada vez (não há campos com quebras de linha). A função continua a devolver um array de strings e é exportada como hoje (`module.exports = { parseLine }`). Acrescenta testes para estes casos, e tem a velocidade em mente: não quero perder o ganho que a otimização trouxe em linhas simples, mas a correção vem primeiro.
