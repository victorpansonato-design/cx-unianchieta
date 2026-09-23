/**
 * Tarefas: o checklist do processo, com responsável, prazo e etapa.
 *
 * Tarefas padrão: cada etapa pode ter uma lista (Configurações → Etapas) que
 * entra sozinha no checklist quando o processo chega nela. Uma tarefa padrão
 * que já existe naquela etapa não é criada de novo — voltar a uma etapa não
 * duplica o checklist.
 */
import { agoraISO, hoje } from '../lib/dates';
import { uid } from '../lib/ids';
import { normalizar } from '../lib/text';
import type { Op } from '../data/ops';
import type { Autor, Config, Etapa, ID, Snapshot, Tarefa } from '../data/types';
import { andamentoAutomatico } from './andamentos';

export interface DadosTarefa {
  titulo: string;
  responsavelId?: ID | null;
  responsavelExterno?: string;
  prazo?: string | null;
  etapaId?: ID | null;
}

export function novaTarefa(processoId: ID, dados: DadosTarefa, agora: string = agoraISO(), padrao = false): Tarefa {
  return {
    id: uid(),
    processoId,
    titulo: dados.titulo.trim(),
    responsavelId: dados.responsavelId ?? null,
    responsavelExterno: dados.responsavelId ? '' : (dados.responsavelExterno ?? '').trim(),
    prazo: dados.prazo ?? null,
    etapaId: dados.etapaId ?? null,
    concluida: false,
    concluidaEm: null,
    concluidaPor: null,
    padrao,
    criadaEm: agora,
  };
}

/** Tarefas padrão da etapa que o processo ainda não tem. */
export function tarefasPadraoPara(s: Snapshot, processoId: ID, etapa: Etapa, agora: string): Tarefa[] {
  const existentes = new Set(
    s.tarefas.filter((t) => t.processoId === processoId && t.etapaId === etapa.id).map((t) => normalizar(t.titulo)),
  );
  return etapa.tarefasPadrao
    .map((titulo) => titulo.trim())
    .filter((titulo) => titulo && !existentes.has(normalizar(titulo)))
    .map((titulo) => novaTarefa(processoId, { titulo, etapaId: etapa.id }, agora, true));
}

export function tarefasDoProcesso(s: Snapshot, processoId: ID): Tarefa[] {
  return s.tarefas.filter((t) => t.processoId === processoId);
}

export function tarefasAbertasDaEtapa(s: Snapshot, processoId: ID, etapaId: ID): Tarefa[] {
  return s.tarefas.filter((t) => t.processoId === processoId && t.etapaId === etapaId && !t.concluida);
}

export function tarefaAtrasada(t: Tarefa, referencia: string = hoje()): boolean {
  return !t.concluida && t.prazo !== null && t.prazo < referencia;
}

/** Nome de quem faz a tarefa: o membro (mesmo arquivado) ou o nome externo. */
export function responsavelDaTarefa(t: Tarefa, config: Config): string | null {
  if (t.responsavelId) return config.membros.find((m) => m.id === t.responsavelId)?.nome ?? null;
  return t.responsavelExterno || null;
}

/** Abertas primeiro (por prazo, sem prazo no fim), depois as concluídas. */
export function ordenarTarefas(lista: Tarefa[]): Tarefa[] {
  return [...lista].sort((a, b) => {
    if (a.concluida !== b.concluida) return a.concluida ? 1 : -1;
    if (a.concluida) return (b.concluidaEm ?? '').localeCompare(a.concluidaEm ?? '');
    if (a.prazo && b.prazo && a.prazo !== b.prazo) return a.prazo < b.prazo ? -1 : 1;
    if (a.prazo !== b.prazo) return a.prazo ? -1 : 1;
    return a.criadaEm.localeCompare(b.criadaEm);
  });
}

export function alternarConclusao(s: Snapshot, tarefaId: ID, concluida: boolean, autor: Autor): Op[] {
  const t = s.tarefas.find((x) => x.id === tarefaId);
  if (!t || t.concluida === concluida) return [];
  const agora = agoraISO();
  const atualizada: Tarefa = concluida
    ? { ...t, concluida: true, concluidaEm: agora, concluidaPor: autor.nome }
    : { ...t, concluida: false, concluidaEm: null, concluidaPor: null };
  const ops: Op[] = [{ tipo: 'tarefa', valor: atualizada }];
  if (concluida) {
    ops.push({
      tipo: 'andamento',
      valor: andamentoAutomatico(t.processoId, 'tarefa-concluida', `Concluiu a tarefa “${t.titulo}”.`, autor, agora),
    });
  }
  return ops;
}

export function atualizarTarefa(s: Snapshot, tarefaId: ID, parcial: Partial<DadosTarefa>): Op[] {
  const t = s.tarefas.find((x) => x.id === tarefaId);
  if (!t) return [];
  const atualizada: Tarefa = { ...t };
  if (parcial.titulo !== undefined) atualizada.titulo = parcial.titulo.trim() || t.titulo;
  if (parcial.prazo !== undefined) atualizada.prazo = parcial.prazo;
  if (parcial.etapaId !== undefined) atualizada.etapaId = parcial.etapaId;
  if (parcial.responsavelId !== undefined || parcial.responsavelExterno !== undefined) {
    atualizada.responsavelId = parcial.responsavelId ?? null;
    atualizada.responsavelExterno = parcial.responsavelId ? '' : (parcial.responsavelExterno ?? '').trim();
  }
  return [{ tipo: 'tarefa', valor: atualizada }];
}
