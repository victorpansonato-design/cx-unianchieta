/**
 * Gráficos — DESIGN_SYSTEM §11.
 *
 * SVG e CSS próprios, nenhuma biblioteca. Um gráfico só entra se responder a
 * uma pergunta que o número sozinho não responde; cor codifica status e nada
 * mais; valores e eixos em mono com figuras tabulares.
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/cn';
import { emphasis } from '../../lib/motion';

/* -- AnimatedNumber -------------------------------------------------------- */

const DURACAO = 620;
const easeOutCubic = (p: number) => 1 - (1 - p) ** 3;

/**
 * Conta do zero na montagem e faz tween entre valores nas atualizações — uma
 * mudança lê como movimento, não como corte seco. `resetOnChange` reconta do
 * zero quando cada atualização deve ler como uma contagem nova.
 */
export function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toLocaleString('pt-BR'),
  resetOnChange = false,
}: {
  value: number;
  format?: (n: number) => string;
  resetOnChange?: boolean;
}) {
  const [exibido, setExibido] = useState(0);
  const atual = useRef(0);

  useEffect(() => {
    const de = resetOnChange ? 0 : atual.current;
    const inicio = performance.now();
    let quadro = 0;
    const passo = (agora: number) => {
      const p = Math.min((agora - inicio) / DURACAO, 1);
      const v = de + (value - de) * easeOutCubic(p);
      atual.current = v;
      setExibido(v);
      if (p < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [value, resetOnChange]);

  return <>{format(exibido)}</>;
}

/* -- MeterBar -------------------------------------------------------------- */

const METER_TONE = {
  neutral: 'bg-ink-3',
  warn: 'bg-warn',
  crit: 'bg-crit',
} as const;

/** Uma proporção contra um total. Tinta por padrão; âmbar/vermelho só quando é aviso. */
export function MeterBar({
  value,
  max,
  tone = 'neutral',
  label,
  className,
}: {
  value: number;
  max: number;
  tone?: keyof typeof METER_TONE;
  /** Texto para leitor de tela: "3 de 7 tarefas concluídas". */
  label: string;
  className?: string;
}) {
  const proporcao = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-track', className)}
    >
      <motion.div
        className={cn('h-full rounded-full', METER_TONE[tone])}
        initial={{ width: 0 }}
        animate={{ width: `${proporcao * 100}%` }}
        transition={{ duration: 0.62, ease: emphasis }}
      />
    </div>
  );
}
