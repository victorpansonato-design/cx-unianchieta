/**
 * Formulários — DESIGN_SYSTEM §10.12.
 *
 * Controles são PREENCHIDOS, não contornados. A superfície recuada é o que diz
 * "dá pra digitar aqui"; um contorno repetiria o que o preenchimento já diz e
 * devolveria à tela um retângulo que a gente acabou de tirar. A única linha
 * que um controle desenha é o anel de foco — o único momento em que um
 * contorno carrega informação.
 */
import {
  forwardRef,
  useId,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { motion } from 'motion/react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { press, spring } from '../../lib/motion';
import { useAutosize } from '../../lib/useAutosize';
import { useDraft } from '../../hooks/useDraft';

export const CONTROL =
  'w-full rounded-md bg-surface-2 px-3 text-[13px] text-ink ' +
  'transition-colors placeholder:text-ink-4 hover:bg-surface-3 ' +
  'focus:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-focus ' +
  'disabled:opacity-50';

/* -- Label e Field --------------------------------------------------------- */

/** O obrigatório é marcado UMA vez, ao lado do rótulo. */
export function Label({
  htmlFor,
  required,
  hint,
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className="text-[12px] font-medium text-ink">
        {children}
        {required && <span className="ml-1 text-crit">*</span>}
      </label>
      {hint && <span className="text-[11px] text-ink-4">{hint}</span>}
    </div>
  );
}

/** A dica fica SOB o controle, lida depois do valor e não antes. */
export function Field({
  label,
  required,
  hint,
  error,
  help,
  className,
  children,
}: {
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  help?: ReactNode;
  className?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className={className}>
      <Label htmlFor={id} required={required} hint={hint}>
        {label}
      </Label>
      {children(id)}
      {error ? (
        <p className="mt-1.5 text-[11.5px] font-medium text-crit">{error}</p>
      ) : (
        help && <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-4">{help}</p>
      )}
    </div>
  );
}

/* -- TextInput, TextArea, Select ------------------------------------------- */

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cn(CONTROL, 'h-9', className)} {...rest} />;
});

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea({ className, rows = 3, ...rest }, ref) {
    return (
      <textarea ref={ref} rows={rows} className={cn(CONTROL, 'resize-y py-2 leading-relaxed', className)} {...rest} />
    );
  },
);

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { wrapperClassName?: string }
>(function Select({ className, wrapperClassName, children, ...rest }, ref) {
  return (
    <div className={cn('relative', wrapperClassName)}>
      <select ref={ref} className={cn(CONTROL, 'h-9 cursor-pointer appearance-none pr-8', className)} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-ink-4" />
    </div>
  );
});

/* -- SearchInput ----------------------------------------------------------- */

export function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar…',
  className,
  'aria-label': ariaLabel,
  autoFocus,
}: {
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-ink-4" />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        aria-label={ariaLabel ?? placeholder}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(CONTROL, 'h-9 pr-8 pl-9 [&::-webkit-search-cancel-button]:hidden')}
      />
      {value && (
        <motion.button
          type="button"
          whileTap={press}
          aria-label="Limpar busca"
          onClick={() => onChange('')}
          className="absolute top-1/2 right-1.5 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-ink-4 transition-colors hover:bg-surface-3 hover:text-ink"
        >
          <X className="h-3.5 w-3.5" />
        </motion.button>
      )}
    </div>
  );
}

/* -- Segmented ------------------------------------------------------------- */

export interface SegmentedItem<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  count?: number;
}

/** Trilho pílula + pílula deslizante. `layoutId` único por instância. */
export function Segmented<T extends string>({
  items,
  value,
  onChange,
  layoutId,
  size = 'sm',
  tone = 'default',
  label,
}: {
  items: SegmentedItem<T>[];
  value: T;
  onChange: (valor: T) => void;
  layoutId: string;
  size?: 'xs' | 'sm';
  tone?: 'default' | 'band';
  label?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-full p-0.5',
        tone === 'band' ? 'bg-surface-3' : 'bg-surface-2',
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <motion.button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            data-valor={item.value}
            whileTap={press}
            onClick={() => onChange(item.value)}
            className={cn(
              'relative flex items-center justify-center gap-1.5 rounded-full whitespace-nowrap transition-colors',
              size === 'xs' ? 'h-7 px-2.5 text-[11.5px]' : 'h-8 px-3 text-[12.5px]',
              active ? 'font-semibold text-ink' : 'font-medium text-ink-3 hover:text-ink',
            )}
          >
            {active && (
              <motion.span layoutId={layoutId} transition={spring} className="absolute inset-0 rounded-full bg-surface" />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {item.icon}
              {item.label}
              {item.count !== undefined && (
                <span className="font-mono text-[10.5px] font-medium text-ink-4">{item.count}</span>
              )}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

/* -- Switch ---------------------------------------------------------------- */

/** Sempre dentro de uma linha que explica o que ele liga. */
export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (valor: boolean) => void;
  label: string;
  description?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg bg-surface-2 p-3.5">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-[13px] font-medium text-ink">
          {label}
        </label>
        {description && <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-3">{description}</p>}
      </div>
      <motion.button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        whileTap={press}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors duration-200',
          checked ? 'bg-brand' : 'bg-hairline-strong',
        )}
      >
        <motion.span
          layout
          transition={spring}
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm"
          style={{ left: checked ? 18 : 2 }}
        />
      </motion.button>
    </div>
  );
}

/* -- Chip ------------------------------------------------------------------ */

/** Filtro multi-seleção. O ativo é TINTA SÓLIDA, não azul — o azul é reservado. */
export function Chip({
  active,
  onClick,
  children,
  count,
  tone = 'default',
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  count?: number;
  tone?: 'default' | 'crit';
}) {
  return (
    <motion.button
      type="button"
      aria-pressed={active}
      whileTap={press}
      onClick={onClick}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12px] transition-colors',
        active
          ? tone === 'crit'
            ? 'bg-crit font-semibold text-white'
            : 'bg-ink font-semibold text-canvas'
          : 'bg-surface-2 font-medium text-ink-3 hover:bg-surface-3 hover:text-ink',
      )}
    >
      {children}
      {count !== undefined && <span className="font-mono text-[10.5px] opacity-70">{count}</span>}
    </motion.button>
  );
}

