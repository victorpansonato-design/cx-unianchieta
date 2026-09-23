/**
 * Números e listas do painel — e do "Meu trabalho", que é o mesmo recorte
 * aplicado a uma pessoa.
 */
import { diasEntre, hoje, somarDias } from '../lib/dates';
import type { Andamento, ID, Processo, Snapshot, Tarefa } from '../data/types';
import { temSinal } from './filtros';
import { diasDeAtraso, diasNaEtapa, estaAtivo, estaVencido } from './processos';
import { tarefaAtrasada } from './tarefas';

export interface PrazoProximo {
  chave: string;
  tipo: 'processo' | 'tarefa';
  data: string;
  processo: Processo;
  tarefa?: Tarefa;
}

export interface ResumoPainel {
  ativos: Processo[];
  vencidos: Array<{ processo: Processo; dias: number }>;
  aguardandoDiretoria: Processo[];
  comTi: Processo[];
  concluidosNoAno: number;
  porEtapa: Array<{ etapaId: ID; nome: string; total: number }>;
  proximosPrazos: PrazoProximo[];
  maisTempoNaEtapa: Array<{ processo: Processo; dias: number }>;
  atividade: Andamento[];
  demandasNovas: number;
}

/** Janela de "próximos prazos": hoje e os próximos 7 dias. */
export const JANELA_PRAZOS = 7;

export function resumoPainel(s: Snapshot, referencia: string = hoje(), recorte?: (p: Processo) => boolean): ResumoPainel {
  const processos = recorte ? s.processos.filter(recorte) : s.processos;
  const ids = new Set(processos.map((p) => p.id));
  const ativos = processos.filter(estaAtivo);
  const ano = referencia.slice(0, 4);
  const limite = somarDias(referencia, JANELA_PRAZOS);

  const vencidos = ativos
    .filter((p) => estaVencido(p, referencia))
    .map((processo) => ({ processo, dias: diasDeAtraso(processo, referencia) }))
    .sort((a, b) => b.dias - a.dias);

  const porEtapa = s.config.etapas.map((e) => ({
    etapaId: e.id,
    nome: e.nome,
    total: processos.filter((p) => p.etapaId === e.id && p.situacao !== 'cancelado').length,
  }));

  const prazos: PrazoProximo[] = [];
  for (const p of ativos) {
    if (p.prazo && p.prazo >= referencia && p.prazo <= limite) {
      prazos.push({ chave: `p-${p.id}`, tipo: 'processo', data: p.prazo, processo: p });
    }
  }
  const porId = new Map(processos.map((p) => [p.id, p]));
  for (const t of s.tarefas) {
    const p = porId.get(t.processoId);
    if (!p || !estaAtivo(p) || t.concluida || !t.prazo) continue;
    if (t.prazo <= limite && (t.prazo >= referencia || tarefaAtrasada(t, referencia))) {
      prazos.push({ chave: `t-${t.id}`, tipo: 'tarefa', data: t.prazo, processo: p, tarefa: t });
    }
  }
  prazos.sort((a, b) => (a.data !== b.data ? (a.data < b.data ? -1 : 1) : a.tipo.localeCompare(b.tipo)));

  const maisTempoNaEtapa = ativos
    .map((processo) => ({ processo, dias: diasNaEtapa(processo, referencia) ?? 0 }))
    .filter((x) => x.dias > 0)
    .sort((a, b) => b.dias - a.dias)
    .slice(0, 5);

  const atividade = s.andamentos
    .filter((a) => ids.has(a.processoId))
    .sort((a, b) => b.quando.localeCompare(a.quando))
    .slice(0, 8);

  return {
    ativos,
    vencidos,
    aguardandoDiretoria: ativos.filter((p) => temSinal(s, p, 'diretoria')),
    comTi: ativos.filter((p) => temSinal(s, p, 'ti')),
    concluidosNoAno: processos.filter((p) => p.situacao === 'concluido' && p.conclusao?.startsWith(ano)).length,
    porEtapa,
    proximosPrazos: prazos,
    maisTempoNaEtapa,
    atividade,
    demandasNovas: s.demandas.filter((d) => d.status === 'nova').length,
  };
}

/** Rótulo relativo de um prazo: "hoje", "amanhã", "em 3 dias", "há 2 dias". */
export function rotuloPrazo(data: string, referencia: string = hoje()): string {
  const d = diasEntre(referencia, data);
  if (d === 0) return 'hoje';
  if (d === 1) return 'amanhã';
  if (d > 1) return `em ${d} dias`;
  if (d === -1) return 'ontem';
  return `há ${-d} dias`;
}
