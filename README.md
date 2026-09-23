# Customer Experience · UniAnchieta

Sistema de organização do setor de **Customer Experience (CX)** do UniAnchieta.

Cada processo que o CX reestrutura fica registrado do início ao fim:
- em que etapa está e há quanto tempo;
- quem cuida;
- o problema identificado;
- o cenário atual e o proposto, lado a lado;
- as tarefas, os andamentos e os anexos;
- os indicadores de antes e depois.

A equipe CX usa todos os dias. A diretoria consulta para acompanhar.

> **Nesta versão os dados ficam no navegador de cada pessoa.** Quem usa outro computador ou outro
> navegador não vê o que está aqui. O backup (Configurações → Backup) é a forma de guardar e levar os
> dados. Veja [docs/ARQUITETURA.md](docs/ARQUITETURA.md) para o caminho até um banco compartilhado.

## Como rodar

Requer Node 20 ou mais novo.

```bash
npm install
npm run dev        # abre em http://localhost:3000 (ou a próxima porta livre)
```

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run lint` | checagem de tipos (`tsc --noEmit`) |
| `npm run audit:design` | procura anti-padrões do design system no código |
| `npm run build` | checagem de tipos + build de produção em `dist/` |
| `npm run check` | lint + auditoria + build, em sequência |
| `npm run preview` | serve o build de `dist/` localmente |

Para publicar dentro do Funcionário Online, veja [docs/PUBLICACAO.md](docs/PUBLICACAO.md).

## Estrutura

```
docs/                      documentação: design system, arquitetura, dados, publicação
scripts/audit-design.mjs   auditoria automática do design system
src/
  config/app.ts            nome do sistema, prefixo do código (CX-001), chaves de armazenamento
  lib/                     utilitários sem regra de negócio: datas pt-BR, ids, texto, arquivos, motion
  data/                    camada de dados: tipos, schema, repositório, store (o único acesso ao armazenamento)
    adapters/local/        adaptador atual: localStorage + IndexedDB
  domain/                  regras de negócio puras (sem React): etapas, listas, prazos
  services/                ações (a única porta de escrita das telas), identidade, preferências, backup
  hooks/                   ligação React ↔ store e preferências
  app/                     shell: roteador, sidebar, header, busca rápida, identidade
  components/ui/           primitivos do design system (Button, Surfaces, Fields, Overlay…)
  components/domain/       componentes do domínio: status do processo, stepper de etapas… (a partir da fase 2)
  features/                uma pasta por tela: painel, processos, processo, fluxo, configuracoes
```

O caminho de uma escrita é sempre o mesmo:

```
tela → services/acoes → domain (regra) → data/store (memória) → repositório (armazenamento)
```

## Design

Toda a interface segue o [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md): tokens, tipografia Geist,
motion, primitivos e as cinco regras. Nenhuma tela escreve cor, raio ou sombra crua; elas só compõem
os primitivos de `src/components/ui/`. O `npm run audit:design` barra os desvios mais comuns.

## Fases de construção

| Fase | Conteúdo | Situação |
|---|---|---|
| 1 | Base, tokens, primitivos, shell, camada de dados, configurações | concluída |
| 2 | Lista, quadro e linha do tempo; novo processo; detalhe com todas as abas | concluída |
| 3 | Construtor do fluxo proposto e comparação antes e depois | concluída |
| 4 | Painel, Meu trabalho, busca global, resumo e relatório para impressão | concluída |
| + | Caixa de demandas, notas da equipe, tarefas padrão por etapa | concluída |

## Onde fica cada coisa (para quem usa)

| Quero… | Onde |
|---|---|
| Criar um processo | botão **Novo processo** no topo, tecla **N**, ou o **+** de uma coluna do quadro |
| Ver tudo | **Processos** (lista, quadro por etapa ou linha do tempo) |
| Ver só o que é meu | **Meu trabalho** |
| Registrar algo que chegou e ainda não é processo | **Demandas** → Registrar demanda |
| Mudar de etapa | botão **Avançar** no processo, clique na barra de etapas, ou arraste no quadro |
| Mostrar à diretoria | no processo: **Apresentar antes e depois** ou **Resumo para impressão**; no painel: **Relatório para a diretoria** |
| Achar qualquer coisa | **Ctrl K** (ou ⌘K) |
