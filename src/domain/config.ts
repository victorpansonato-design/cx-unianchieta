/**
 * Regras das listas configuráveis e do fluxo de etapas.
 *
 * Funções puras: recebem a configuração (e o snapshot, quando precisam saber
 * o que está em uso) e devolvem a configuração nova — ou o motivo pelo qual a
 * mudança não pode acontecer, já em texto para a tela.
 */
import { uid } from '../lib/ids';
import { normalizar } from '../lib/text';
import type { Config, Etapa, ID, ItemLista, ListaConfig, Membro, Snapshot } from '../data/types';

export type Resultado<T> = { ok: true; valor: T } | { ok: false; motivo: string };

const ok = <T>(valor: T): Resultado<T> => ({ ok: true, valor });
const falha = <T>(motivo: string): Resultado<T> => ({ ok: false, motivo });

/** Textos por lista, para mensagens de validação. */
export const NOMES_LISTA: Record<ListaConfig, { artigo: string; singular: string }> = {
  membros: { artigo: 'uma', singular: 'pessoa' },
  equipeTi: { artigo: 'uma', singular: 'pessoa do TI' },
  setores: { artigo: 'um', singular: 'setor' },
  origens: { artigo: 'uma', singular: 'origem' },
  prioridades: { artigo: 'um', singular: 'nível de prioridade' },
  impactos: { artigo: 'um', singular: 'nível de impacto' },
};

/* -- Leitura --------------------------------------------------------------- */

export function ativos<T extends ItemLista>(lista: T[]): T[] {
  return lista.filter((x) => !x.arquivado);
}

export function arquivados<T extends ItemLista>(lista: T[]): T[] {
  return lista.filter((x) => x.arquivado);
}

/** Nome de um item, mesmo arquivado — o registro antigo continua legível. */
export function nomeDe(lista: ItemLista[], id: ID | null | undefined): string | null {
  if (!id) return null;
  return lista.find((x) => x.id === id)?.nome ?? null;
}

/** Listas de pessoas: têm função, além do nome. */
export function ehListaDePessoas(lista: ListaConfig): lista is 'membros' | 'equipeTi' {
  return lista === 'membros' || lista === 'equipeTi';
}

/** Quantos processos usam este item (para membros, também as tarefas atribuídas). */
export function contarUso(s: Snapshot, lista: ListaConfig, id: ID): number {
  if (lista === 'equipeTi') return s.processos.filter((p) => p.ti.responsaveisIds.includes(id)).length;
  if (lista === 'membros') {
    const processos = s.processos.filter((p) => p.responsaveisIds.includes(id)).length;
    const tarefas = s.tarefas.filter((t) => t.responsavelId === id).length;
    return processos + tarefas;
  }
  const campo = {
    setores: 'setorId',
    origens: 'origemId',
    prioridades: 'prioridadeId',
    impactos: 'impactoId',
  } as const satisfies Record<Exclude<ListaConfig, 'membros' | 'equipeTi'>, keyof Snapshot['processos'][number]>;
  const emProcessos = s.processos.filter((p) => p[campo[lista]] === id).length;
  const emDemandas =
    lista === 'setores' || lista === 'origens'
      ? s.demandas.filter((d) => (lista === 'setores' ? d.setorId : d.origemId) === id).length
      : 0;
  return emProcessos + emDemandas;
}

export function processosNaEtapa(s: Snapshot, etapaId: ID): number {
  return s.processos.filter((p) => p.etapaId === etapaId).length;
}

/** O nível mais alto (último da lista ativa) é o único destacado. */
export function ehNivelMaisAlto(lista: ItemLista[], id: ID | null): boolean {
  if (!id) return false;
  const lista_ = ativos(lista);
  return lista_.length > 1 && lista_[lista_.length - 1].id === id;
}

export type GrauNivel = 'alto' | 'medio' | 'baixo';

/**
 * Grau de um nível pela posição na lista ativa: o último é alto, o primeiro é
 * baixo, os do meio são médios. Vem da ordem, não do nome, para continuar
 * certo se a equipe renomear ou acrescentar níveis. Arquivado ou lista de um
 * item só: sem grau.
 */
export function grauDoNivel(lista: ItemLista[], id: ID | null): GrauNivel | null {
  if (!id) return null;
  const escala = ativos(lista);
  const i = escala.findIndex((x) => x.id === id);
  if (i < 0 || escala.length < 2) return null;
  if (i === escala.length - 1) return 'alto';
  return i === 0 ? 'baixo' : 'medio';
}

export function etapaFinal(config: Config): Etapa {
  return config.etapas[config.etapas.length - 1];
}

/* -- Etapas ---------------------------------------------------------------- */

/** Nova etapa entra ANTES da última, que é a que encerra o processo. */
export function adicionarEtapa(config: Config): { config: Config; id: ID } {
  const id = uid();
  const nova: Etapa = { id, nome: 'Nova etapa', descricao: '', sinal: null, tarefasPadrao: [] };
  const etapas = [...config.etapas];
  etapas.splice(Math.max(etapas.length - 1, 0), 0, nova);
  return { config: { ...config, etapas }, id };
}