/* -- Checkbox (acréscimo do projeto) -------------------------------------- */

/**
 * Marca de concluído. Mesma lógica do Chip: marcado é tinta sólida, não azul.
 * 18px com raio 6px — um controle que ficaria absurdo em 12px.
 */
export function Checkbox({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (valor: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      whileTap={disabled ? undefined : press}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-xs transition-colors disabled:opacity-45',
        checked ? 'bg-ink text-canvas' : 'bg-surface-3 hover:bg-hairline-strong',
      )}
    >
      {checked && <Check className="h-3 w-3" strokeWidth={3} />}
    </motion.button>
  );
}

/* -- InlineText / InlineTextArea (acréscimo do projeto) -------------------- */

/**
 * Campo editável direto na tela, com salvamento automático.
 *
 * - variant "inline": lê como texto até o hover/foco — o título do processo,
 *   o nome de uma etapa. Ao focar, ganha a superfície recuada e o anel de
 *   foco, igual a qualquer controle.
 * - variant "inset": o mesmo "inline", para quando o campo já mora numa
 *   superfície recuada (um tile bg-surface-2). Lá o realce de hover/foco
 *   precisa subir um degrau (surface-3), senão some no fundo.
 * - variant "filled": o controle padrão (CONTROL), para campos de formulário
 *   que também salvam sozinhos.
 */
const INLINE_BASE =
  'min-w-0 rounded-md bg-transparent text-ink transition-colors placeholder:text-ink-4 ' +
  'focus:outline-none focus:ring-2 focus:ring-focus ';
const INLINE_REALCE = {
  inline: 'hover:bg-surface-2 focus:bg-surface-2',
  inset: 'hover:bg-surface-3 focus:bg-surface-3',
} as const;

function classeInline(variant: 'inline' | 'inset') {
  return cn(INLINE_BASE, INLINE_REALCE[variant], '-mx-2 w-[calc(100%+1rem)] px-2 py-1');
}

interface InlineBase {
  value: string;
  onCommit: (valor: string) => void | boolean;
  placeholder?: string;
  className?: string;
  'aria-label': string;
  delay?: number | null;
  required?: boolean;
  maxLength?: number;
  variant?: 'inline' | 'inset' | 'filled';
  id?: string;
  autoFocus?: boolean;
  /** id de um <datalist> com sugestões. */
  lista?: string;
}

export function InlineText({
  value,
  onCommit,
  placeholder,
  className,
  'aria-label': ariaLabel,
  delay = 600,
  required,
  maxLength,
  variant = 'inline',
  id,
  autoFocus,
  lista,
}: InlineBase) {
  const d = useDraft({ value, onCommit, delay, required });
  return (
    <input
      id={id}
      list={lista}
      value={d.draft}
      aria-label={ariaLabel}
      placeholder={placeholder}
      maxLength={maxLength}
      autoFocus={autoFocus}
      onChange={(e) => d.onChange(e.target.value)}
      onFocus={d.onFocus}
      onBlur={d.onBlur}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          d.cancelar();
          e.currentTarget.blur();
        }
      }}
      className={cn(
        variant === 'filled' ? cn(CONTROL, 'h-9') : classeInline(variant),
        className,
      )}
    />
  );
}

export function InlineTextArea({
  value,
  onCommit,
  placeholder,
  className,
  'aria-label': ariaLabel,
  delay = 600,
  required,
  maxLength,
  variant = 'filled',
  id,
  rows = 3,
}: InlineBase & { rows?: number }) {
  const d = useDraft({ value, onCommit, delay, required });
  const ref = useRef<HTMLTextAreaElement>(null);
  useAutosize(ref, d.draft);
  return (
    <textarea
      ref={ref}
      id={id}
      rows={rows}
      value={d.draft}
      aria-label={ariaLabel}
      placeholder={placeholder}
      maxLength={maxLength}
      onChange={(e) => d.onChange(e.target.value)}
      onFocus={d.onFocus}
      onBlur={d.onBlur}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          d.cancelar();
          e.currentTarget.blur();
        }
      }}
      className={cn(
        'autosize resize-none leading-relaxed',
        variant === 'filled' ? cn(CONTROL, 'py-2') : classeInline(variant),
        className,
      )}
    />
  );
}
