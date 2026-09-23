/**
 * Preferências deste navegador: tema e interface.
 *
 * O tema é gravado em JSON (a entrada crua fica '"dark"', com aspas) na mesma
 * chave que o script de pré-pintura do index.html lê antes do primeiro paint.
 */
import { STORAGE_KEYS } from '../config/app';
import { gravarPref, lerPref } from '../lib/localPrefs';

export type Tema = 'light' | 'dark';
export type VisaoProcessos = 'lista' | 'quadro' | 'linha';

export interface PrefsUI {
  sidebarRecolhida: boolean;
  visaoProcessos: VisaoProcessos;
}

/** Uma preferência observável: valor + inscrição, para useSyncExternalStore. */
function criarPreferencia<T>(chave: string, padrao: T, validar: (v: unknown) => T) {
  let atual = validar(lerPref<unknown>(chave, padrao));
  const ouvintes = new Set<() => void>();
  return {
    get: () => atual,
    definir(valor: T) {
      atual = valor;
      gravarPref(chave, valor);
      ouvintes.forEach((f) => f());
    },
    subscribe(fn: () => void) {
      ouvintes.add(fn);
      return () => {
        ouvintes.delete(fn);
      };
    },
  };
}

export const tema = criarPreferencia<Tema>(STORAGE_KEYS.tema, 'light', (v) =>
  v === 'dark' ? 'dark' : 'light',
);

/** Aplica o tema no <html>. O dark mode é troca de token, não classes `dark:`. */
export function aplicarTema(t: Tema) {
  document.documentElement.classList.toggle('dark', t === 'dark');
  document.documentElement.style.colorScheme = t;
}

export function definirTema(t: Tema) {
  tema.definir(t);
  aplicarTema(t);
}

/** O quadro é a primeira visão dos processos; a lista e a linha do tempo ficam a um clique. */
const PREFS_PADRAO: PrefsUI = { sidebarRecolhida: false, visaoProcessos: 'quadro' };

export const prefsUI = criarPreferencia<PrefsUI>(STORAGE_KEYS.ui, PREFS_PADRAO, (v) => {
  const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  return {
    sidebarRecolhida: o.sidebarRecolhida === true,
    visaoProcessos: o.visaoProcessos === 'lista' || o.visaoProcessos === 'linha' ? o.visaoProcessos : 'quadro',
  };
});

export function atualizarPrefsUI(parcial: Partial<PrefsUI>) {
  prefsUI.definir({ ...prefsUI.get(), ...parcial });
}
