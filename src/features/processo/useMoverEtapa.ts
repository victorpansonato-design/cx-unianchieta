/**
 * Mover um processo de etapa com o aviso combinado: ao AVANÇAR deixando
 * tarefas abertas na etapa atual, pergunta se quer seguir mesmo assim.
 * Usado pelo botão "Avançar", pela barra de etapas, pelo quadro e pelo menu.
 *
 * Tirar um concluído da última etapa é reabrir: abre o "Reabrir processo",
 * que pede o motivo, em vez de mover direto.
 */
import { createElement } from 'react';
import { abrirReabrirProcesso } from '../../app/reabrirProcesso';
import { useConfirm } from '../../components/ui/Overlay';
import { useToast } from '../../components/ui/Toast';
import { store, type Processo } from '../../data';
import { ehEtapaFinal, etapaDe, indiceEtapa } from '../../domain/processos';
import { tarefasAbertasDaEtapa } from '../../domain/tarefas';
import { plural } from '../../lib/text';
import { acoesProcesso } from '../../services/acoes';

export function useMoverEtapa() {
  const confirmar = useConfirm();
  const toast = useToast();

  return async (processo: Processo, etapaId: string): Promise<boolean> => {
    const s = store.getEstado().snapshot;
    const atual = indiceEtapa(s.config, processo.etapaId);
    const destino = indiceEtapa(s.config, etapaId);
    const etapaAtual = etapaDe(s.config, processo.etapaId);
    const etapaDestino = etapaDe(s.config, etapaId);
    if (!etapaDestino || etapaId === processo.etapaId) return false;

    if (processo.situacao === 'concluido' && !ehEtapaFinal(s.config, etapaId)) {
      abrirReabrirProcesso(processo.id, etapaId);
      return false;
    }

    if (destino > atual && etapaAtual) {
      const abertas = tarefasAbertasDaEtapa(s, processo.id, processo.etapaId);
      if (abertas.length > 0) {
        const lista = abertas.slice(0, 5).map((t) => createElement('li', { key: t.id }, t.titulo));
        const resto = abertas.length - lista.length;
        const ok = await confirmar({
          title: `Avançar com ${plural(abertas.length, 'tarefa aberta', 'tarefas abertas')}?`,
          message: createElement(
            'div',
            { className: 'space-y-2' },
            createElement('p', null, `Ainda há tarefas de “${etapaAtual.nome}” sem concluir:`),
            createElement('ul', { className: 'list-disc space-y-0.5 pl-5 text-ink' }, ...lista),
            resto > 0 ? createElement('p', null, `…e mais ${resto}.`) : null,
            createElement('p', null, 'Elas continuam no checklist; dá para concluir depois.'),
          ),
          confirmLabel: 'Avançar mesmo assim',
          cancelLabel: 'Voltar',
        });
        if (!ok) return false;
      }
    }

    await acoesProcesso.moverParaEtapa(processo.id, etapaId);
    toast({ title: `${processo.codigo} agora está em “${etapaDestino.nome}”.` });
    return true;
  };
}
