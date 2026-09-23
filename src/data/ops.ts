/**
 * Operações de escrita.
 *
 * Toda mudança no sistema é descrita como uma lista de Op. As regras de
 * negócio (src/domain) produzem Ops; a store aplica as Ops na memória
 * (aplicarOps, puro) e depois as persiste pelo repositório. Assim a mesma
 * regra — "mover de etapa gera um andamento" — vale para qualquer banco.
 */
import type { Andamento, Anexo, Config, Demanda, ID, Meta, Nota, Processo, Snapshot, Tarefa } from './types';

export type Op =
  | { tipo: 'processo'; valor: Processo }
  | { tipo: 'processo-remover'; id: ID }
  | { tipo: 'tarefa'; valor: Tarefa }
  | { tipo: 'tarefa-remover'; id: ID }
  | { tipo: 'andamento'; valor: Andamento }
  | { tipo: 'andamento-remover'; id: ID }
  | { tipo: 'anexo'; valor: Anexo }
  | { tipo: 'anexo-remover'; id: ID }
  | { tipo: 'demanda'; valor: Demanda }
  | { tipo: 'demanda-remover'; id: ID }
  | { tipo: 'nota'; valor: Nota }
  | { tipo: 'nota-remover'; id: ID }
  | { tipo: 'config'; valor: Config }
  | { tipo: 'meta'; valor: Meta };

function upsert<T extends { id: ID }>(lista: T[], valor: T): T[] {
  const i = lista.findIndex((x) => x.id === valor.id);
  if (i === -1) return [...lista, valor];
  const copia = lista.slice();
  copia[i] = valor;
  return copia;
}

function remover<T extends { id: ID }>(lista: T[], id: ID): T[] {
  return lista.filter((x) => x.id !== id);
}

/**
 * Aplica as Ops e devolve um snapshot novo. Só as coleções tocadas ganham
 * array novo — as demais mantêm a referência, e quem as observa não re-renderiza.
 */
export function aplicarOps(snapshot: Snapshot, ops: Op[]): Snapshot {
  let s = snapshot;
  for (const op of ops) {
    switch (op.tipo) {
      case 'processo':
        s = { ...s, processos: upsert(s.processos, op.valor) };
        break;
      case 'processo-remover':
        s = { ...s, processos: remover(s.processos, op.id) };
        break;
      case 'tarefa':
        s = { ...s, tarefas: upsert(s.tarefas, op.valor) };
        break;
      case 'tarefa-remover':
        s = { ...s, tarefas: remover(s.tarefas, op.id) };
        break;
      case 'andamento':
        s = { ...s, andamentos: upsert(s.andamentos, op.valor) };
        break;
      case 'andamento-remover':
        s = { ...s, andamentos: remover(s.andamentos, op.id) };
        break;
      case 'anexo':
        s = { ...s, anexos: upsert(s.anexos, op.valor) };
        break;
      case 'anexo-remover':
        s = { ...s, anexos: remover(s.anexos, op.id) };
        break;
      case 'demanda':
        s = { ...s, demandas: upsert(s.demandas, op.valor) };
        break;
      case 'demanda-remover':
        s = { ...s, demandas: remover(s.demandas, op.id) };
        break;
      case 'nota':
        s = { ...s, notas: upsert(s.notas, op.valor) };
        break;
      case 'nota-remover':
        s = { ...s, notas: remover(s.notas, op.id) };
        break;
      case 'config':
        s = { ...s, config: op.valor };
        break;
      case 'meta':
        s = { ...s, meta: op.valor };
        break;
    }
  }
  return s;
}
