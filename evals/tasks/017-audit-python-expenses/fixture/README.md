# expenses

Registo de despesas pessoais em linha de comandos, com um relatório mensal que também se pode ver no browser. Começou como uma coisa só minha e hoje é usado por mais umas quantas pessoas da equipa, cada uma com a sua base de dados.

Só usa a biblioteca padrão do Python (3.12 ou mais recente). Testado em Linux e macOS.

## Instalar

```sh
git clone <repo> expenses && cd expenses
python -m expenses --help
```

Os dados ficam em `~/.expenses/` (`expenses.db` e `config.json`). Para usar outra pasta, define `EXPENSES_HOME`.

## Uso

```sh
python -m expenses add 23.45 "Pingo Doce" -c casa -t "supermercado"
python -m expenses add 899 "Portátil" -c trabalho --installments 3
python -m expenses add 40 "Livro" --currency USD -c lazer
python -m expenses list --month 2026-09 -c casa -c carro
python -m expenses search "pingo"
python -m expenses report --month 2026-09
python -m expenses export setembro.csv --month 2026-09 --open
python -m expenses import movimentos.csv --dry-run
python -m expenses backup ~/backups/despesas.bak --compress
python -m expenses restore ~/backups/despesas.bak.gz
python -m expenses serve            # http://127.0.0.1:8765/
```

### Importar do banco

O `import` aceita CSV com `;` ou `,` e as colunas `date`, `description`, `amount` e, opcionalmente, `currency`, `category` e `tags` (separadas por vírgulas). As datas podem vir como `2026-09-03` ou `03/09/2026`, e os valores com vírgula ou ponto decimal. Valores negativos ficam como devoluções. O import não procura duplicados: exporta do banco só os movimentos que ainda não importaste.

### Moedas

Os valores ficam na moeda em que foram pagos. O relatório e a exportação convertem para a moeda base (`EUR`) com as taxas da configuração:

```sh
python -m expenses config show
python -m expenses config set rates.USD 0.93
```

### Backups

O `backup` grava todas as despesas num único ficheiro, que serve para passar os dados para outro computador (ou para alguém da equipa que queira começar com as categorias de outra pessoa). O `restore` substitui tudo o que existe pelo conteúdo do backup.

## Testes

```sh
python -m unittest discover -s tests
```
