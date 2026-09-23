/**
 * Status da demanda. "Nova" pede triagem → âmbar (atenção). Aceita é o estado
 * resolvido → só a palavra. Recusada → ponto apagado.
 */
import { Status } from '../../components/ui/Badges';
import type { Demanda, Snapshot } from '../../data/types';

export function StatusDaDemanda({ demanda, s }: { demanda: Demanda; s: Snapshot }) {
  if (demanda.status === 'nova') return <Status tone="warn">Nova</Status>;
  if (demanda.status === 'recusada') return <Status tone="muted">Recusada</Status>;
  const p = demanda.processoId ? s.processos.find((x) => x.id === demanda.processoId) : undefined;
  return <Status tone="quiet">{p ? `Virou ${p.codigo}` : 'Virou processo'}</Status>;
}
