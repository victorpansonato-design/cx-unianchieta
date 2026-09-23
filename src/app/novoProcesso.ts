/**
 * Abrir o "Novo processo" de qualquer lugar: botão do topo, tecla N, o "+" de
 * cada coluna do quadro (que já escolhe a etapa) e a busca rápida.
 */
import { useSyncExternalStore } from 'react';

export interface PedidoNovoProcesso {
  aberto: boolean;
  etapaId: string | null;
}

let estado: PedidoNovoProcesso = { aberto: false, etapaId: null };
const ouvintes = new Set<() => void>();

function definir(novo: PedidoNovoProcesso) {
  estado = novo;
  ouvintes.forEach((f) => f());
}

export function abrirNovoProcesso(opcoes: { etapaId?: string | null } = {}) {
  definir({ aberto: true, etapaId: opcoes.etapaId ?? null });
}

export function fecharNovoProcesso() {
  definir({ ...estado, aberto: false });
}

export function useNovoProcesso(): PedidoNovoProcesso {
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
