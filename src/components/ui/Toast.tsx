/**
 * Toast — aviso curto que confirma uma ação ou reporta uma falha.
 *
 * É overlay (está genuinamente acima do app), então é um dos poucos lugares
 * com sombra. Entra com springSoft, sai mais rápido (exitFast), empilha no
 * canto inferior direito e some sozinho. Falha fica mais tempo na tela.
 */
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Check, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { press, toastVariants } from '../../lib/motion';

export interface ToastOpcoes {
  title: string;
  description?: string;
  tone?: 'default' | 'crit';
}

interface ToastItem extends ToastOpcoes {
  id: number;
}

type Notificar = (opcoes: ToastOpcoes) => void;

const ToastContext = createContext<Notificar | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const fechar = useCallback((id: number) => setItens((xs) => xs.filter((x) => x.id !== id)), []);

  const notificar = useCallback<Notificar>(
    (opcoes) => {
      const id = ++seq.current;
      setItens((xs) => [...xs.slice(-2), { ...opcoes, id }]);
      window.setTimeout(() => fechar(id), opcoes.tone === 'crit' ? 8000 : 4200);
    },
    [fechar],
  );

  return (
    <ToastContext.Provider value={notificar}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[calc(100vw-2rem)] max-w-[360px] flex-col gap-2 print:hidden"
        >
          <AnimatePresence initial={false}>
            {itens.map((t) => (
              <motion.div
                key={t.id}
                layout
                variants={toastVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                role={t.tone === 'crit' ? 'alert' : 'status'}
                className="pointer-events-auto flex items-start gap-2.5 rounded-xl bg-surface p-3.5 shadow-overlay"
              >
                <span className={cn('mt-px shrink-0', t.tone === 'crit' ? 'text-crit' : 'text-ink-3')}>
                  {t.tone === 'crit' ? <AlertTriangle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-ink">{t.title}</p>
                  {t.description && <p className="mt-0.5 text-[12px] leading-relaxed text-ink-3">{t.description}</p>}
                </div>
                <motion.button
                  type="button"
                  whileTap={press}
                  aria-label="Fechar aviso"
                  onClick={() => fechar(t.id)}
                  className="-mt-1 -mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-4 transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" />
                </motion.button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): Notificar {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>.');
  return ctx;
}
