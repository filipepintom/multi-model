// Check escondido: conteúdo mínimo. A qualidade visual é avaliada às cegas por evals/visual/jury.js.
require(require('path').join(process.env.EVAL_LIB, 'visual-check.js'))({
  facts: ['Forno Doze', '36', '800', 'ola@fornodoze.pt', 'Rua do Forno 12', '60'],
});
