import { useLayoutEffect, type RefObject } from 'react';

/** Faz um textarea crescer com o conteúdo (fallback para `field-sizing: content`). */
export function useAutosize(ref: RefObject<HTMLTextAreaElement | null>, valor: string) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (CSS.supports('field-sizing', 'content')) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [ref, valor]);
}
