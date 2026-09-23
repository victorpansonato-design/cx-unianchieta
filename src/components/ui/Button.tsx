/**
 * Button — DESIGN_SYSTEM §10.1.
 *
 * Botões são PÍLULAS; superfícies são retângulos de 12px. Duas silhuetas para
 * o app inteiro, então a silhueta sozinha diz se a coisa é um lugar ou uma
 * ação — e por isso um botão não precisa de contorno para ser lido como botão.
 *
 * Variantes carregam significado, não aparência:
 * - primary: A ação mais importante da tela. UMA por view. O único lugar onde
 *   o azul preenche uma forma.
 * - secondary: alternativa real à primária. Preenchida, nunca contornada.
 * - ghost: terciária; vive em linha densa e toolbar.
 * - danger: destrutivo ou irreversível.
 *
 * Geometria e padding são listas SEPARADAS: emitir `px-3.5` e `px-0` juntos e
 * torcer para o segundo vencer não funciona (o Tailwind decide pela ordem na
 * folha, não no atributo). Um botão quadrado nunca recebe padding horizontal.
 */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/cn';
import { press } from '../../lib/motion';

/** Os handlers nativos de drag/animation colidem com os do Motion — omitidos do tipo. */
export type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration'
>;

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'xs' | 'sm' | 'md';

const BASE =
  'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap ' +
  'transition-colors duration-150 select-none ' +
  'disabled:pointer-events-none disabled:opacity-45';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-on-brand hover:bg-brand-hover',
  secondary: 'bg-surface-2 text-ink hover:bg-surface-3',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  danger: 'bg-crit text-white hover:brightness-110',
};

const SIZE: Record<ButtonSize, string> = {
  xs: 'h-7 text-[12px] gap-1.5 rounded-full',
  sm: 'h-8 text-[13px] gap-1.5 rounded-full',
  md: 'h-9.5 text-[13px] gap-2 rounded-full',
};
const PAD: Record<ButtonSize, string> = { xs: 'px-3', sm: 'px-3.5', md: 'px-4.5' };
const SQUARE: Record<ButtonSize, string> = { xs: 'w-7', sm: 'w-8', md: 'w-9.5' };

export interface ButtonProps extends NativeButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
  /** Botão só de ícone. Exige `aria-label`. */
  square?: boolean;
  full?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    icon,
    iconRight,
    square = false,
    full = false,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled}
      whileTap={disabled ? undefined : press}
      className={cn(
        BASE,
        VARIANT[variant],
        SIZE[size],
        square ? SQUARE[size] : PAD[size],
        full && 'w-full',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
      {iconRight}
    </motion.button>
  );
});

/** Ação inline no rodapé de card (DESIGN_SYSTEM §10.1). */
export const LinkButton = forwardRef<HTMLButtonElement, NativeButtonProps>(function LinkButton(
  { className, type = 'button', ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      whileTap={rest.disabled ? undefined : press}
      className={cn(
        'inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-2 transition-colors hover:text-ink disabled:opacity-45',
        className,
      )}
      {...rest}
    />
  );
});

/** Tamanho de ícone que acompanha cada tamanho de botão. */
export const ICONE_BOTAO: Record<ButtonSize, string> = {
  xs: 'h-3.5 w-3.5',
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
};
