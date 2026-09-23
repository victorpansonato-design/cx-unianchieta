/**
 * Overlays — DESIGN_SYSTEM §10.13.
 *
 * UMA implementação de overlay, para que todo diálogo do app se comporte igual:
 * - o app atrás é borrado e dessaturado (.scrim), não só escurecido;
 * - Escape fecha, clique no scrim fecha, o botão fecha;
 * - o foco entra na folha ao abrir, fica preso dentro e volta ao gatilho;
 * - o scroll da página trava sem a página deslizar de lado;
 * - a animação de saída de fato roda, porque o <AnimatePresence> mora AQUI
 *   DENTRO, não em volta de um `return null` precoce.
 *
 * Overlays empilham (uma confirmação por cima de um modal): só o do topo
 * responde ao Escape e ao Tab. Só overlay projeta sombra (Regra 5).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import {
  drawerLeftVariants,
  drawerVariants,
  modalVariants,
  popoverVariants,
  press,
  scrimVariants,
} from '../../lib/motion';
import { Button } from './Button';

/* -- Comportamento compartilhado ------------------------------------------- */

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),' +
  'select:not([disabled]),[tabindex]:not([tabindex="-1"])';

const pilha: number[] = [];
let sequencia = 0;
const noTopo = (id: number) => pilha[pilha.length - 1] === id;

let travas = 0;
let destravar: (() => void) | null = null;

/**
 * Trava o scroll da página. A compensação é MEDIDA (largura antes − depois),
 * não presumida: com `scrollbar-gutter: stable` no <html> a calha já fica
 * reservada e compensar de novo empurraria a página para o lado.
 */
function travarScroll(): () => void {
  if (travas++ === 0) {
    const html = document.documentElement;
    const antes = html.clientWidth;
    const overflowAnterior = html.style.overflow;
    const paddingAnterior = document.body.style.paddingRight;
    html.style.overflow = 'hidden';
    const compensacao = html.clientWidth - antes;
    if (compensacao > 0) document.body.style.paddingRight = `${compensacao}px`;
    destravar = () => {
      html.style.overflow = overflowAnterior;
      document.body.style.paddingRight = paddingAnterior;
    };
  }
  return () => {
    if (--travas === 0) {
      destravar?.();
      destravar = null;
    }
  };
}

function focaveis(el: HTMLElement): HTMLElement[] {
  return Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (x) => x.offsetParent !== null || x === document.activeElement,
  );
}

/** Primeiro foco: [data-autofocus] → primeiro focável → a própria folha. */
function focarPrimeiro(el: HTMLElement | null) {
  if (!el) return;
  const alvo = el.querySelector<HTMLElement>('[data-autofocus]') ?? focaveis(el)[0] ?? el;
  alvo.focus({ preventScroll: true });
}

interface OpcoesOverlay {
  onClose: () => void;
  sheetRef: RefObject<HTMLElement | null>;
  dismissible?: boolean;
  /** Prender o foco e travar o scroll (modal/drawer). Popover não faz nenhum dos dois. */
  modal?: boolean;
  autoFocus?: boolean;
  /**
   * Atraso do primeiro foco. 60ms por padrão, para não brigar com a animação de
   * entrada. A busca rápida usa 0: quem aperta Ctrl K e já sai digitando não
   * pode perder as primeiras letras.
   */
  atrasoFoco?: number;
}

