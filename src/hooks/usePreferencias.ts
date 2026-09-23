import { useMemo, useSyncExternalStore } from 'react';
import { identidade, resolverPessoa } from '../services/identidade';
import { prefsUI, tema } from '../services/preferencias';
import { useConfig } from './useStore';

export function useTema() {
  return useSyncExternalStore(tema.subscribe, tema.get);
}

export function usePrefsUI() {
  return useSyncExternalStore(prefsUI.subscribe, prefsUI.get);
}

/** Quem está usando, já resolvido contra a equipe cadastrada. */
export function useIdentidade() {
  const id = useSyncExternalStore(identidade.subscribe, identidade.get);
  const config = useConfig();
  const pessoa = useMemo(() => resolverPessoa(id, config), [id, config]);
  return { identidade: id, pessoa, precisaEscolher: pessoa === null };
}
