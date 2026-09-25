/**
 * Novidades: o que outras pessoas fizeram desde a última vez que você olhou.
 *
 * A matéria-prima são os andamentos (tudo que acontece num processo já vira
 * um) e as entradas na fila do TI. O que conta como relevante depende de quem
 * está lendo:
 * - equipe CX: os processos de que a pessoa é responsável, e tudo o que o TI
 *   fez em qualquer processo;
 * - TI: os processos que a pessoa puxou, e o que entrou na fila;
 * - diretoria: todos os processos.
 * O que a própria pessoa fez nunca é novidade para ela. Tarefa concluída
 * também não: é detalhe do dia a dia, e encheria a lista.
 *
 * "Novo" é o que foi REGISTRADO depois da última visita (criadoEm), não o que
 * aconteceu depois: uma reunião de ontem registrada agora é novidade.
 */
import type { ID, ISODateTime, Processo, Snapshot } from '../data/types';
import { entradaNaFila, estaComTi } from './ti';

export interface Leitor {
  tipo: 'membro' | 'ti' | 'diretoria';
  id: ID;
}

export interface Novidade {
  id: string;
  /** Quando foi registrada. É o que decide se é nova. */
  em: ISODateTime;
  processo: Processo;
  texto: string;
  /** Quem fez. Null quando é o sistema (processo entrou na fila). */
  autor: string | null;
}

export function novidadesPara(s: Snapshot, leitor: Leitor, limite = 30): Novidade[] {
  const porId = new Map(s.processos.map((p) => [p.id, p]));
  const doTi = new Set(s.config.equipeTi.map((m) => m.id));

  const relevante = (p: Processo, autorId: ID): boolean => {
    if (leitor.tipo === 'diretoria') return true;
    if (leitor.tipo === 'ti') return p.ti.responsaveisIds.includes(leitor.id);
    return p.responsaveisIds.includes(leitor.id) || doTi.has(autorId);
  };

  const itens: Novidade[] = [];
  for (const a of s.andamentos) {
    if (a.autor.id === leitor.id || a.tipo === 'tarefa-concluida') continue;
    const p = porId.get(a.processoId);
    if (!p || !relevante(p, a.autor.id)) continue;
    itens.push({ id: a.id, em: a.criadoEm, processo: p, texto: a.texto, autor: a.autor.nome });
  }

  if (leitor.tipo === 'ti') {
    for (const p of s.processos) {
      if (!estaComTi(s, p)) continue;
      const entrada = entradaNaFila(s, p);
      if (entrada) itens.push({ id: `fila-${p.id}-${entrada}`, em: entrada, processo: p, texto: 'Entrou na fila do TI.', autor: null });
    }
  }

  return itens.sort((a, b) => b.em.localeCompare(a.em)).slice(0, limite);
}
