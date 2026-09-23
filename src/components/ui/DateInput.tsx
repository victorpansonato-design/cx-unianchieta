/**
 * Campo de data — sempre dd/mm/aaaa, em qualquer navegador (acréscimo do projeto).
 *
 * O <input type="date"> nativo mostra o formato do idioma do navegador, e o
 * calendário dele (showPicker) falha dentro de iframe de outro domínio — que é
 * como o sistema pode rodar no Funcionário Online. Por isso: texto com máscara
 * + calendário próprio num popover. O valor é sempre 'AAAA-MM-DD'.
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { motion } from 'motion/react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import {
  formatarData,
  hoje,
  INICIAIS_SEMANA,
  lerDataBR,
  lerDateOnly,
  mascararDataBR,
  NOMES_MESES,
  paraDateOnly,
  type DateOnly,
} from '../../lib/dates';
import { press } from '../../lib/motion';
import { CONTROL } from './Fields';
import { Popover } from './Overlay';
import { LinkButton } from './Button';

/* -- Calendário ------------------------------------------------------------ */

function inicioDoMes(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function somarDiasData(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function Calendario({
  valor,
  onEscolher,
  onLimpar,
}: {
  valor: DateOnly | null;
  onEscolher: (d: DateOnly) => void;
  onLimpar?: () => void;
}) {
  const [foco, setFoco] = useState<Date>(() => lerDateOnly(valor) ?? lerDateOnly(hoje())!);
  const [mes, setMes] = useState<Date>(() => inicioDoMes(foco));
  const gradeRef = useRef<HTMLDivElement>(null);
  const hojeISO = hoje();

  const dias = useMemo(() => {
    const primeiro = inicioDoMes(mes);
    const inicio = somarDiasData(primeiro, -primeiro.getDay());
    return Array.from({ length: 42 }, (_, i) => somarDiasData(inicio, i));
  }, [mes]);

  useEffect(() => {
    gradeRef.current?.querySelector<HTMLButtonElement>(`[data-dia="${paraDateOnly(foco)}"]`)?.focus();
  }, [foco]);

  const moverFoco = (novo: Date) => {
    setFoco(novo);
    if (novo.getMonth() !== mes.getMonth() || novo.getFullYear() !== mes.getFullYear()) setMes(inicioDoMes(novo));
  };

  const teclar = (e: KeyboardEvent) => {
    const passos: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (e.key in passos) {
      e.preventDefault();
      moverFoco(somarDiasData(foco, passos[e.key]));
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault();
      const x = new Date(foco);
      x.setMonth(x.getMonth() + (e.key === 'PageUp' ? -1 : 1));
      moverFoco(x);
    }
  };

  const trocarMes = (delta: number) => {
    const x = new Date(mes);
    x.setMonth(x.getMonth() + delta);
    setMes(x);
  };

  return (
    <div className="w-[264px] p-2">
      <div className="mb-2 flex items-center justify-between">
        <motion.button
          type="button"
          whileTap={press}
          aria-label="Mês anterior"
          onClick={() => trocarMes(-1)}
          className="flex h-7 w-7 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" />
        </motion.button>
        <p className="text-[13px] font-semibold text-ink" aria-live="polite">
          {NOMES_MESES[mes.getMonth()].replace(/^./, (c) => c.toUpperCase())} de {mes.getFullYear()}
        </p>
        <motion.button
          type="button"
          whileTap={press}
          aria-label="Próximo mês"
          onClick={() => trocarMes(1)}
          className="flex h-7 w-7 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <ChevronRight className="h-4 w-4" />
        </motion.button>
      </div>
      <div className="grid grid-cols-7 text-center" aria-hidden="true">
        {INICIAIS_SEMANA.map((d, i) => (
          <span key={i} className="py-1 text-[11px] font-medium text-ink-4">
            {d}
          </span>
        ))}
      </div>
      <div ref={gradeRef} role="grid" onKeyDown={teclar} className="grid grid-cols-7 gap-y-0.5">
        {dias.map((d) => {
          const iso = paraDateOnly(d);
          const doMes = d.getMonth() === mes.getMonth();
          const selecionado = iso === valor;
          const ehHoje = iso === hojeISO;
          const focado = iso === paraDateOnly(foco);
          return (
            <motion.button
              key={iso}
              type="button"
              role="gridcell"
              data-dia={iso}
              whileTap={press}
              tabIndex={focado ? 0 : -1}
              data-autofocus={focado || undefined}
              aria-selected={selecionado}
              aria-label={formatarData(iso)}
              onClick={() => onEscolher(iso)}
              className={cn(
                'relative mx-auto flex h-8 w-8 items-center justify-center rounded-full font-mono text-[12px] transition-colors',
                selecionado
                  ? 'bg-ink font-semibold text-canvas'
                  : doMes
                    ? 'text-ink hover:bg-surface-2'
                    : 'text-ink-4 hover:bg-surface-2',
                ehHoje && !selecionado && 'font-semibold',
              )}
            >
              {d.getDate()}
              {ehHoje && !selecionado && (
                <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-ink-3" />
              )}
            </motion.button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-hairline px-1 pt-2">
        <LinkButton onClick={() => onEscolher(hojeISO)}>Hoje</LinkButton>
        {onLimpar && valor && <LinkButton onClick={onLimpar}>Limpar</LinkButton>}
      </div>
    </div>
  );
}

/* -- DateInput ------------------------------------------------------------- */

export function DateInput({
  value,
  onChange,
  id,
  'aria-label': ariaLabel,
  placeholder = 'dd/mm/aaaa',
  className,
  variant = 'filled',
  tone,
}: {
  value: DateOnly | null;
  onChange: (valor: DateOnly | null) => void;
  id?: string;
  'aria-label'?: string;
  placeholder?: string;
  className?: string;
  /** "inline": lê como texto até o hover — para o painel de campos do processo. */
  variant?: 'filled' | 'inline';
  /** "crit": a data já passou (prazo vencido). */
  tone?: 'crit';
}) {
  const [texto, setTexto] = useState(formatarData(value, ''));
  const [aberto, setAberto] = useState(false);
  const [invalida, setInvalida] = useState(false);
  const caixaRef = useRef<HTMLDivElement>(null);
  const editando = useRef(false);

  useEffect(() => {
    if (!editando.current) setTexto(formatarData(value, ''));
  }, [value]);

  const confirmar = () => {
    editando.current = false;
    const t = texto.trim();
    if (!t) {
      setInvalida(false);
      if (value !== null) onChange(null);
      return;
    }
    const iso = lerDataBR(t);
    if (iso) {
      setInvalida(false);
      if (iso !== value) onChange(iso);
      setTexto(formatarData(iso, ''));
    } else {
      setInvalida(true);
      setTexto(formatarData(value, ''));
      window.setTimeout(() => setInvalida(false), 2400);
    }
  };

  const escolher = (iso: DateOnly | null) => {
    setAberto(false);
    setInvalida(false);
    setTexto(formatarData(iso, ''));
    if (iso !== value) onChange(iso);
  };

  return (
    <div ref={caixaRef} className={cn('relative', className)}>
      <input
        id={id}
        value={texto}
        inputMode="numeric"
        aria-label={ariaLabel}
        aria-invalid={invalida || undefined}
        placeholder={placeholder}
        onFocus={() => (editando.current = true)}
        onChange={(e) => setTexto(mascararDataBR(e.target.value))}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'ArrowDown' && e.altKey) setAberto(true);
        }}
        className={cn(
          variant === 'filled'
            ? cn(CONTROL, 'h-9 pr-9 font-mono')
            : 'h-8 w-full min-w-0 rounded-md bg-transparent px-2 pr-8 font-mono text-[13px] transition-colors placeholder:text-ink-4 hover:bg-surface-2 focus:bg-surface-2 focus:ring-2 focus:ring-focus focus:outline-none',
          tone === 'crit' ? 'text-crit-ink' : 'text-ink',
          invalida && 'ring-2 ring-crit',
        )}
      />
      <motion.button
        type="button"
        whileTap={press}
        aria-label="Abrir calendário"
        aria-haspopup="dialog"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className={cn(
          'absolute top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full text-ink-4 transition-colors hover:bg-surface-3 hover:text-ink',
          variant === 'filled' ? 'right-1.5 h-7 w-7' : 'right-0.5 h-7 w-7',
        )}
      >
        <CalendarDays className="h-3.5 w-3.5" />
      </motion.button>
      {invalida && (
        <p role="alert" className="absolute top-full left-0 mt-1 text-[11.5px] font-medium text-crit">
          Data inválida. Use dd/mm/aaaa.
        </p>
      )}
      <Popover open={aberto} onClose={() => setAberto(false)} anchorRef={caixaRef} align="start" label="Calendário">
        <Calendario valor={value} onEscolher={escolher} onLimpar={() => escolher(null)} />
      </Popover>
    </div>
  );
}
