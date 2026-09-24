/**
 * Ações: a única porta de escrita das telas.
 *
 * Cada ação lê o estado atual, pede à regra de negócio (src/domain) as
 * mudanças, e entrega as Ops à store. As telas nunca montam Ops nem falam com
 * o repositório — assim, trocar o armazenamento ou mudar uma regra não mexe
 * em nenhuma tela. O autor de cada registro vem da identidade escolhida.
 */
import {
  store,
  type Config,
  type ContextoAnexo,
  type Etapa,
  type ID,
  type ListaConfig,
  type Nota,
  type Processo,
  type Situacao,
  type TipoAndamentoManual,
} from '../data';
import type { Op } from '../data/ops';
import { andamentoManual } from '../domain/andamentos';
import { novoAnexo } from '../domain/anexos';
import * as regrasConfig from '../domain/config';
import type { Resultado } from '../domain/config';
import * as regrasDemanda from '../domain/demandas';
import * as regrasNota from '../domain/notas';
import * as regrasProcesso from '../domain/processos';
import * as regrasTarefa from '../domain/tarefas';
import { uid } from '../lib/ids';
import { autorAtual } from './identidade';

const snapshot = () => store.getEstado().snapshot;
const autor = () => autorAtual(snapshot().config);
const aplicar = (ops: Op[]) => store.aplicar(ops);

/* -- Configuração ---------------------------------------------------------- */

function salvarConfig(config: Config) {
  return aplicar([{ tipo: 'config', valor: config }]);
}

/** Aplica um Resultado<Config>: grava se deu certo, devolve o motivo se não. */
function aplicarResultado(r: Resultado<Config>): Resultado<null> {
  if (!r.ok) return r;
  void salvarConfig(r.valor);
  return { ok: true, valor: null };
}

export const acoesConfig = {
  adicionarEtapa(): ID {
    const { config, id } = regrasConfig.adicionarEtapa(snapshot().config);
    void salvarConfig(config);
    return id;
  },

  atualizarEtapa(id: ID, parcial: Partial<Omit<Etapa, 'id'>>): Resultado<null> {
    return aplicarResultado(regrasConfig.atualizarEtapa(snapshot().config, id, parcial));
  },

  moverEtapa(id: ID, direcao: -1 | 1) {
    void salvarConfig(regrasConfig.moverEtapa(snapshot().config, id, direcao));
  },

  /** Edita as tarefas padrão da etapa a partir da lista mais recente. */
  editarTarefasPadrao(etapaId: ID, fn: (lista: string[]) => string[]) {
    const etapa = snapshot().config.etapas.find((e) => e.id === etapaId);
    if (!etapa) return;
    const lista = fn(etapa.tarefasPadrao).map((t) => t.trim()).filter(Boolean);
    return aplicarResultado(regrasConfig.atualizarEtapa(snapshot().config, etapaId, { tarefasPadrao: lista }));
  },

  removerEtapa(id: ID): Resultado<null> {
    return aplicarResultado(regrasConfig.removerEtapa(snapshot(), id));
  },

  adicionarItem(lista: ListaConfig, dados: { nome: string; funcao?: string }): Resultado<ID> {
    const r = regrasConfig.adicionarItem(snapshot().config, lista, dados);
    if (!r.ok) return r;
    void salvarConfig(r.valor.config);
    return { ok: true, valor: r.valor.id };
  },

  atualizarItem(lista: ListaConfig, id: ID, parcial: { nome?: string; funcao?: string }): Resultado<null> {
    return aplicarResultado(regrasConfig.atualizarItem(snapshot().config, lista, id, parcial));
  },

  /** Remove (ou arquiva, se estiver em uso). Devolve se foi arquivado. */
  removerItem(lista: ListaConfig, id: ID): { arquivado: boolean } {
    const { config, arquivado } = regrasConfig.removerItem(snapshot(), lista, id);
    void salvarConfig(config);
    return { arquivado };
  },

  restaurarItem(lista: ListaConfig, id: ID): Resultado<null> {
    return aplicarResultado(regrasConfig.restaurarItem(snapshot().config, lista, id));
  },

  moverItem(lista: ListaConfig, id: ID, direcao: -1 | 1) {
    void salvarConfig(regrasConfig.moverItem(snapshot().config, lista, id, direcao));
  },
};

