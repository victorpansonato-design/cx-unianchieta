/**
 * Superfícies — DESIGN_SYSTEM §10.2 a §10.11.
 *
 * Regra 1: separação é contraste, não linha. Um card é uma superfície mais
 * clara (bg-surface) sobre um canvas mais escuro (bg-canvas) — e essa é a
 * receita inteira. Nada de `border` em volta, nada de sombra.
 *
 * Regra 2: hairline é divisor, nunca moldura. Ele separa linhas de uma lista
 * (divide-y) e seções de um card (border-t) — nunca fecha uma forma.
 */
import type { HTMLAttributes, ReactNode } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Inbox } from 'lucide-react';
import { cn } from '../../lib/cn';
import { emphasis, press } from '../../lib/motion';

/* -- Card ------------------------------------------------------------------ */

export type CardTone = 'plain' | 'inset' | 'band' | 'contrast';

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'section' | 'div' | 'article' | 'aside';
  tone?: CardTone;
  padded?: boolean;
}

const CARD_TONE: Record<CardTone, string> = {
  plain: 'bg-surface',
  inset: 'bg-surface-2',
  band: 'bg-surface-2',
  // A classe `dark` troca os tokens só dentro da caixa: no tema claro ela vira
  // uma ilha escura com as mesmas regras de tinta, e a tinta herdada também
  // precisa vir de dentro (text-ink). Ver o acréscimo no fim do index.css.
  contrast: 'dark bg-contraste text-ink',
};

/**
 * `inset` e `band` são o mesmo: um passo de contraste, sem matiz, sem moldura.
 * `contrast` é a caixa que ancora a tela (os números do painel). Uma por tela:
 * duas já disputam o olho e nenhuma ancora nada.
 */
export function Card({ as: Tag = 'section', tone = 'plain', padded = true, className, ...rest }: CardProps) {
  return <Tag className={cn('rounded-xl', CARD_TONE[tone], padded && 'p-5', className)} {...rest} />;
}

/* -- AccentRule ------------------------------------------------------------ */

/**
 * O traço amarelo: 48×2px, a assinatura do CX. É detalhe, nunca sinal — não
 * marca estado nem chama para ação. Vive sob o título da página e sob a
 * marca, e só. Espalhado por card, lista e botão, deixa de ser detalhe e vira
 * enfeite.
 */
export function AccentRule({ className }: { className?: string }) {
  // print-color-adjust: sem ele, o navegador não imprime fundo e o traço some do relatório.
  return <span aria-hidden="true" className={cn('block h-0.5 w-12 bg-accent [print-color-adjust:exact]', className)} />;
}

/* -- CardHeader ------------------------------------------------------------ */

interface CardHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Só quando nomeia uma seção real. Não em todo card. */
  eyebrow?: ReactNode;
  action?: ReactNode;
  className?: string;
  titleId?: string;
}

