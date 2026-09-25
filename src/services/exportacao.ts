/**
 * Exportar os concluídos de um período como planilha. A montagem do conteúdo
 * é regra (domain/concluidos.ts); aqui só vira arquivo e download.
 */
import type { Processo } from '../data';
import { store } from '../data';
import { planilhaDosConcluidos, type Intervalo } from '../domain/concluidos';
import { baixarBlob } from '../lib/files';

export function exportarPlanilhaDeConcluidos(lista: Processo[], intervalo: Intervalo) {
  const conteudo = planilhaDosConcluidos(store.getEstado().snapshot, lista);
  const nomeArquivo = `concluidos-${intervalo.inicio}-a-${intervalo.fim}.csv`;
  baixarBlob(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }), nomeArquivo);
  return { nomeArquivo };
}
