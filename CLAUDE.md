# CLAUDE.md — Customer Experience · UniAnchieta

Front end do sistema de organização do setor de CX do UniAnchieta. React 19 + TypeScript + Vite 6 +
Tailwind 4 (plugin Vite, sem `tailwind.config.js`) + `motion/react` + `lucide-react`. Nenhuma
biblioteca de UI, de gráficos ou de roteamento.

## Antes de escrever qualquer UI

Leia `docs/DESIGN_SYSTEM.md` inteiro. É a lei visual. Em especial:
- as cinco regras (§1);
- a tabela de anti-padrões (§14);
- o checklist (§16).

- Nenhuma view escreve cor, raio ou sombra crua; só compõe os primitivos de `src/components/ui/`.
- Primitivo novo segue as regras e leva um comentário de cabeçalho explicando o porquê.
- `src/index.css` e `src/lib/motion.ts` são cópias do documento. Acréscimos ficam no fim, marcados.
- Toda a interface em português do Brasil, em sentence case. Datas sempre `dd/mm/aaaa`, via `src/lib/dates.ts`.
- Trocar o tema sempre por `trocarTema(tema, elementoDeOrigem)` (`src/app/transicaoDeTema.ts`). É a
  revelação circular clonada do vídeo de referência (`ease`, 630ms, a partir do botão). Nunca chame
  `definirTema` direto numa interação.
- Rode `npm run check` (lint + `audit:design` + build) antes de dar algo por pronto. Tem de sair com 0 erro.

## Arquitetura (ver docs/ARQUITETURA.md)

- **Escrita:** tela → `services/acoes.ts` → regra em `domain/` (devolve `Op[]`) → `data/store.ts` → repositório.
- **Leitura:** via hooks de `src/hooks/`.
- Telas nunca tocam em `localStorage`/IndexedDB nem no repositório. Isso permite trocar o adaptador
  local por um banco compartilhado mudando só `src/data/index.ts`.
- `domain/` é puro: não importa React, nem componentes, nem a store.
- Preferências do navegador (tema, identidade, UI) vivem em `services/preferencias.ts` e
  `services/identidade.ts`, fora da camada de dados.
- Dado externo (localStorage, backup) sempre passa por `data/schema.ts#normalizarSnapshot`.
- Mudou o formato de uma entidade? Suba `SCHEMA_VERSION` e escreva a migração.

## Regras do domínio

- **Nunca** criar dados de exemplo: processos, pessoas, setores, métricas ou prazos. O sistema começa vazio.
  A única configuração inicial (etapas, origens, níveis) foi confirmada pela equipe e está em `data/defaults.ts`.
- **Não inventar** informação da instituição. Se faltar, perguntar.
- A última etapa encerra o processo. Entrar nela marca a situação como concluída, e vice-versa.
- Toda exclusão pede confirmação (`useConfirm`).
- Item de lista em uso é arquivado, não apagado.
- A mudança de etapa, situação, responsável, prazo, anexo e tarefa concluída gera andamento automático.
  Mudar um prazo que já existia pede o motivo (opcional) e entra em `historicoPrazos`.
- **TI:** quem entra como TI (`identidade.tipo === 'ti'`) só vê a Fila do TI (`#/ti`); o redirecionamento
  está em `App.tsx`. O processo entra na fila ao chegar a uma etapa com sinal `ti`. O TI puxa, muda o
  status dele (`desenvolvimento` ↔ `validar`), a previsão, o link e anexa a entrega (contexto `ti`),
  mas **nunca** muda a etapa. Regras em `domain/ti.ts`.
- **Concluídos:** períodos de calendário (semana, mês, trimestre, semestre, ano) em `domain/concluidos.ts`.
- **Novidades** (sino do header): o que outras pessoas registraram desde a última visita
  (`domain/novidades.ts`); a última visita é preferência do navegador.
- Ao entrar numa etapa, as tarefas padrão dela entram no checklist (sem duplicar). Ao AVANÇAR com
  tarefas abertas da etapa atual, pedir confirmação (`features/processo/useMoverEtapa.ts`).
- Um processo pode ter vários responsáveis (`responsaveisIds`). Sem pontuação em lugar nenhum.
- Campos que salvam sozinhos e editam listas do processo usam `acoesProcesso.editar(id, fn)`, que
  lê o processo mais recente na hora de gravar.

## Hospedagem

Roda dentro do Funcionário Online, sistema interno da instituição: build estático com `base: './'` e
rotas por hash. Pode estar num iframe de outro domínio; ver docs/PUBLICACAO.md. Não use `crypto.randomUUID`
(exige HTTPS; use `lib/ids.ts`) nem `showPicker()` de input de data (falha em iframe cross-origin).
