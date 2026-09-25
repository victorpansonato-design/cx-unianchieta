/**
 * O lado do TI.
 *
 * O CX encaminha o processo movendo-o para uma etapa marcada como "TI" (o
 * sinal da etapa). A partir daí ele aparece na Fila do TI. Alguém do TI puxa o
 * processo para si, e o CX passa a ver quem está com ele.
 *
 * O TI nunca muda a etapa: só o status dele (em desenvolvimento → pronto para
 * validar), a previsão de entrega, o link e os anexos da entrega. Quem decide
 * avançar é o CX. "Na fila" não se escolhe: é o estado de quando ninguém do TI
 * está com o processo.
 *
 * Funções puras: recebem o snapshot, devolvem as Ops.
 */
import { agoraISO, formatarData } from '../lib/dates';
import type { Op } from '../data/ops';
import type { Autor, Config, DateOnly, ID, Processo, Snapshot, StatusTi, TrabalhoTi } from '../data/types';
import { andamentoAutomatico } from './andamentos';
import { etapaDe, estaAtivo } from './processos';

export const STATUS_TI: ReadonlyArray<{ id: StatusTi; nome: string }> = [
  { id: 'fila', nome: 'Na fila do TI' },
  { id: 'desenvolvimento', nome: 'Em desenvolvimento' },
  { id: 'validar', nome: 'Pronto para validar' },
];

export function nomeStatusTi(status: StatusTi): string {
  return STATUS_TI.find((x) => x.id === status)?.nome ?? STATUS_TI[0].nome;
}

/** O processo está numa etapa do TI e ativo: aparece na fila. */
export function estaComTi(s: Snapshot, p: Processo): boolean {
  return estaAtivo(p) && etapaDe(s.config, p.etapaId)?.sinal === 'ti';
}

/** O TI já trabalhou nele, mas ele saiu das etapas do TI. */
export function foiEntreguePeloTi(s: Snapshot, p: Processo): boolean {
  return p.ti.responsaveisIds.length > 0 && !estaComTi(s, p);
}

export function nomesTi(p: Processo, config: Config): string[] {
  return p.ti.responsaveisIds
    .map((id) => config.equipeTi.find((m) => m.id === id)?.nome)
    .filter((n): n is string => Boolean(n));
}

/** Quando o processo entrou na fila do TI desta vez (a última entrada numa etapa do TI). */
export function entradaNaFila(s: Snapshot, p: Processo): string | null {
  let entrada: string | null = null;
  let anteriorEraTi = false;
  for (const h of p.historicoEtapas) {
    const ti = etapaDe(s.config, h.etapaId)?.sinal === 'ti';
    if (ti && !anteriorEraTi) entrada = h.entrada;
    anteriorEraTi = ti;
  }
  return entrada;
}

export interface FilaDoTi {
  semNinguem: Processo[];
  comigo: Processo[];
  comOutros: Processo[];
}

/** A fila vista por uma pessoa do TI. Dentro de cada grupo, o que entrou antes vem antes. */
export function filaDoTi(s: Snapshot, pessoaId: ID | null): FilaDoTi {
  const naFila = s.processos
    .filter((p) => estaComTi(s, p))
    .sort((a, b) => (entradaNaFila(s, a) ?? a.criadoEm).localeCompare(entradaNaFila(s, b) ?? b.criadoEm));
  return {
    semNinguem: naFila.filter((p) => p.ti.responsaveisIds.length === 0),
    comigo: naFila.filter((p) => pessoaId !== null && p.ti.responsaveisIds.includes(pessoaId)),
    comOutros: naFila.filter(
      (p) => p.ti.responsaveisIds.length > 0 && (pessoaId === null || !p.ti.responsaveisIds.includes(pessoaId)),
    ),
  };
}

/** Os que o TI já entregou, o mais recente primeiro. */
export function entreguesPeloTi(s: Snapshot): Processo[] {
  return s.processos
    .filter((p) => foiEntreguePeloTi(s, p))
    .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
}

