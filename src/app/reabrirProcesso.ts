/**
 * Abrir o "Reabrir processo" de qualquer lugar: o botão do processo
 * concluído, a barra de etapas e o campo Etapa. Mover um concluído para uma
 * etapa anterior sempre passa por aqui, para a reabertura ter um motivo.
 */
import { useSyncExternalStore } from 'react';

export interface PedidoReabrir {
  processoId: string | null;
  /** Etapa já escolhida (ex.: clicada na barra de etapas). Null = a sugerida. */
  etapaId: string | null;
}

let estado: PedidoReabrir = { processoId: null, etapaId: null };
const ouvintes = new Set<() => void>();

function definir(novo: PedidoReabrir) {
  estado = novo;
  ouvintes.forEach((f) => f());
}

export function abrirReabrirProcesso(processoId: string, etapaId: string | null = null) {
  definir({ processoId, etapaId });
}

export function fecharReabrirProcesso() {
  definir({ ...estado, processoId: null });
}

export function useReabrirProcesso(): PedidoReabrir {
  return useSyncExternalStore(
    (fn) => {
      ouvintes.add(fn);
      return () => {
        ouvintes.delete(fn);
      };
    },
    () => estado,
  );
}
