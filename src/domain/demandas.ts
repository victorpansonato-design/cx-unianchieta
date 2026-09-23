/**
 * Caixa de demandas: o que chegou ao CX e ainda não virou processo.
 *
 * Nova → aceita (vira um processo na primeira etapa, com os dados já
 * preenchidos) ou recusada (com o motivo). Uma recusada pode ser reaberta.
 */
import { agoraISO, formatarData, hoje } from '../lib/dates';
import { uid } from '../lib/ids';
import type { Op } from '../data/ops';
import type { Autor, Demanda, ID, Snapshot, StatusDemanda } from '../data/types';
import { criarProcesso, type DadosNovoProcesso } from './processos';

export const STATUS_DEMANDA: ReadonlyArray<{ id: StatusDemanda; nome: string }> = [
  { id: 'nova', nome: 'Nova' },
  { id: 'aceita', nome: 'Virou processo' },
  { id: 'recusada', nome: 'Recusada' },
];

export interface DadosDemanda {
  titulo: string;
  descricao?: string;
  origemId?: ID | null;
  setorId?: ID | null;
  solicitante?: string;
  recebidaEm?: string;
}

export function novaDemanda(dados: DadosDemanda, autor: Autor): Demanda {
  const agora = agoraISO();
  return {
    id: uid(),
    titulo: dados.titulo.trim(),
    descricao: dados.descricao?.trim() ?? '',
    origemId: dados.origemId ?? null,
    setorId: dados.setorId ?? null,
    solicitante: dados.solicitante?.trim() ?? '',
    recebidaEm: dados.recebidaEm ?? hoje(),
    status: 'nova',
    motivoRecusa: '',
    processoId: null,
    registradaPor: autor,
    criadaEm: agora,
    atualizadaEm: agora,
  };
}

export function atualizarDemanda(s: Snapshot, id: ID, parcial: Partial<DadosDemanda>): Op[] {
  const d = s.demandas.find((x) => x.id === id);
  if (!d) return [];
  const atualizada: Demanda = { ...d, ...parcial, atualizadaEm: agoraISO() };
  if (parcial.titulo !== undefined && !parcial.titulo.trim()) atualizada.titulo = d.titulo;
  return [{ tipo: 'demanda', valor: atualizada }];
}

/** Transforma a demanda num processo novo, na primeira etapa do fluxo. */
export function aceitarDemanda(
  s: Snapshot,
  id: ID,
  autor: Autor,
  extras: Pick<DadosNovoProcesso, 'responsaveisIds' | 'prioridadeId' | 'prazo'> = {},
) {
  const d = s.demandas.find((x) => x.id === id);
  if (!d || d.status === 'aceita') return null;
  const quem = d.solicitante ? `, pedida por ${d.solicitante}` : '';
  const { ops, processo } = criarProcesso(
    s,
    {
      titulo: d.titulo,
      setorId: d.setorId,
      origemId: d.origemId,
      descricao: d.descricao,
      envolvidos: d.solicitante,
      demandaId: d.id,
      ...extras,
    },
    autor,
    `Processo criado a partir da demanda “${d.titulo}”${quem}, recebida em ${formatarData(d.recebidaEm)}.`,
  );
  ops.push({
    tipo: 'demanda',
    valor: { ...d, status: 'aceita', processoId: processo.id, motivoRecusa: '', atualizadaEm: agoraISO() },
  });
  return { ops, processo };
}

export function recusarDemanda(s: Snapshot, id: ID, motivo: string): Op[] {
  const d = s.demandas.find((x) => x.id === id);
  if (!d) return [];
  return [{ tipo: 'demanda', valor: { ...d, status: 'recusada', motivoRecusa: motivo.trim(), atualizadaEm: agoraISO() } }];
}

export function reabrirDemanda(s: Snapshot, id: ID): Op[] {
  const d = s.demandas.find((x) => x.id === id);
  if (!d) return [];
  return [{ tipo: 'demanda', valor: { ...d, status: 'nova', motivoRecusa: '', atualizadaEm: agoraISO() } }];
}

/** Mais recentes primeiro. */
export function ordenarDemandas(lista: Demanda[]): Demanda[] {
  return [...lista].sort((a, b) =>
    a.recebidaEm !== b.recebidaEm ? (a.recebidaEm < b.recebidaEm ? 1 : -1) : b.criadaEm.localeCompare(a.criadaEm),
  );
}