export function CardHeader({ title, subtitle, eyebrow, action, className, titleId }: CardHeaderProps) {
  return (
    <div className={cn('relative flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1 flex items-center gap-1.5 text-[12px] font-medium text-ink-3">{eyebrow}</div>
        )}
        <h2 id={titleId} className="text-[15px] leading-tight font-semibold text-ink">
          {title}
        </h2>
        {subtitle && <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-ink-3">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

/* -- PageHeader ------------------------------------------------------------ */

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  /** Barra de filtros ou segmented desta página. */
  children?: ReactNode;
}

export function PageHeader({ title, description, eyebrow, actions, children }: PageHeaderProps) {
  return (
    <header className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-1.5 flex items-center gap-2 text-[12px] font-medium text-ink-3">{eyebrow}</div>
          )}
          <h1 className="text-[24px] leading-[1.15] font-semibold text-ink sm:text-[30px]">{title}</h1>
          <AccentRule className="mt-3" />
          {description && <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-ink-3">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

/* -- SectionLabel ---------------------------------------------------------- */

/** Rótulo de seção em sentence case — nunca eyebrow mono em CAIXA ALTA. */
export function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline pb-2">
      <h2 className="text-[12px] font-semibold text-ink-3">{children}</h2>
      {action}
    </div>
  );
}

/* -- StatTile -------------------------------------------------------------- */

interface StatTileProps {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  footer?: ReactNode;
  /** Cor do valor, sempre via token: 'var(--crit-ink)'. */
  accent?: string;
  tone?: 'plain' | 'band';
  onClick?: () => void;
  className?: string;
}

export function StatTile({ label, value, detail, icon, footer, accent, tone = 'plain', onClick, className }: StatTileProps) {
  const conteudo = (
    <>
      <div className="relative flex items-start justify-between gap-3">
        <span className="text-[12px] font-medium text-ink-3">{label}</span>
        {icon && <span className="text-ink-4">{icon}</span>}
      </div>
      <div className="relative mt-2 flex items-baseline gap-2">
        <span
          className="font-mono text-[24px] leading-none font-medium tracking-tight"
          style={accent ? { color: accent } : undefined}
        >
          <span className={accent ? '' : 'text-ink'}>{value}</span>
        </span>
        {detail && <span className="text-[12px] text-ink-3">{detail}</span>}
      </div>
      {footer && (
        <div className="relative mt-3 flex items-center justify-between gap-2 border-t border-hairline pt-2.5 text-[11px] text-ink-3">
          {footer}
        </div>
      )}
    </>
  );
  const base = cn('flex flex-col rounded-xl p-4', tone === 'band' ? 'bg-surface-2' : 'bg-surface', className);
  if (onClick) {
    return (
      <motion.button
        type="button"
        whileTap={press}
        onClick={onClick}
        className={cn(base, 'text-left transition-colors hover:bg-surface-hover')}
      >
        {conteudo}
      </motion.button>
    );
  }
  return <div className={base}>{conteudo}</div>;
}

/* -- Metric ---------------------------------------------------------------- */

/**
 * Um número sem caixa em volta, para os poucos números que ABREM uma tela.
 * `tone="brand"` marca O número que responde "e agora?" — um por fileira.
 */
export function Metric({
  value,
  label,
  tone = 'default',
  className,
}: {
  value: ReactNode;
  label: ReactNode;
  tone?: 'default' | 'brand' | 'crit';
  className?: string;
}) {
  return (
    <div className={className}>
      <span
        className={cn(
          'block font-mono text-[30px] leading-none font-medium tracking-tight',
          tone === 'crit' ? 'text-crit-ink' : tone === 'brand' ? 'text-brand-text' : 'text-ink',
        )}
      >
        {value}
      </span>
      <span className={cn('mt-2 block text-[12px] font-medium', tone === 'brand' ? 'text-ink-2' : 'text-ink-3')}>
        {label}
      </span>
    </div>
  );
}

/* -- Row ------------------------------------------------------------------- */

interface RowProps {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  active?: boolean;
  /** 'crit' marca a linha estourada com o trilho vermelho. */
  tone?: 'default' | 'crit';
  className?: string;
  as?: 'div' | 'li';
}

/**
 * Item de lista clicável. Um trilho de 2px na borda esquerda marca a linha
 * ativa (azul) e a estourada (vermelha). Nunca fundo tingido na linha inteira.
 */
export function Row({ children, onClick, href, active, tone = 'default', className, as = 'div' }: RowProps) {
  const clicavel = Boolean(onClick || href);
  const classes = cn(
    'relative block w-full text-left transition-colors',
    clicavel && 'cursor-pointer',
    active ? 'bg-surface-2' : clicavel ? 'hover:bg-surface-hover' : '',
    className,
  );
  const trilho = (active || tone === 'crit') && (
    <span className={cn('absolute inset-y-0 left-0 w-0.5', active ? 'bg-brand' : 'bg-crit')} />
  );
  if (href) {
    return (
      <motion.a href={href} whileTap={press} className={classes}>
        {trilho}
        {children}
      </motion.a>
    );
  }
  if (onClick) {
    return (
      <motion.button type="button" whileTap={press} onClick={onClick} className={classes}>
        {trilho}
        {children}
      </motion.button>
    );
  }
  const Tag = as;
  return (
    <Tag className={classes}>
      {trilho}
      {children}
    </Tag>
  );
}

/* -- EmptyState ------------------------------------------------------------ */

export function EmptyState({
  title,
  message,
  icon,
  action,
  compact = false,
}: {
  title: ReactNode;
  message?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'gap-2 px-6 py-10' : 'gap-3 px-6 py-16',
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-ink-4">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <div>
        <p className="text-[13px] font-semibold text-ink">{title}</p>
        {message && <p className="mx-auto mt-1 max-w-sm text-[12px] leading-relaxed text-ink-3">{message}</p>}
      </div>
      {action}
    </div>
  );
}

/* -- Skeleton -------------------------------------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('shimmer rounded-md', className)} />;
}

/* -- DataList -------------------------------------------------------------- */

const COLUNAS = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
} as const;