export const acoesMeta = {
  registrarBackup(momento: string) {
    return aplicar([{ tipo: 'meta', valor: { ...snapshot().meta, ultimoBackup: momento } }]);
  },
};

/* -- Processo -------------------------------------------------------------- */

export const acoesProcesso = {
  /** Cria o processo e devolve-o (para navegar até ele). */
  criar(dados: regrasProcesso.DadosNovoProcesso) {
    const { ops, processo } = regrasProcesso.criarProcesso(snapshot(), dados, autor());
    void aplicar(ops);
    return processo;
  },

  atualizar(id: ID, mudanca: regrasProcesso.MudancaProcesso) {
    return aplicar(regrasProcesso.atualizarProcesso(snapshot(), id, mudanca, autor()));
  },

  /**
   * Edita a partir do processo MAIS RECENTE, lido na hora de gravar. Campos que
   * salvam sozinhos (passos do fluxo, indicadores, problema) usam isto para
   * nunca sobrescrever uma edição vizinha com um valor antigo.
   */
  editar(id: ID, fn: (p: Processo) => regrasProcesso.MudancaProcesso) {
    const p = snapshot().processos.find((x) => x.id === id);
    if (!p) return Promise.resolve();
    return aplicar(regrasProcesso.atualizarProcesso(snapshot(), id, fn(p), autor()));
  },

  moverParaEtapa(id: ID, etapaId: ID) {
    return aplicar(regrasProcesso.moverParaEtapa(snapshot(), id, etapaId, autor()));
  },

  definirSituacao(id: ID, situacao: Situacao) {
    return aplicar(regrasProcesso.definirSituacao(snapshot(), id, situacao, autor()));
  },

  reabrir(id: ID, dados: { etapaId: ID; motivo: string; prazo: string | null }) {
    return aplicar(regrasProcesso.reabrirProcesso(snapshot(), id, dados, autor()));
  },

  async remover(id: ID) {
    const { ops, anexoIds } = regrasProcesso.removerProcesso(snapshot(), id);
    await aplicar(ops);
    await Promise.all(anexoIds.map((a) => store.arquivos.remover(a).catch(() => undefined)));
  },
};

/* -- Tarefa ---------------------------------------------------------------- */

export const acoesTarefa = {
  criar(processoId: ID, dados: regrasTarefa.DadosTarefa) {
    if (!dados.titulo.trim()) return;
    void aplicar([{ tipo: 'tarefa', valor: regrasTarefa.novaTarefa(processoId, dados) }]);
  },

  atualizar(id: ID, parcial: Partial<regrasTarefa.DadosTarefa>) {
    void aplicar(regrasTarefa.atualizarTarefa(snapshot(), id, parcial));
  },

  alternar(id: ID, concluida: boolean) {
    void aplicar(regrasTarefa.alternarConclusao(snapshot(), id, concluida, autor()));
  },

  remover(id: ID) {
    void aplicar([{ tipo: 'tarefa-remover', id }]);
  },
};

/* -- Andamento ------------------------------------------------------------- */

export const acoesAndamento = {
  registrar(processoId: ID, tipo: TipoAndamentoManual, texto: string, quando: string) {
    if (!texto.trim()) return;
    void aplicar([{ tipo: 'andamento', valor: andamentoManual(processoId, tipo, texto, autor(), quando) }]);
  },

  editar(id: ID, parcial: { texto?: string; tipo?: TipoAndamentoManual; quando?: string }) {
    const a = snapshot().andamentos.find((x) => x.id === id);
    if (!a || a.automatico) return;
    void aplicar([{ tipo: 'andamento', valor: { ...a, ...parcial, texto: (parcial.texto ?? a.texto).trim() || a.texto } }]);
  },

  remover(id: ID) {
    void aplicar([{ tipo: 'andamento-remover', id }]);
  },
};