export function useOverlayBehavior(open: boolean, opcoes: OpcoesOverlay) {
  const ref = useRef(opcoes);
  useLayoutEffect(() => {
    ref.current = opcoes;
  });

  // Layout effect: roda antes do primeiro paint, com a folha já no DOM — o
  // gatilho ainda é o elemento focado, e o foco imediato não perde tecla.
  useLayoutEffect(() => {
    if (!open) return;
    const { modal = true, autoFocus = true, atrasoFoco = 60 } = ref.current;
    const id = ++sequencia;
    pilha.push(id);
    const gatilho = document.activeElement as HTMLElement | null;
    const liberarScroll = modal ? travarScroll() : () => {};
    let timer = 0;
    if (autoFocus && atrasoFoco === 0) focarPrimeiro(ref.current.sheetRef.current);
    else if (autoFocus) timer = window.setTimeout(() => focarPrimeiro(ref.current.sheetRef.current), atrasoFoco);

    const aoTeclar = (e: KeyboardEvent) => {
      if (!noTopo(id)) return;
      const atual = ref.current;
      if (e.key === 'Escape') {
        if (atual.dismissible === false) return;
        e.preventDefault();
        e.stopPropagation();
        atual.onClose();
        return;
      }
      if (e.key === 'Tab' && (atual.modal ?? true)) {
        const folha = atual.sheetRef.current;
        if (!folha) return;
        const lista = focaveis(folha);
        if (lista.length === 0) {
          e.preventDefault();
          folha.focus();
          return;
        }
        const primeiro = lista[0];
        const ultimo = lista[lista.length - 1];
        const ativo = document.activeElement;
        if (!folha.contains(ativo)) {
          e.preventDefault();
          primeiro.focus();
        } else if (e.shiftKey && ativo === primeiro) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && ativo === ultimo) {
          e.preventDefault();
          primeiro.focus();
        }
      }
    };
    // Fase de captura: o Escape do diálogo vence o de qualquer coisa embaixo.
    document.addEventListener('keydown', aoTeclar, true);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', aoTeclar, true);
      const i = pilha.indexOf(id);
      if (i >= 0) pilha.splice(i, 1);
      liberarScroll();
      if (gatilho && document.contains(gatilho)) gatilho.focus({ preventScroll: true });
    };
  }, [open]);
}

/* -- Modal ----------------------------------------------------------------- */