export function DataList({
  items,
  cols = 2,
  className,
}: {
  items: Array<{ label: ReactNode; value: ReactNode }>;
  cols?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  return (
    <dl className={cn('grid gap-x-5 gap-y-3', COLUNAS[cols], className)}>
      {items.map((item, i) => (
        <div key={i} className="min-w-0">
          <dt className="text-[11px] font-medium text-ink-4">{item.label}</dt>
          <dd className="mt-0.5 text-[13px] font-medium text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* -- Callout --------------------------------------------------------------- */

export type CalloutTone = 'info' | 'warn' | 'crit' | 'ok';

const RAIL: Record<CalloutTone, string> = {
  info: 'bg-brand',
  warn: 'bg-warn',
  crit: 'bg-crit',
  ok: 'bg-ink-4',
};
const CALLOUT_TEXT: Record<CalloutTone, string> = {
  info: 'text-ink',
  warn: 'text-warn-ink',
  crit: 'text-crit-ink',
  ok: 'text-ink',
};

/**
 * Caixa tingida com borda combinando era a coisa mais barulhenta da página.
 * O tom vive num trilho de 2px na esquerda; a caixa é só a superfície recuada.
 */
export function Callout({
  tone = 'info',
  title,
  icon,
  children,
  className,
}: {
  tone?: CalloutTone;
  title?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('relative flex gap-2.5 overflow-hidden rounded-lg bg-surface-2 p-3.5 pl-4', className)}>
      <span className={cn('absolute inset-y-0 left-0 w-0.5', RAIL[tone])} />
      {icon && <span className={cn('mt-px shrink-0', CALLOUT_TEXT[tone])}>{icon}</span>}
      <div className="min-w-0 text-[12px] leading-relaxed">
        {title && <p className={cn('font-semibold', CALLOUT_TEXT[tone])}>{title}</p>}
        {children && <div className={cn(title && 'mt-1', 'text-ink-2')}>{children}</div>}
      </div>
    </div>
  );
}

/* -- Tabs ------------------------------------------------------------------ */

export interface TabItem<T extends string> {
  id: T;
  label: ReactNode;
  count?: number;
}

/** Abas com sublinhado. O `layoutId` precisa ser único por instância. */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  layoutId,
  label,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  layoutId: string;
  label?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="scroll-slim -mb-px flex gap-1 overflow-x-auto border-b border-hairline"
    >
      {items.map((item) => {
        const active = item.id === value;
        return (
          <motion.button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            whileTap={press}
            onClick={() => onChange(item.id)}
            className={cn(
              'relative shrink-0 px-3.5 py-2.5 text-[13px] transition-colors',
              active ? 'font-semibold text-ink' : 'font-medium text-ink-3 hover:text-ink',
            )}
          >
            <span className="flex items-center gap-1.5">
              {item.label}
              {item.count !== undefined && (
                <span
                  className={cn(
                    'rounded-sm px-1.5 py-px font-mono text-[10px] font-medium',
                    active ? 'bg-surface-3 text-ink-2' : 'bg-surface-2 text-ink-4',
                  )}
                >
                  {item.count}
                </span>
              )}
            </span>
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={{ duration: 0.22, ease: emphasis }}
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand"
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

/* -- ChevronAffordance ----------------------------------------------------- */

/** "Isto abre algo." Vai no fim de uma Row clicável, dentro de um `group`. */
export function ChevronAffordance({ className }: { className?: string }) {
  return (
    <ChevronRight
      aria-hidden="true"
      className={cn('h-4 w-4 shrink-0 text-ink-4 transition-colors group-hover:text-ink-2', className)}
    />
  );
}