export function atualizarEtapa(
  config: Config,
  id: ID,
  parcial: Partial<Omit<Etapa, 'id'>>,
): Resultado<Config> {
  if (parcial.nome !== undefined) {
    const nome = parcial.nome.trim();
    if (!nome) return falha('A etapa precisa de um nome.');
    const repetido = config.etapas.some(
      (e) => e.id !== id && normalizar(e.nome) === normalizar(nome),
    );
    if (repetido) return falha('Já existe uma etapa com esse nome.');
    parcial = { ...parcial, nome };
  }
  return ok({
    ...config,
    etapas: config.etapas.map((e) => (e.id === id ? { ...e, ...parcial } : e)),
  });
}

export function moverEtapa(config: Config, id: ID, direcao: -1 | 1): Config {
  return { ...config, etapas: mover(config.etapas, id, direcao) };
}

export function removerEtapa(s: Snapshot, id: ID): Resultado<Config> {
  const { config } = s;
  if (config.etapas.length <= 2) {
    return falha('O fluxo precisa de pelo menos duas etapas: uma para começar e outra para encerrar.');
  }
  const emUso = processosNaEtapa(s, id);
  if (emUso > 0) {
    return falha(
      emUso === 1
        ? 'Há 1 processo nesta etapa. Mova-o para outra etapa antes de removê-la.'
        : `Há ${emUso} processos nesta etapa. Mova-os para outra etapa antes de removê-la.`,
    );
  }
  return ok({ ...config, etapas: config.etapas.filter((e) => e.id !== id) });
}

/* -- Listas ---------------------------------------------------------------- */

function mover<T extends { id: ID }>(lista: T[], id: ID, direcao: -1 | 1): T[] {
  const i = lista.findIndex((x) => x.id === id);
  const j = i + direcao;
  if (i === -1 || j < 0 || j >= lista.length) return lista;
  const copia = lista.slice();
  [copia[i], copia[j]] = [copia[j], copia[i]];
  return copia;
}

function nomeRepetido(lista: ItemLista[], nome: string, ignorarId?: ID): boolean {
  const alvo = normalizar(nome);
  return lista.some((x) => x.id !== ignorarId && !x.arquivado && normalizar(x.nome) === alvo);
}

export function adicionarItem(
  config: Config,
  lista: ListaConfig,
  dados: { nome: string; funcao?: string },
): Resultado<{ config: Config; id: ID }> {
  const nome = dados.nome.trim();
  const { artigo, singular } = NOMES_LISTA[lista];
  if (!nome) return falha('Informe o nome.');
  if (nomeRepetido(config[lista], nome)) return falha(`Já existe ${artigo} ${singular} com esse nome.`);
  const id = uid();
  const item: ItemLista | Membro =
    ehListaDePessoas(lista) ? { id, nome, funcao: (dados.funcao ?? '').trim() } : { id, nome };
  return ok({ config: { ...config, [lista]: [...config[lista], item] }, id });
}

export function atualizarItem(
  config: Config,
  lista: ListaConfig,
  id: ID,
  parcial: { nome?: string; funcao?: string },
): Resultado<Config> {
  const { artigo, singular } = NOMES_LISTA[lista];
  const mudanca: { nome?: string; funcao?: string } = {};
  if (parcial.nome !== undefined) {
    const nome = parcial.nome.trim();
    if (!nome) return falha('O nome não pode ficar vazio.');
    if (nomeRepetido(config[lista], nome, id)) return falha(`Já existe ${artigo} ${singular} com esse nome.`);
    mudanca.nome = nome;
  }
  if (parcial.funcao !== undefined && ehListaDePessoas(lista)) mudanca.funcao = parcial.funcao.trim();
  return ok({
    ...config,
    [lista]: (config[lista] as ItemLista[]).map((x) => (x.id === id ? { ...x, ...mudanca } : x)),
  });
}

/**
 * Remove um item. Se algum processo usa o item, ele é ARQUIVADO — some dos
 * seletores, mas o nome continua aparecendo onde já foi usado.
 */
export function removerItem(
  s: Snapshot,
  lista: ListaConfig,
  id: ID,
): { config: Config; arquivado: boolean } {
  const emUso = contarUso(s, lista, id) > 0;
  const atual = s.config[lista] as ItemLista[];
  const nova = emUso
    ? atual.map((x) => (x.id === id ? { ...x, arquivado: true } : x))
    : atual.filter((x) => x.id !== id);
  return { config: { ...s.config, [lista]: nova }, arquivado: emUso };
}

export function restaurarItem(config: Config, lista: ListaConfig, id: ID): Resultado<Config> {
  const item = (config[lista] as ItemLista[]).find((x) => x.id === id);
  if (!item) return falha('Item não encontrado.');
  const { artigo, singular } = NOMES_LISTA[lista];
  if (nomeRepetido(config[lista], item.nome, id)) {
    return falha(`Já existe ${artigo} ${singular} ativo com esse nome. Renomeie antes de restaurar.`);
  }
  return ok({
    ...config,
    [lista]: (config[lista] as ItemLista[]).map((x) => {
      if (x.id !== id) return x;
      const restaurado = { ...x };
      delete restaurado.arquivado;
      return restaurado;
    }),
  });
}

export function moverItem(config: Config, lista: ListaConfig, id: ID, direcao: -1 | 1): Config {
  return { ...config, [lista]: mover(config[lista] as ItemLista[], id, direcao) };
}
