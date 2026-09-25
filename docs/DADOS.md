# Modelo de dados

Fonte da verdade: `src/data/types.ts`. Este documento explica o modelo e mostra como ele vira
tabelas quando houver um banco compartilhado.

## Entidades

| Entidade | O que é | Ligação |
|---|---|---|
| `Processo` | um processo que o CX está reestruturando | — |
| `Tarefa` | item do checklist do processo | `processoId`, `etapaId` opcional |
| `Andamento` | registro da linha do tempo (manual ou automático) | `processoId` |
| `Anexo` | metadados de um arquivo; o conteúdo fica no armazenamento de arquivos | `processoId` |
| `Demanda` | o que chegou ao CX e ainda não virou processo (caixa de demandas) | `processoId` quando aceita |
| `Nota` | ata ou anotação da equipe que não pertence a um processo | — |
| `Config` | etapas, equipe CX, equipe do TI, setores, origens, níveis de prioridade e impacto | — |
| `Meta` | versão do schema, próximo número do código, último backup | — |

### Processo

| Campo | Tipo | Observação |
|---|---|---|
| `codigo` | texto | `CX-001`, sequencial, nunca reaproveitado |
| `titulo` | texto | obrigatório |
| `setorId`, `origemId`, `prioridadeId`, `impactoId` | id ou nulo | referências à `Config` |
| `responsaveisIds` | lista de ids | um ou mais membros da equipe CX |
| `envolvidos` | texto livre | pessoas de outros setores |
| `tags` | lista de texto | livres |
| `abertura`, `prazo`, `conclusao` | `AAAA-MM-DD` | datas sem hora, no fuso local |
| `etapaId` | id | etapa atual |
| `historicoEtapas` | `{ etapaId, entrada }[]` | data e hora de entrada em cada etapa, gravada automaticamente |
| `historicoPrazos` | `{ de, para, em, motivo, autor }[]` | cada mudança do prazo depois de criado o processo, com o motivo quando alguém escreve um. É o que conta quantas vezes o prazo foi adiado |
| `situacao` | `andamento` · `pausado` · `cancelado` · `concluido` | paralela à etapa |
| `problema` | `{ descricao, dores, efeitoAluno }` | |
| `antes` | `{ observacoes }` | o diagrama e o BPMN são anexos com contexto `antes-diagrama` / `antes-bpmn` |
| `depois` | `{ passos[], prototipoUrl, observacoes }` | cada passo: `{ nome, responsavel, sistema }` |
| `indicadores` | `{ nome, antes, depois, fonte }[]` | definidos pela equipe; nunca pré-preenchidos |
| `lyceum` | texto | módulo ou rotina do Lyceum envolvida (só registro) |
| `ti` | `{ responsaveisIds, status, previsao, link }` | o lado do TI; ver abaixo |
| `demandaId` | id ou nulo | a demanda da caixa de entrada que originou o processo |

### Lado do TI (`processo.ti`)

- O processo aparece na Fila do TI enquanto está ativo numa etapa com sinal `ti`.
- `responsaveisIds`: pessoas da `config.equipeTi` que puxaram o processo.
- `status`: `fila` (ninguém do TI está com ele) → `desenvolvimento` → `validar` (o TI entregou e espera
  o CX conferir). `fila` não se escolhe: é o estado sem ninguém. O TI **nunca** muda a etapa.
- Voltar para uma etapa do TI depois de `validar` põe o status de novo em `desenvolvimento` (ou `fila`).
- `previsao` (`AAAA-MM-DD`) e `link` são informados pelo TI. Os arquivos da entrega são anexos com
  contexto `ti`.

### Tarefa

- `responsavelId` aponta para um membro da equipe; `responsavelExterno` guarda o nome de alguém de
  fora do CX. Só um dos dois é usado.
- `etapaId` é a etapa da tarefa (opcional). Ao **avançar** de etapa com tarefas abertas daquela
  etapa, o sistema pede confirmação.
- `padrao: true` indica que a tarefa entrou sozinha, a partir das tarefas padrão da etapa.

### Demanda

- `status`: `nova` → `aceita` (vira processo na primeira etapa, com `processoId`) ou `recusada`
  (com `motivoRecusa`). Uma recusada pode ser reaberta.
- `solicitante`: quem pediu (texto livre). `recebidaEm`: `AAAA-MM-DD`.

### Andamento

- `tipo`:
  - manuais: `nota`, `reuniao`, `decisao`, `retorno-diretoria`, `retorno-ti`;
  - automáticos: `criacao`, `etapa`, `situacao`, `responsavel`, `anexo`, `tarefa-concluida`, `prazo`,
    `ti` (puxar, devolver, mudar o status ou a previsão do TI).
- `quando`: o momento em que aconteceu. Nos manuais é editável, porque a reunião pode ter sido ontem.
- `autor`: `{ id, nome }` gravado no momento do registro. Sobrevive à remoção do membro.

### Itens de configuração

Membro, setor, origem e nível têm `{ id, nome, arquivado? }`; o membro tem também `funcao`. Remover
um item em uso **arquiva** em vez de apagar. Ele some das listas de escolha, mas o nome continua
aparecendo onde já foi usado.