const MODAL_WIDTH = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' } as const;

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  size?: keyof typeof MODAL_WIDTH;
  footer?: ReactNode;
  children?: ReactNode;
  /** false: sem botão fechar, sem Escape, sem clique no scrim (ex.: escolher identidade). */
  dismissible?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  size = 'md',
  footer,
  children,
  dismissible = true,
}: ModalProps) {
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  useOverlayBehavior(open, { onClose, sheetRef, dismissible });

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="modal"
          className="scrim fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-[6vh] sm:p-6 sm:py-[8vh]"
          variants={scrimVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onMouseDown={(e) => {
            if (dismissible && e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={cn(
              'relative flex max-h-[86vh] w-full flex-col overflow-hidden rounded-2xl bg-surface shadow-overlay outline-none',
              MODAL_WIDTH[size],
            )}
          >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-hairline px-5 py-4">
              <div className="flex min-w-0 items-start gap-3">
                {icon && (
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-2">
                    {icon}
                  </div>
                )}
                <div className="min-w-0">
                  <h2 id={titleId} className="text-[15px] leading-tight font-semibold text-ink">
                    {title}
                  </h2>
                  {description && <p className="mt-1 text-[12px] leading-relaxed text-ink-3">{description}</p>}
                </div>
              </div>
              {dismissible && (
                <motion.button
                  type="button"
                  whileTap={press}
                  aria-label="Fechar"
                  onClick={onClose}
                  className="-mt-0.5 -mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-4 transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              )}
            </header>
            <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">{children}</div>
            {footer && (
              <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-hairline bg-surface-2/60 px-5 py-3.5">
                {footer}
              </footer>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* -- Drawer ---------------------------------------------------------------- */

const DRAWER_WIDTH = { sm: 'max-w-[300px]', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-3xl' } as const;

/**
 * A borda do drawer é a única borda-que-não-é-divisor do sistema: a folha
 * encosta na margem da janela, e ali a linha separa dois planos.
 */
export function Drawer({
  open,
  onClose,
  label,
  side = 'right',
  width = 'md',
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  side?: 'left' | 'right';
  width?: keyof typeof DRAWER_WIDTH;
  children: ReactNode;
}) {
  const sheetRef = useRef<HTMLElement>(null);
  useOverlayBehavior(open, { onClose, sheetRef });
  const esquerda = side === 'left';

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="drawer"
          className={cn('scrim fixed inset-0 z-50 flex', esquerda ? 'justify-start' : 'justify-end')}
          variants={scrimVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.aside
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            variants={esquerda ? drawerLeftVariants : drawerVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={cn(
              'relative flex h-full w-full flex-col overflow-hidden bg-surface shadow-overlay outline-none',
              esquerda ? 'border-r border-hairline' : 'border-l border-hairline',
              DRAWER_WIDTH[width],
            )}
          >
            {children}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* -- Popover --------------------------------------------------------------- */

interface Posicao {
  top: number;
  left: number;
  origemY: 'top' | 'bottom';
}

const MARGEM = 8;

function calcularPosicao(ancora: DOMRect, folha: { w: number; h: number }, align: 'start' | 'end'): Posicao {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cabeAbaixo = ancora.bottom + 6 + folha.h <= vh - MARGEM;
  const cabeAcima = ancora.top - 6 - folha.h >= MARGEM;
  const abaixo = cabeAbaixo || !cabeAcima;
  let left = align === 'end' ? ancora.right - folha.w : ancora.left;
  left = Math.min(Math.max(left, MARGEM), vw - folha.w - MARGEM);
  const top = abaixo ? ancora.bottom + 6 : ancora.top - 6 - folha.h;
  return { top: Math.max(top, MARGEM), left, origemY: abaixo ? 'top' : 'bottom' };
}

/**
 * Folha ancorada a um gatilho (menu, calendário). Posição fixa calculada do
 * retângulo do gatilho, para não ser cortada por contêiner com overflow (as
 * colunas do quadro, o corpo de um modal). Vira para cima quando não cabe.
 */
export function Popover({
  open,
  onClose,
  anchorRef,
  align = 'start',
  children,
  className,
  role = 'dialog',
  label,
  autoFocus = true,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  align?: 'start' | 'end';
  children: ReactNode;
  className?: string;
  role?: 'dialog' | 'menu' | 'listbox';
  label?: string;
  autoFocus?: boolean;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Posicao | null>(null);
  useOverlayBehavior(open, { onClose, sheetRef, modal: false, autoFocus });

  const reposicionar = useCallback(() => {
    const ancora = anchorRef.current;
    const folha = sheetRef.current;
    if (!ancora || !folha) return;
    setPos(
      calcularPosicao(ancora.getBoundingClientRect(), { w: folha.offsetWidth, h: folha.offsetHeight }, align),
    );
  }, [anchorRef, align]);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    reposicionar();
    let quadro = 0;
    const agendar = () => {
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(reposicionar);
    };
    window.addEventListener('resize', agendar);
    window.addEventListener('scroll', agendar, true);
    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener('resize', agendar);
      window.removeEventListener('scroll', agendar, true);
    };
  }, [open, reposicionar]);

  useEffect(() => {
    if (!open) return;
    const fora = (e: PointerEvent) => {
      const alvo = e.target as Node;
      if (sheetRef.current?.contains(alvo) || anchorRef.current?.contains(alvo)) return;
      onClose();
    };
    document.addEventListener('pointerdown', fora, true);
    return () => document.removeEventListener('pointerdown', fora, true);
  }, [open, onClose, anchorRef]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="popover"
          ref={sheetRef}
          role={role}
          aria-label={label}
          tabIndex={-1}
          variants={popoverVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{
            top: pos?.top ?? -9999,
            left: pos?.left ?? -9999,
            transformOrigin: pos?.origemY === 'bottom' ? 'bottom' : 'top',
          }}
          className={cn('fixed z-50 rounded-xl bg-surface p-1 shadow-overlay outline-none', className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* -- Menu ------------------------------------------------------------------ */

export interface MenuItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  onSelect: () => void;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  /** Marca o item atual (ex.: a etapa em que o processo já está). */
  selected?: boolean;
}

export interface MenuTriggerProps {
  ref: RefObject<HTMLButtonElement | null>;
  onClick: () => void;
  'aria-haspopup': 'menu';
  'aria-expanded': boolean;
}

/** Menu de ações. Setas navegam, Enter escolhe, Escape fecha. */
export function Menu({
  trigger,
  items,
  align = 'end',
  label,
  header,
  className,
}: {
  trigger: (props: MenuTriggerProps) => ReactNode;
  items: MenuItem[];
  align?: 'start' | 'end';
  label: string;
  header?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const fechar = useCallback(() => setOpen(false), []);

  const mover = (e: ReactKeyboardEvent) => {
    const botoes = Array.from(
      listaRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])') ?? [],
    );
    if (botoes.length === 0) return;
    const i = botoes.indexOf(document.activeElement as HTMLButtonElement);
    let alvo: number | null = null;
    if (e.key === 'ArrowDown') alvo = i < 0 ? 0 : (i + 1) % botoes.length;
    if (e.key === 'ArrowUp') alvo = i <= 0 ? botoes.length - 1 : i - 1;
    if (e.key === 'Home') alvo = 0;
    if (e.key === 'End') alvo = botoes.length - 1;
    if (alvo !== null) {
      e.preventDefault();
      botoes[alvo].focus();
    }
  };

  return (
    <>
      {trigger({
        ref: anchorRef,
        onClick: () => setOpen((v) => !v),
        'aria-haspopup': 'menu',
        'aria-expanded': open,
      })}
      <Popover
        open={open}
        onClose={fechar}
        anchorRef={anchorRef}
        align={align}
        role="menu"
        label={label}
        className={cn('min-w-[220px] max-w-[320px]', className)}
      >
        <div ref={listaRef} onKeyDown={mover} className="scroll-slim max-h-[60vh] overflow-y-auto">
          {header && <div className="border-b border-hairline px-2.5 pt-1.5 pb-2.5">{header}</div>}
          <div className={cn(header && 'pt-1')}>
            {items.map((item) => (
              <motion.button
                key={item.id}
                type="button"
                role="menuitem"
                whileTap={press}
                disabled={item.disabled}
                aria-current={item.selected || undefined}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors disabled:opacity-45',
                  item.tone === 'danger'
                    ? 'text-crit-ink hover:bg-surface-2 focus:bg-surface-2'
                    : 'text-ink-2 hover:bg-surface-2 hover:text-ink focus:bg-surface-2 focus:text-ink',
                  item.selected && 'text-ink',
                  'focus:outline-none',
                )}
              >
                {item.icon && <span className="shrink-0 text-ink-4">{item.icon}</span>}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.selected && <span className="h-1.25 w-1.25 shrink-0 rounded-full bg-ink" />}
              </motion.button>
            ))}
          </div>
        </div>
      </Popover>
    </>
  );
}

/* -- Confirm --------------------------------------------------------------- */

export interface OpcoesConfirmacao {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' para exclusão; o foco inicial fica no Cancelar. */
  tone?: 'danger' | 'default';
  /** Só um aviso, com um botão "Entendi". */
  somenteAviso?: boolean;
}

type Confirmar = (opcoes: OpcoesConfirmacao) => Promise<boolean>;

const ConfirmContext = createContext<Confirmar | null>(null);

/** Confirmação antes de qualquer exclusão, sempre pelo mesmo diálogo. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<(OpcoesConfirmacao & { resolver: (v: boolean) => void }) | null>(null);
  const [aberto, setAberto] = useState(false);

  const confirmar = useCallback<Confirmar>(
    (opcoes) =>
      new Promise<boolean>((resolver) => {
        setPedido({ ...opcoes, resolver });
        setAberto(true);
      }),
    [],
  );

  const responder = (valor: boolean) => {
    pedido?.resolver(valor);
    setAberto(false);
  };

  const perigo = pedido?.tone === 'danger';

  return (
    <ConfirmContext.Provider value={confirmar}>
      {children}
      <Modal
        open={aberto}
        onClose={() => responder(false)}
        size="sm"
        title={pedido?.title ?? ''}
        icon={perigo ? <AlertTriangle className="h-4 w-4" /> : undefined}
        footer={
          pedido?.somenteAviso ? (
            <Button variant="primary" size="sm" onClick={() => responder(true)} data-autofocus>
              Entendi
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => responder(false)} data-autofocus={perigo || undefined}>
                {pedido?.cancelLabel ?? 'Cancelar'}
              </Button>
              <Button
                variant={perigo ? 'danger' : 'primary'}
                size="sm"
                onClick={() => responder(true)}
                data-autofocus={!perigo || undefined}
              >
                {pedido?.confirmLabel ?? 'Confirmar'}
              </Button>
            </>
          )
        }
      >
        {pedido?.message && <div className="px-5 py-4 text-[13px] leading-relaxed text-ink-2">{pedido.message}</div>}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): Confirmar {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm precisa estar dentro de <ConfirmProvider>.');
  return ctx;
}
