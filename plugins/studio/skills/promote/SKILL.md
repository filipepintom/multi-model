---
name: promote
description: Propõe que lições pessoais confirmadas passem a lições do plugin (comuns à equipa). Reúne as candidatas, compara com as lições do plugin e prepara a alteração num branch do repositório do plugin, para revisão por PR. Usar por quem mantém o plugin, ou por quem quer propor as suas lições à equipa.
argument-hint: "<caminho do repositório do plugin>"
disable-model-invocation: true
---

# /studio:promote

Repositório do plugin: $ARGUMENTS

O conhecimento comum só cresce com curadoria. Este comando **propõe**; um humano decide, num PR.

## 1. Reunir

1. O contexto traz, na secção "Conhecimento do estúdio", as lições do plugin e as tuas lições. As candidatas são as tuas lições marcadas `(candidata)` ou `(contradiz a lição do plugin: …)`.
2. Se o utilizador indicar ficheiros de lições de colegas (exportados por eles), lê-os também e trata-os da mesma forma.
3. Sem candidatas → diz isso e termina.

## 2. Avaliar cada candidata

Para cada uma, decide e explica numa linha:
- **Entra:** é acionável, foi confirmada (mais do que um build, ou um problema sério evitado) e vale para qualquer pessoa da equipa nesta stack;
- **Substitui ou corrige uma lição do plugin:** a candidata contradiz uma lição do plugin, com evidência de que a do plugin está errada ou incompleta;
- **Fica pessoal:** depende do gosto ou do contexto de uma pessoa, ou ainda não está confirmada.

Formula as que entram ao estilo das lições do plugin: uma linha acionável, na secção certa (Geral, ou `## Stack: <tecnologia>`), com `(origem: [[<slug>]], <data>)`.

## 3. Mostrar e confirmar

Apresenta ao utilizador uma tabela com a candidata, a decisão e o texto final. Pergunta com AskUserQuestion se prepara o branch com as que entram. Nada é escrito sem esta confirmação.

## 4. Preparar a alteração

No repositório do plugin indicado em `$ARGUMENTS`:
1. Confirma que é o repositório certo (existe `plugins/studio/knowledge/lessons.md`) e que a árvore está limpa.
2. Cria o branch `lessons/<data>-<tema curto>` a partir da branch principal.
3. Edita `plugins/studio/knowledge/lessons.md`: acrescenta, substitui ou apaga linhas. Nunca duplica.
4. Faz commit com uma mensagem que lista as lições e a origem de cada uma.
5. Pergunta ao utilizador se abre o PR. Só faz push e abre o PR com essa confirmação (com `gh pr create` se estiver disponível; senão, indica o comando).
6. Nas tuas lições pessoais, tira o `(candidata)` das que foram propostas e acrescenta `(proposta à equipa em <data>)`.

## Regras

- Preferências nunca são promovidas: são sempre pessoais.
- Uma lição promovida tem de fazer sentido sem o contexto do projeto de onde veio.
- Menos é mais: uma lição do plugin é lida por todos os builds de toda a equipa.
