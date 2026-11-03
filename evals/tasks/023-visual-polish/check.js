// Check escondido: a página mudou e não perdeu conteúdo. A qualidade visual é avaliada às cegas por evals/visual/jury.js.
require(require('path').join(process.env.EVAL_LIB, 'visual-check.js'))({
  facts: ['VetAgenda', 'Consultas de hoje', 'Por confirmar', 'Bolinha', 'Tareco', 'Rex', 'Nuvem', 'Dra. Sara Nunes', 'Dra. Clara Dias', '912 000 118'],
  original: '9e1565144bab7c4684fd8543ca5db4a648da3daf18e1d7871e3a16b5434bf0e5',
});
