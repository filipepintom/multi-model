// Check escondido: conteúdo mínimo. A qualidade visual é avaliada às cegas por evals/visual/jury.js.
require(require('path').join(process.env.EVAL_LIB, 'visual-check.js'))({
  facts: ['R-214', 'R-219', 'Marta Sousa', 'Brompton', 'Riese', 'E04', 'Inês', 'Tomás'],
});
