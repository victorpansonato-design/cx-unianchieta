import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Mede a largura de um contêiner (DESIGN_SYSTEM §11, invariante 1).
 *
 * Descarta o zero transitório: uma medição de 0 no meio de um reflow
 * desmontaria o <svg> e reiniciaria o desenho. Manter a última largura boa
 * mantém o elemento montado, e o desenho apenas atualiza.
 */
export function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = (next: number) => setWidth((prev) => (next > 0 ? Math.round(next) : prev));
    medir(el.getBoundingClientRect().width);
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) medir(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, width };
}
