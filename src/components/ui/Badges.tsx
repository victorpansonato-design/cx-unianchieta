/**
 * Rótulos pequenos — DESIGN_SYSTEM §12.
 *
 * Há dois tipos e eles NÃO podem parecer iguais:
 * - Status: um VEREDITO sobre o qual você talvez tenha de agir. Ponto colorido
 *   + palavra, sem preenchimento, sem contorno. Dez linhas de palavra pontuada
 *   varrem numa passada e ainda deixam a linha crítica pular.
 * - Tag: um FATO sobre o registro. Chip preenchido quieto em ink-3, sem cor e
 *   sem ponto, porque não carrega urgência.
 *
 * O estado saudável não tem ponto (tone "quiet"): não há nada a fazer sobre
 * ele, e é esse silêncio que torna o âmbar e o vermelho visíveis.
 */
import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '../../lib/cn';
import { iniciais } from '../../lib/text';

export type StatusTone = 'ok' | 'warn' | 'risk' | 'crit' | 'info' | 'accent' | 'neutral' | 'muted' | 'quiet';

const DOT: Record<Exclude<StatusTone, 'quiet'>, string> = {
  ok: 'bg-ok',
  warn: 'bg-warn',
  // O amarelo do traço, emprestado só para a prioridade Média (pedido da
  // equipe). A palavra fica em tinta: texto amarelo não se lê sobre o branco.
  accent: 'bg-accent',
  risk: 'bg-risk',
  crit: 'bg-crit',
  info: 'bg-brand-2',
  neutral: 'bg-ink-4',
  muted: 'bg-ink-4',
};

/** Tinta para veredito enfatizado. Só `crit` ganha vermelho. */
const EMPHASIS_INK: Record<Exclude<StatusTone, 'quiet'>, string> = {
  ok: 'text-ink-2',
  warn: 'text-warn-ink',
  risk: 'text-risk-ink',
  crit: 'text-crit-ink',
  info: 'text-brand-text',
  accent: 'text-ink',
  neutral: 'text-ink-2',
  muted: 'text-ink-3',
};

/**
 * `solid` não é "fundo tingido + borda": é "este veredito é o ponto da linha",
 * e gasta peso de tinta em vez de preenchimento.
 */
export function Status({
  tone = 'neutral',
  solid = false,
  children,
  className,
  title,
}: {
  tone?: StatusTone;
  solid?: boolean;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  if (tone === 'quiet') {
    return (
      <span
        title={title}
        className={cn(
          'inline-flex shrink-0 items-center text-[12px] font-medium whitespace-nowrap text-ink-3',
          className,
        )}
      >
        {children}
      </span>
    );
  }
  return (
    <span
      title={title}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 text-[12px] whitespace-nowrap',
        solid ? `font-semibold ${EMPHASIS_INK[tone]}` : 'font-medium text-ink-2',
        className,
      )}
    >
      <span className={cn('h-1.25 w-1.25 shrink-0 rounded-full', DOT[tone])} />
      {children}
    </span>
  );
}

export function Tag({ children, className, title }: { children: ReactNode; className?: string; title?: string }) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex shrink-0 items-center rounded-sm bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-ink-3',
        className,
      )}
    >
      {children}
    </span>
  );
}

/* -- Avatar ---------------------------------------------------------------- */

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';
export type AvatarTone = 'neutral' | 'critico' | 'brand' | 'onBrand';

const AVATAR_SIZE: Record<AvatarSize, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-9 w-9 text-[12px]',
  lg: 'h-12 w-12 text-[15px]',
};

/** O tom é um passo de preenchimento, não um matiz. */
const AVATAR_TONE: Record<AvatarTone, string> = {
  neutral: 'bg-surface-2 text-ink-2',
  critico: 'bg-surface-3 text-ink',
  brand: 'bg-brand text-on-brand',
  onBrand: 'bg-white/15 text-on-brand',
};

/** Iniciais, nunca foto de estoque. Decorativo: o nome está no texto ao lado. */
export function Avatar({
  nome,
  size = 'sm',
  tone = 'neutral',
  className,
}: {
  nome: string;
  size?: AvatarSize;
  tone?: AvatarTone;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-medium select-none',
        AVATAR_SIZE[size],
        AVATAR_TONE[tone],
        className,
      )}
    >
      {iniciais(nome)}
    </span>
  );
}

/* -- TrendIndicator -------------------------------------------------------- */

/**
 * Subir não é automaticamente bom: é neutro. Só a piora ganha vermelho.
 *
 * `invertido` (acréscimo do projeto) é para o número em que MENOS é melhor,
 * como o tempo médio até concluir: lá é a subida que ganha o vermelho, e a
 * queda fica neutra. A seta continua dizendo a direção; só a tinta muda.
 */
export function TrendIndicator({
  direcao,
  invertido = false,
  children,
}: {
  direcao: 'up' | 'down' | 'flat';
  invertido?: boolean;
  children?: ReactNode;
}) {
  const Icone = direcao === 'up' ? ArrowUpRight : direcao === 'down' ? ArrowDownRight : Minus;
  const piorou = direcao === (invertido ? 'up' : 'down');
  const cor = direcao === 'flat' ? 'text-ink-4' : piorou ? 'text-crit-ink' : 'text-ink-2';
  return (
    <span className={cn('inline-flex items-center gap-0.5 font-mono text-[11.5px] font-medium', cor)}>
      <Icone className="h-3 w-3" />
      {children}
    </span>
  );
}

/* -- NewDot ---------------------------------------------------------------- */

/**
 * "Há algo novo aqui" (acréscimo do projeto): um ponto de 8px no canto de um
 * botão de ícone, sem número. Um número no header viraria mais um contador
 * para ler; o ponto só avisa que vale abrir. O anel na cor da superfície
 * separa o ponto do ícone sem desenhar contorno, como na pilha de avatares.
 */
export function NewDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('pointer-events-none absolute h-2 w-2 rounded-full bg-brand-2 ring-2 ring-surface', className)}
    />
  );
}

/* -- CountBadge ------------------------------------------------------------ */

/**
 * O único número da navegação: o badge da fila — o que muda o que você faz a
 * seguir. `tone="crit"` quando ele conta algo estourado.
 */
export function CountBadge({
  count,
  tone = 'neutral',
  sobreMarca = false,
}: {
  count: number;
  tone?: 'neutral' | 'crit';
  /** O item de nav ativo tem fundo azul: o badge vira translúcido. */
  sobreMarca?: boolean;
}) {
  return (
    <span
      className={cn(
        'ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 font-mono text-[10.5px] font-medium',
        sobreMarca
          ? 'bg-white/15 text-on-brand'
          : tone === 'crit'
            ? 'bg-crit-soft text-crit-ink'
            : 'bg-surface-2 text-ink-2',
      )}
    >
      {count}
    </span>
  );
}
