/**
 * Anexos: metadados. O arquivo em si vai para o armazenamento de arquivos,
 * pela ação (services/acoes.ts), antes de os metadados serem gravados.
 */
import { agoraISO } from '../lib/dates';
import { uid } from '../lib/ids';
import type { Op } from '../data/ops';
import type { Anexo, Autor, ContextoAnexo, ID, Snapshot } from '../data/types';
import { andamentoAutomatico } from './andamentos';

export const NOME_CONTEXTO: Record<ContextoAnexo, string> = {
  'antes-diagrama': 'Diagrama do cenário atual',
  'antes-bpmn': 'BPMN do cenário atual',
  depois: 'Cenário proposto',
  geral: 'Geral',
  ti: 'Entrega do TI',
};

/** Rótulo curto para a tag na lista de anexos. */
export const TAG_CONTEXTO: Record<ContextoAnexo, string> = {
  'antes-diagrama': 'Antes · diagrama',
  'antes-bpmn': 'Antes · BPMN',
  depois: 'Depois',
  geral: 'Geral',
  ti: 'TI',
};

export function novoAnexo(
  processoId: ID,
  arquivo: { name: string; type: string; size: number },
  contexto: ContextoAnexo,
  autor: Autor,
): { anexo: Anexo; ops: Op[] } {
  const agora = agoraISO();
  const anexo: Anexo = {
    id: uid(),
    processoId,
    nome: arquivo.name,
    mime: arquivo.type || 'application/octet-stream',
    tamanho: arquivo.size,
    contexto,
    adicionadoEm: agora,
    autor,
  };
  const onde = contexto === 'geral' ? '' : ` em “${NOME_CONTEXTO[contexto]}”`;
  return {
    anexo,
    ops: [
      { tipo: 'anexo', valor: anexo },
      {
        tipo: 'andamento',
        valor: andamentoAutomatico(processoId, 'anexo', `Anexou “${arquivo.name}”${onde}.`, autor, agora),
      },
    ],
  };
}

export function anexosDoProcesso(s: Snapshot, processoId: ID, contexto?: ContextoAnexo): Anexo[] {
  return s.anexos
    .filter((a) => a.processoId === processoId && (!contexto || a.contexto === contexto))
    .sort((a, b) => b.adicionadoEm.localeCompare(a.adicionadoEm));
}
