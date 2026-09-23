import { useSyncExternalStore } from 'react';
import { store, type EstadoStore } from '../data';

/**
 * Lê um pedaço da store. O seletor deve devolver algo que já existe no estado
 * (uma coleção, um objeto) — não um array novo a cada chamada. Derivações
 * (filtros, contagens) vão num useMemo no componente.
 */
export function useStore<T>(seletor: (e: EstadoStore) => T): T {
  return useSyncExternalStore(store.subscribe, () => seletor(store.getEstado()));
}

export const useSnapshot = () => useStore((e) => e.snapshot);
export const useConfig = () => useStore((e) => e.snapshot.config);
export const useSalvamento = () => useStore((e) => e.salvamento);
