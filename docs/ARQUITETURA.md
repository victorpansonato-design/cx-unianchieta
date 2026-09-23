# Arquitetura

## Camadas

```
┌─────────────────────────────────────────────────────────────────────┐
│ features/  app/            telas e shell — só compõem primitivos     │
│   │  lê: hooks/ (useStore, useConfig, useIdentidade…)                │
│   │  escreve: services/acoes.ts                                      │
├───┼─────────────────────────────────────────────────────────────────┤
│ services/                  ações, identidade, preferências, backup   │
│   │  pede a regra ao domain/ e entrega as Ops à store                │
├───┼─────────────────────────────────────────────────────────────────┤
│ domain/                    regras puras: devolvem Op[] ou o motivo   │
│                            pelo qual a mudança não pode acontecer    │
├─────────────────────────────────────────────────────────────────────┤
│ data/store.ts              estado em memória, atualização otimista,  │
│                            fila de gravação, estado de salvamento    │
│   │                                                                  │
│ data/repository.ts         CONTRATO do armazenamento (assíncrono)    │
│   │                                                                  │
│ data/adapters/local/       localStorage (dados) + IndexedDB (arquivos)│
└─────────────────────────────────────────────────────────────────────┘
```

### O caminho de uma escrita

Exemplo: arrastar um processo para outra etapa no quadro.

1. A tela chama `acoesProcesso.moverParaEtapa(processoId, etapaId)` (em `services/acoes.ts`).
2. A ação lê o estado atual e pede à regra em `domain/`. A regra devolve as operações:
   ```ts
   [{ tipo: 'processo', valor: processoAtualizado },
    { tipo: 'andamento', valor: registroAutomatico }]
   ```
3. `store.aplicar(ops)` atualiza a memória na hora, e a tela já mostra o card na coluna nova.
4. A store persiste cada operação pelo repositório, em ordem, numa fila.
5. O indicador do header vai de "Salvando…" para "Salvo". Se falhar, um aviso aparece.

A regra fica no domínio. "Mover de etapa gera um andamento" continua valendo seja qual for o banco.

### O caminho de uma leitura

Os hooks de `src/hooks/useStore.ts` assinam a store com `useSyncExternalStore`. A store só troca a
referência da coleção que mudou. Uma tarefa nova re-renderiza quem lê tarefas, não quem lê a
configuração.

## Trocar o armazenamento por um banco compartilhado

Hoje cada navegador tem os próprios dados. Para todos verem a mesma coisa:

1. Escreva um adaptador em `src/data/adapters/<nome>/` que implemente `CxRepository`
   (`src/data/repository.ts`):
   - `carregar()` busca tudo;
   - `salvarX` / `removerX` gravam uma entidade;
   - `arquivos` guarda os anexos;
   - `observar()` avisa quando outra pessoa mudou algo (tempo real ou polling).
2. Troque a linha de `src/data/index.ts`:
   ```ts
   const repositorio = criarRepositorioLocal();   // hoje
   const repositorio = criarRepositorioSupabase(); // por exemplo
   ```
3. Nenhuma tela muda.

Pontos de atenção para um banco compartilhado:

- **Código sequencial (CX-001).** Hoje é calculado no navegador a partir de `meta.proximoNumero`.
  Com várias pessoas gravando ao mesmo tempo, o próximo número precisa vir do servidor, de uma
  sequence ou transação, para não haver dois CX-015.
- **Conflitos de edição.** O adaptador local grava a entidade inteira. Num banco remoto, vale gravar
  por entidade com `atualizadoEm` e avisar quando outra pessoa alterou o mesmo processo.
- **Arquivos.** O IndexedDB vira um storage de objetos, como um bucket do Supabase ou uma pasta no
  servidor do TI.
- **Acesso.** Sem login nesta versão, o controle de quem entra é do Funcionário Online. Um banco
  aberto na internet precisa de regra de acesso; converse com o TI sobre a LGPD.
- **Migração.** Um backup exportado desta versão (`.json`) é a carga inicial natural do banco
  novo. O formato está em [DADOS.md](DADOS.md).

Opções avaliadas:

| Opção | Prós | Contras |
|---|---|---|
| Banco em nuvem pronto (Supabase, Firebase) | rápido de ligar; tempo real; guarda arquivos | dados em servidor de terceiros (LGPD, aval do TI) |
| Servidor da instituição (API do TI) | controle total; caminho natural para integrar com o Lyceum | depende da agenda do TI |
| Microsoft 365 (listas do SharePoint) | dados no ambiente da instituição | exige login Microsoft |

## Preferências do navegador

Tema, "quem sou eu" e preferências de interface (sidebar recolhida, lista ou quadro) **não** são
dados do sistema. Continuam sendo deste navegador mesmo com um banco compartilhado. Por isso vivem
em `services/preferencias.ts` e `services/identidade.ts`, fora do repositório.

## Rotas

Roteador próprio por hash (`src/app/router.ts`), sem dependência:

| Rota | Tela |
|---|---|
| `#/` | Painel |
| `#/meu-trabalho` | Meu trabalho (processos e tarefas de quem está usando) |
| `#/demandas`, `#/demandas/<id>` | Caixa de demandas; o id abre o painel lateral da demanda |
| `#/notas`, `#/notas/<id>` | Notas da equipe; o id abre o editor da nota |
| `#/relatorio` | Relatório geral para a diretoria, sem shell (para imprimir) |
| `#/processos?etapa=…&situacao=…` | Lista e quadro, com os filtros na URL |
| `#/processos/CX-001` | Detalhe (aba Visão geral) |
| `#/processos/CX-001/tarefas` | Detalhe, outras abas: `antes-e-depois`, `andamentos`, `anexos` |
| `#/processos/CX-001/comparacao` | Comparação antes e depois, sem shell (para projetar) |
| `#/processos/CX-001/resumo` | Resumo para impressão |
| `#/configuracoes/equipe` | Configurações, por seção |

Nenhuma tela monta rota à mão. Todas usam `rotas.*` de `router.ts`.
