/**
 * Indicador discreto de salvamento automático.
 *
 * "Salvando…" só aparece se a gravação demorar: no armazenamento local ela
 * leva milissegundos, e piscar a palavra a cada tecla seria ruído.
 */
import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import { useSalvamento } from '../hooks/useStore';
import { formatarHora } from '../lib/dates';

const ATRASO_SALVANDO = 400;

export function SaveIndicator() {
  const s = useSalvamento();
  const [mostrarSalvando, setMostrarSalvando] = useState(false);

  useEffect(() => {
    if (s.status !== 'salvando') {
      setMostrarSalvando(false);
      return;
    }
    const t = window.setTimeout(() => setMostrarSalvando(true), ATRASO_SALVANDO);
    return () => window.clearTimeout(t);
  }, [s.status]);

  if (s.status === 'ocioso' || (s.status === 'salvando' && !mostrarSalvando && !s.em)) return null;

  if (s.status === 'erro') {
    return (
      <span role="status" title={s.mensagem} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-crit-ink">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Não salvo</span>
      </span>
    );
  }

  if (s.status === 'salvando' && mostrarSalvando) {
    return (
      <span role="status" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-4">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span className="hidden sm:inline">Salvando…</span>
      </span>
    );
  }

  return (
    <span
      role="status"
      title={s.em ? `Tudo salvo neste navegador às ${formatarHora(s.em)}` : undefined}
      className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-4"
    >
      <Check className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Salvo</span>
    </span>
  );
}
