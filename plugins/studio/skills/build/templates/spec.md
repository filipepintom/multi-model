# Spec — <título>

## Objetivo

<Uma frase: que problema resolve e para quem.>

## Decisões

As escolhas que mudam o produto, o custo ou o risco, e que o utilizador deve validar no gate 1. No máximo ~7. O resto vai para "Assumido".

### D1 — <a decisão, em forma de pergunta: "Onde ficam os dados?">

- **Contexto:** <porque é que isto importa aqui, numa ou duas frases>
- **Opções:**
  - A — <opção> · a favor: <…> · contra: <…>
  - B — <opção> · a favor: <…> · contra: <…>
- **Recomendação:** <A>, porque <motivo ligado ao objetivo e às preferências conhecidas>
- **Custo de mudar depois:** <baixo | médio | alto> — <porquê>
- **Estado:** proposta | aceite | alterada pelo utilizador → <o que escolheu e porquê>

### Assumido

- <decisões menores tomadas pelo agente, uma linha cada, que o utilizador pode contestar se quiser>

## Âmbito do MVP

- <funcionalidade>

## Fora de âmbito

- <o que explicitamente não entra nesta versão>

## Critérios de aceitação

Cada critério é testável: alguém consegue escrever um teste que passa ou falha.

- [ ] CA1 — <dado X, quando Y, então Z>
- [ ] CA2 — …

## Stack e arquitetura

- Stack: <linguagem, framework, base de dados>
- Componentes: <módulos principais e como comunicam>
- As escolhas de arquitetura com trade-offs vão para a secção **Decisões**, não para aqui.

## Direção de design

Só para projetos com interface. Com a skill `studio:impeccable`, resume aqui o `PRODUCT.md` e o `DESIGN.md` e liga-os.

- Modo: <operar (app, dashboard) | persuadir (landing) | ler (docs) | experiência (portfolio)>
- Quem usa, onde e em que situação: <ex.: no telemóvel, ao fim do mês, para ver para onde foi o dinheiro>
- Tom: <3 adjetivos>
- Referências: <produtos ou sites cujo nível visual queremos> · Anti-referências: <o que evitar>
- Densidade: <compacta | equilibrada | arejada>
- Restrições: <marca, cores obrigatórias, acessibilidade, modo escuro>

## Dados e integrações

<Entidades principais, APIs externas, autenticação.>

## Verificação

- Comando: `<conteúdo de .studio/verify>`
- UI: <fluxos a verificar no browser, se aplicável>

## Riscos

1. <risco → mitigação>
