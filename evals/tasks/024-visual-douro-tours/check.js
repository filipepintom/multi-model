// Check escondido: conteúdo mínimo. A qualidade visual é avaliada às cegas, a partir das capturas.
// O operador (Xisto Lento) é fictício. Os factos são nomes sem acentos nem números, para não falharem por uma
// entidade HTML nem passarem por causa de um valor da folha de estilos.
require(require('path').join(process.env.EVAL_LIB, 'visual-check.js'))({
  facts: ['Xisto Lento', 'Slow Quintas', 'Golden Hour Viewpoints', 'Harvest Day', 'Galafura', 'Casal de Loivos', 'reservas@xistolento.pt'],
});