/* -- Anexo ----------------------------------------------------------------- */

export const acoesAnexo = {
  /** Guarda os arquivos e registra os anexos. Lança erro com mensagem pronta se falhar. */
  async anexar(processoId: ID, arquivos: File[], contexto: ContextoAnexo) {
    for (const arquivo of arquivos) {
      const { anexo, ops } = novoAnexo(processoId, arquivo, contexto, autor());
      await store.arquivos.salvar(anexo.id, arquivo);
      await aplicar(ops);
    }
  },

  /** Troca o arquivo de uma vaga única (diagrama ou BPMN do cenário atual). */
  async substituir(processoId: ID, contexto: ContextoAnexo, arquivo: File) {
    const antigos = snapshot().anexos.filter((a) => a.processoId === processoId && a.contexto === contexto);
    await acoesAnexo.anexar(processoId, [arquivo], contexto);
    for (const a of antigos) await acoesAnexo.remover(a.id);
  },

  async remover(id: ID) {
    await aplicar([{ tipo: 'anexo-remover', id }]);
    await store.arquivos.remover(id).catch(() => undefined);
  },

  obterArquivo(id: ID) {
    return store.arquivos.obter(id);
  },
};

/* -- Fluxo proposto e indicadores (campos do processo) --------------------- */

export const acoesFluxo = {
  novoPasso() {
    return { id: uid(), nome: '', responsavel: '', sistema: '' };
  },
  novoIndicador() {
    return { id: uid(), nome: '', antes: '', depois: '', fonte: '' };
  },
};

/* -- Demanda --------------------------------------------------------------- */

export const acoesDemanda = {
  registrar(dados: regrasDemanda.DadosDemanda) {
    const d = regrasDemanda.novaDemanda(dados, autor());
    void aplicar([{ tipo: 'demanda', valor: d }]);
    return d;
  },

  atualizar(id: ID, parcial: Partial<regrasDemanda.DadosDemanda>) {
    void aplicar(regrasDemanda.atualizarDemanda(snapshot(), id, parcial));
  },

  /** Transforma em processo. Devolve o processo criado. */
  aceitar(id: ID, extras?: Parameters<typeof regrasDemanda.aceitarDemanda>[3]) {
    const r = regrasDemanda.aceitarDemanda(snapshot(), id, autor(), extras);
    if (!r) return null;
    void aplicar(r.ops);
    return r.processo;
  },

  recusar(id: ID, motivo: string) {
    void aplicar(regrasDemanda.recusarDemanda(snapshot(), id, motivo));
  },

  reabrir(id: ID) {
    void aplicar(regrasDemanda.reabrirDemanda(snapshot(), id));
  },

  remover(id: ID) {
    void aplicar([{ tipo: 'demanda-remover', id }]);
  },
};

/* -- Nota da equipe -------------------------------------------------------- */

export const acoesNota = {
  criar(): Nota {
    const n = regrasNota.novaNota(autor());
    void aplicar([{ tipo: 'nota', valor: n }]);
    return n;
  },

  atualizar(id: ID, parcial: Partial<Pick<Nota, 'titulo' | 'texto' | 'fixada'>>) {
    void aplicar(regrasNota.atualizarNota(snapshot(), id, parcial));
  },

  remover(id: ID) {
    void aplicar([{ tipo: 'nota-remover', id }]);
  },

  /** Apaga as notas deixadas em branco (lido do estado atual, na hora). */
  limparVazias() {
    const vazias = snapshot().notas.filter((n) => !n.titulo.trim() && !n.texto.trim());
    if (vazias.length) void aplicar(vazias.map((n) => ({ tipo: 'nota-remover' as const, id: n.id })));
  },
};
