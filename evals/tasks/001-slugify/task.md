Cria um módulo Node.js `slugify.js` (CommonJS, sem dependências) na raiz do projeto que exporta `slugify(text)`:

- converte para minúsculas;
- remove acentos e diacríticos (ex.: "ção" → "cao");
- substitui qualquer sequência de caracteres não alfanuméricos por um único hífen;
- não deixa hífens no início nem no fim;
- devolve string vazia para input vazio ou só com símbolos.

Inclui testes com o test runner nativo (`node --test`) e um `package.json` com o script `test`.
