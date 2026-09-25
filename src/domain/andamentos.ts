/**
 * Andamentos: a linha do tempo do processo.
 *
 * Manuais são o que a equipe registra (nota, reunião, decisão, retornos).
 * Automáticos nascem das próprias ações — criar, mudar de etapa, de situação,
 * de responsáveis, de prazo, anexar, concluir tarefa, o que o TI faz — e não
 * se editam.
 */
import { agoraISO } from '../lib/dates';
import { uid } from '../lib/ids';
import type { Andamento, Autor, ID, TipoAndamento, TipoAndamentoAuto, TipoAndamentoManual } from '../data/types';

export const TIPOS_MANUAIS: ReadonlyArray<{ id: TipoAndamentoManual; nome: string }> = [
  { id: 'nota', nome: 'Nota' },
  { id: 'reuniao', nome: 'Reunião' },
  { id: 'decisao', nome: 'Decisão' },
  { id: 'retorno-diretoria', nome: 'Retorno da diretoria' },
  { id: 'retorno-ti', nome: 'Retorno do TI' },
];

export const NOME_TIPO: Record<TipoAndamento, string> = {
  nota: 'Nota',
  reuniao: 'Reunião',
  decisao: 'Decisão',
  'retorno-diretoria': 'Retorno da diretoria',
  'retorno-ti': 'Retorno do TI',
  criacao: 'Criação',
  etapa: 'Mudança de etapa',
  situacao: 'Mudança de situação',
  responsavel: 'Responsáveis',
  anexo: 'Anexo',
  'tarefa-concluida': 'Tarefa concluída',
  prazo: 'Prazo',
  ti: 'TI',
};

export function andamentoAutomatico(
  processoId: ID,
  tipo: TipoAndamentoAuto,
  texto: string,
  autor: Autor,
  quando: string = agoraISO(),
): Andamento {
  return { id: uid(), processoId, tipo, texto, quando, autor, automatico: true, criadoEm: quando };
}

export function andamentoManual(
  processoId: ID,
  tipo: TipoAndamentoManual,
  texto: string,
  autor: Autor,
  quando: string,
): Andamento {
  return { id: uid(), processoId, tipo, texto: texto.trim(), quando, autor, automatico: false, criadoEm: agoraISO() };
}

/** Mais recentes primeiro. */
export function ordenarAndamentos(lista: Andamento[]): Andamento[] {
  return [...lista].sort((a, b) => (a.quando < b.quando ? 1 : a.quando > b.quando ? -1 : 0));
}
