# Preferências do utilizador

Observadas em projetos anteriores: decisões que o utilizador alterou no gate 1 e feedback que deu depois das entregas. O `/studio:build` lê este ficheiro para fazer **recomendações** mais próximas do que o utilizador quer. Nunca serve para decidir em silêncio: as decisões continuam a ir ao gate 1.

Uma linha cada, com a origem. Atualizar quando uma preferência mudar; apagar quando deixar de ser verdade.

## Produto e âmbito

- Prefere apps simples, com pouco código: achou a app de finanças "simples mas com muito código". Recomenda a stack e a arquitetura mais leves que cumpram o objetivo. (origem: [[financas-pessoais]], 2026-10-24)

## Arquitetura e dados

- Prefere os dados num servidor local com SQLite, acessível do computador e do telemóvel, a guardá-los no browser (IndexedDB). (origem: [[financas-pessoais]], gate 1, 2026-10-24)

## Acesso e publicação

- Quer conseguir aceder às apps de qualquer lugar. Para uso pessoal, recomenda uma VPN do tipo Tailscale antes de qualquer publicação pública. (origem: [[financas-pessoais]], feedback, 2026-10-24)

## Design

- A estética da interface importa: a interface funcional mas genérica da app de finanças foi o principal ponto negativo. (origem: [[financas-pessoais]], feedback, 2026-10-24)
