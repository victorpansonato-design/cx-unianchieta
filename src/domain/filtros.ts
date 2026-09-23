/**
 * Filtros e busca de processos.
 *
 * Os filtros vivem na URL (#/processos?setor=…&rapido=vencidos): dá para
 * mandar o link de uma visão filtrada, e o painel leva direto a uma lista.
 */
import { hoje } from '../lib/dates';
import { combina } from '../lib/text';
import type { ID, Processo, Situacao, Snapshot } from '../data/types';
import { grauDoNivel, nomeDe, type GrauNivel } from './config';
import { etapaDe, estaAtivo, estaVencido, indiceEtapa, nomesResponsaveis } from './processos';

export type FiltroRapido = 'vencidos' | 'diretoria' | 'ti';

export interface FiltrosProcessos {
  q: string;
  etapa: ID | null;
  situacao: Situacao | null;
  setor: ID | null;
  responsavel: ID | null;
  prioridade: ID | null;
  rapido: FiltroRapido | null;
}

export const FILTROS_VAZIOS: FiltrosProcessos = {
  q: '',
  etapa: null,
  situacao: null,
  setor: null,
  responsavel: null,
  prioridade: null,
  rapido: null,
};

const SITUACOES: readonly Situacao[] = ['andamento', 'pausado', 'cancelado', 'concluido'];
const RAPIDOS: readonly FiltroRapido[] = ['vencidos', 'diretoria', 'ti'];

export function lerFiltros(q: URLSearchParams): FiltrosProcessos {
  const situacao = q.get('situacao') as Situacao | null;
  const rapido = q.get('rapido') as FiltroRapido | null;
  return {
    q: q.get('q') ?? '',
    etapa: q.get('etapa'),
    situacao: situacao && SITUACOES.includes(situacao) ? situacao : null,
    setor: q.get('setor'),
    responsavel: q.get('responsavel'),
    prioridade: q.get('prioridade'),
    rapido: rapido && RAPIDOS.includes(rapido) ? rapido : null,
  };
}

export function paraQuery(f: FiltrosProcessos): Record<string, string | undefined> {
  return {
    q: f.q.trim() || undefined,
    etapa: f.etapa ?? undefined,
    situacao: f.situacao ?? undefined,
    setor: f.setor ?? undefined,
    responsavel: f.responsavel ?? undefined,
    prioridade: f.prioridade ?? undefined,
    rapido: f.rapido ?? undefined,
  };
}

export function contarFiltrosAtivos(f: FiltrosProcessos): number {
  return [f.q.trim(), f.etapa, f.situacao, f.setor, f.responsavel, f.prioridade, f.rapido].filter(Boolean).length;
}

/** O processo está numa etapa sinalizada ("aguarda diretoria" / "com o TI") e ativo. */
export function temSinal(s: Snapshot, p: Processo, sinal: 'diretoria' | 'ti'): boolean {
  return estaAtivo(p) && etapaDe(s.config, p.etapaId)?.sinal === sinal;
}

/** Texto em que a busca procura: título, código, setor, responsáveis, tags, Lyceum. */
export function textoBuscavel(s: Snapshot, p: Processo): string {
  return [
    p.codigo,
    p.titulo,
    nomeDe(s.config.setores, p.setorId),
    ...nomesResponsaveis(p, s.config),
    ...p.tags,
    p.lyceum,
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Processos mostra o que está em aberto; os concluídos têm a página deles.
 * Cancelado continua em Processos: não chegou ao fim do fluxo.
 */
export type Escopo = 'abertos' | 'concluidos' | 'todos';

export function noEscopo(p: Processo, escopo: Escopo): boolean {
  if (escopo === 'todos') return true;
  return (p.situacao === 'concluido') === (escopo === 'concluidos');
}

export function filtrarProcessos(
  s: Snapshot,
  f: FiltrosProcessos,
  escopo: Escopo = 'todos',
  referencia: string = hoje(),
): Processo[] {
  return s.processos.filter((p) => {
    if (!noEscopo(p, escopo)) return false;
    if (f.etapa && p.etapaId !== f.etapa) return false;
    if (f.situacao && p.situacao !== f.situacao) return false;
    if (f.setor && p.setorId !== f.setor) return false;
    if (f.responsavel && !p.responsaveisIds.includes(f.responsavel)) return false;
    if (f.prioridade && p.prioridadeId !== f.prioridade) return false;
    if (f.rapido === 'vencidos' && !estaVencido(p, referencia)) return false;
    if (f.rapido === 'diretoria' && !temSinal(s, p, 'diretoria')) return false;
    if (f.rapido === 'ti' && !temSinal(s, p, 'ti')) return false;
    if (f.q.trim() && !combina(f.q, textoBuscavel(s, p))) return false;
    return true;
  });
}

/**
 * Ordem padrão: vencidos primeiro (os mais atrasados em cima), depois por
 * prazo, depois os sem prazo; encerrados no fim.
 */
export function ordenarProcessos(s: Snapshot, lista: Processo[], referencia: string = hoje()): Processo[] {
  const peso = (p: Processo) => (estaVencido(p, referencia) ? 0 : estaAtivo(p) ? (p.prazo ? 1 : 2) : 3);
  return [...lista].sort((a, b) => {
    const pa = peso(a);
    const pb = peso(b);
    if (pa !== pb) return pa - pb;
    if (a.prazo && b.prazo && a.prazo !== b.prazo) return a.prazo < b.prazo ? -1 : 1;
    const ea = indiceEtapa(s.config, a.etapaId);
    const eb = indiceEtapa(s.config, b.etapaId);
    if (ea !== eb) return eb - ea;
    return b.codigo.localeCompare(a.codigo);
  });
}

const ORDEM_GRAU: Record<GrauNivel, number> = { alto: 0, medio: 1, baixo: 2 };

/**
 * Ordem da tela de processos: Alta primeiro, depois Média, depois Baixa, e os
 * sem prioridade no fim. Dentro do mesmo grau vale a ordem padrão (vencidos
 * primeiro, depois por prazo) — o sort é estável.
 */
export function ordenarPorPrioridade(s: Snapshot, lista: Processo[], referencia: string = hoje()): Processo[] {
  const peso = (p: Processo) => {
    const grau = grauDoNivel(s.config.prioridades, p.prioridadeId);
    return grau ? ORDEM_GRAU[grau] : 3;
  };
  return ordenarProcessos(s, lista, referencia).sort((a, b) => peso(a) - peso(b));
}

/** Concluídos: o encerrado mais recentemente primeiro. */
export function ordenarConcluidos(lista: Processo[]): Processo[] {
  return [...lista].sort((a, b) => (b.conclusao ?? b.atualizadoEm).localeCompare(a.conclusao ?? a.atualizadoEm));
}

/** Busca global (⌘K): os processos que combinam, os mais recentes primeiro. */
export function buscarProcessos(s: Snapshot, consulta: string, limite = 8): Processo[] {
  if (!consulta.trim()) return [];
  return s.processos
    .filter((p) => combina(consulta, textoBuscavel(s, p)))
    .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm))
    .slice(0, limite);
}