A etapa tem `{ id, nome, descricao, sinal, tarefasPadrao }`:
- `sinal` pode ser `diretoria`, `ti` ou nulo, e alimenta o painel;
- `tarefasPadrao` é a lista de títulos que entram no checklist quando um processo chega à etapa;
- a última etapa da lista encerra o processo.

## Armazenamento atual (navegador)

| Onde | Chave | Conteúdo |
|---|---|---|
| localStorage | `cx.v1.db.config` | `Config` |
| localStorage | `cx.v1.db.processos` | `Processo[]` |
| localStorage | `cx.v1.db.tarefas` | `Tarefa[]` |
| localStorage | `cx.v1.db.andamentos` | `Andamento[]` |
| localStorage | `cx.v1.db.anexos` | `Anexo[]` (só metadados) |
| localStorage | `cx.v1.db.demandas` | `Demanda[]` |
| localStorage | `cx.v1.db.notas` | `Nota[]` |
| localStorage | `cx.v1.db.meta` | `Meta` |
| localStorage | `cx.v1.theme` | `"light"` ou `"dark"` (JSON) |
| localStorage | `cx.v1.identidade` | quem está usando este navegador |
| localStorage | `cx.v1.ui` | sidebar recolhida, lista ou quadro |
| localStorage | `cx.v1.novidades` | até quando cada pessoa já viu as novidades neste navegador |
| IndexedDB `cx-anexos` | store `arquivos`, chave = id do anexo | o arquivo (Blob) |

O `v1` é o prefixo do armazenamento, não a versão do schema. A versão do schema fica em
`meta.schemaVersion` (hoje **2**) e sobe sem trocar o prefixo: a migração em `src/data/schema.ts`
(`MIGRACOES`) converte o dado antigo ao abrir e ao importar um backup. Só troque o prefixo se o
próprio armazenamento mudar de forma, e aí a chave do tema no `index.html` sobe junto.

| Versão | O que mudou |
|---|---|
| 1 | primeira versão |
| 2 | acesso do TI (`config.equipeTi`, `processo.ti`, anexo `ti`) e histórico do prazo (`processo.historicoPrazos`) |

## Arquivo de backup

`customer-experience-backup-AAAA-MM-DD.json`:

```json
{
  "formato": "cx-unianchieta-backup",
  "schemaVersion": 2,
  "exportadoEm": "2026-09-23T13:22:00.000Z",
  "exportadoPor": "Nome de quem exportou",
  "dados": { "config": {}, "processos": [], "tarefas": [], "andamentos": [], "anexos": [], "demandas": [], "notas": [], "meta": {} },
  "arquivos": [{ "id": "…", "mime": "application/pdf", "base64": "…" }]
}
```

`arquivos` é `null` quando o backup foi exportado sem anexos. Importar **substitui** todos os dados do
navegador. Isso sempre pede confirmação.

## Como vira tabela (banco futuro)

```
config_etapas     (id, ordem, nome, descricao, sinal)
config_tarefas_padrao (etapa_id, ordem, titulo)
config_membros    (id, nome, funcao, arquivado)
config_equipe_ti  (id, nome, funcao, arquivado)
config_setores    (id, nome, arquivado)            -- idem origens, prioridades (com ordem), impactos (com ordem)
processos         (id, codigo UNIQUE, titulo, setor_id, envolvidos, origem_id,
                   prioridade_id, impacto_id, tags[], abertura, prazo, conclusao, etapa_id,
                   situacao, problema_descricao, problema_dores, problema_efeito_aluno,
                   antes_observacoes, depois_prototipo_url, depois_observacoes, lyceum,
                   ti_status, ti_previsao, ti_link,
                   demanda_id, criado_em, atualizado_em)
processo_responsaveis (processo_id, membro_id)
processo_responsaveis_ti (processo_id, membro_ti_id)
processo_prazos   (processo_id, de, para, em, motivo, autor_id, autor_nome)  -- historicoPrazos
processo_etapas   (processo_id, etapa_id, entrada)          -- historicoEtapas
fluxo_passos      (id, processo_id, ordem, nome, responsavel, sistema)
indicadores       (id, processo_id, nome, antes, depois, fonte)
tarefas           (id, processo_id, titulo, responsavel_id, responsavel_externo, prazo, etapa_id, concluida, concluida_em, concluida_por, padrao, criada_em)
andamentos        (id, processo_id, tipo, texto, quando, autor_id, autor_nome, automatico, criado_em)
anexos            (id, processo_id, nome, mime, tamanho, contexto, adicionado_em, autor_id, autor_nome, caminho_arquivo)
demandas          (id, titulo, descricao, origem_id, setor_id, solicitante, recebida_em, status, motivo_recusa, processo_id, registrada_por_id, registrada_por_nome, criada_em, atualizada_em)
notas             (id, titulo, texto, fixada, autor_id, autor_nome, criada_em, atualizada_em)
```

`codigo` deve ser gerado pelo banco, por uma sequence. Ver ARQUITETURA.md.
