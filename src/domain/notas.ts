/** Notas da equipe: atas e anotações que não pertencem a um processo. */
import { agoraISO } from '../lib/dates';
import { uid } from '../lib/ids';
import type { Op } from '../data/ops';
import type { Autor, ID, Nota, Snapshot } from '../data/types';

export function novaNota(autor: Autor): Nota {
  const agora = agoraISO();
  return { id: uid(), titulo: '', texto: '', fixada: false, autor, criadaEm: agora, atualizadaEm: agora };
}

export function atualizarNota(s: Snapshot, id: ID, parcial: Partial<Pick<Nota, 'titulo' | 'texto' | 'fixada'>>): Op[] {
  const n = s.notas.find((x) => x.id === id);
  if (!n) return [];
  return [{ tipo: 'nota', valor: { ...n, ...parcial, atualizadaEm: agoraISO() } }];
}

/** Fixadas primeiro; dentro de cada grupo, a mais recente em cima. */
export function ordenarNotas(lista: Nota[]): Nota[] {
  return [...lista].sort((a, b) =>
    a.fixada !== b.fixada ? (a.fixada ? -1 : 1) : b.atualizadaEm.localeCompare(a.atualizadaEm),
  );
}

/** Título para exibir: o digitado, ou a primeira linha do texto. */
export function tituloDaNota(n: Nota): string {
  return n.titulo.trim() || n.texto.trim().split('\n')[0]?.slice(0, 80) || 'Nota sem título';
}