/* -- Escrita --------------------------------------------------------------- */

/** Muda o lado do TI e registra o andamento. `mudar` devolve null quando não há o que mudar. */
function comTi(
  s: Snapshot,
  processoId: ID,
  mudar: (ti: TrabalhoTi, p: Processo) => TrabalhoTi | null,
  texto: (p: Processo) => string,
  autor: Autor,
): Op[] {
  const p = s.processos.find((x) => x.id === processoId);
  if (!p) return [];
  const ti = mudar(p.ti, p);
  if (!ti) return [];
  const agora = agoraISO();
  return [
    { tipo: 'processo', valor: { ...p, ti, atualizadoEm: agora } },
    { tipo: 'andamento', valor: andamentoAutomatico(p.id, 'ti', texto(p), autor, agora) },
  ];
}

/** Alguém do TI puxa o processo para si. Da fila, ele vai para "Em desenvolvimento". */
export function puxar(s: Snapshot, processoId: ID, pessoaTiId: ID, autor: Autor): Op[] {
  return comTi(
    s,
    processoId,
    (ti) =>
      ti.responsaveisIds.includes(pessoaTiId)
        ? null
        : {
            ...ti,
            responsaveisIds: [...ti.responsaveisIds, pessoaTiId],
            status: ti.status === 'fila' ? 'desenvolvimento' : ti.status,
          },
    (p) =>
      p.ti.responsaveisIds.length === 0
        ? 'Puxou o processo para o TI.'
        : 'Entrou no processo, junto com o TI que já estava nele.',
    autor,
  );
}

/** Sai do processo. Sem mais ninguém do TI, ele volta para a fila. */
export function soltar(s: Snapshot, processoId: ID, pessoaTiId: ID, autor: Autor): Op[] {
  return comTi(
    s,
    processoId,
    (ti) => {
      if (!ti.responsaveisIds.includes(pessoaTiId)) return null;
      const responsaveisIds = ti.responsaveisIds.filter((id) => id !== pessoaTiId);
      return { ...ti, responsaveisIds, status: responsaveisIds.length ? ti.status : 'fila' };
    },
    (p) =>
      p.ti.responsaveisIds.length <= 1
        ? 'Devolveu o processo para a fila do TI.'
        : 'Saiu do processo no TI.',
    autor,
  );
}

/** Em desenvolvimento ↔ pronto para validar. "Na fila" não se escolhe. */
export function definirStatus(s: Snapshot, processoId: ID, status: Exclude<StatusTi, 'fila'>, autor: Autor): Op[] {
  return comTi(
    s,
    processoId,
    (ti) => (ti.status === status || ti.responsaveisIds.length === 0 ? null : { ...ti, status }),
    (p) =>
      status === 'validar'
        ? 'Marcou a entrega como pronta para o CX validar.'
        : `Status do TI: “${nomeStatusTi(p.ti.status)}” → “${nomeStatusTi(status)}”.`,
    autor,
  );
}

export function definirPrevisao(s: Snapshot, processoId: ID, previsao: DateOnly | null, autor: Autor): Op[] {
  return comTi(
    s,
    processoId,
    (ti) => (ti.previsao === previsao ? null : { ...ti, previsao }),
    (p) =>
      previsao
        ? p.ti.previsao
          ? `Previsão de entrega do TI mudou de ${formatarData(p.ti.previsao)} para ${formatarData(previsao)}.`
          : `Previsão de entrega do TI: ${formatarData(previsao)}.`
        : 'Previsão de entrega do TI removida.',
    autor,
  );
}

/** O link não vira andamento: é um campo que se ajusta várias vezes. */
export function definirLink(s: Snapshot, processoId: ID, link: string): Op[] {
  const p = s.processos.find((x) => x.id === processoId);
  const limpo = link.trim();
  if (!p || p.ti.link === limpo) return [];
  return [{ tipo: 'processo', valor: { ...p, ti: { ...p.ti, link: limpo }, atualizadoEm: agoraISO() } }];
}
