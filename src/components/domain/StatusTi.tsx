/**
 * O lado do TI no vocabulário de status (DESIGN_SYSTEM §12).
 *
 * - "Em desenvolvimento" é o estado saudável: só a palavra, sem ponto.
 * - "Na fila do TI": ponto apagado. Ninguém pegou ainda, mas não é alarme.
 * - "Pronto para validar": é a vez do CX, então é o ponto da linha
 *   (enfatizado). É o que o CX precisa ver ao bater o olho no quadro.
 */
import type { Config, Processo, StatusTi } from '../../data/types';
import { nomeStatusTi, nomesTi } from '../../domain/ti';
import { cn } from '../../lib/cn';
import { Status } from '../ui/Badges';

export function StatusTiBadge({ status }: { status: StatusTi }) {
  const nome = nomeStatusTi(status);
  if (status === 'validar') {
    return (
      <Status tone="info" solid>
        {nome}
      </Status>
    );
  }
  if (status === 'fila') return <Status tone="muted">{nome}</Status>;
  return <Status tone="quiet">{nome}</Status>;
}

/** "TI · Fulano · Em desenvolvimento" — uma linha para card e lista. */
export function LinhaTi({ processo, config, className }: { processo: Processo; config: Config; className?: string }) {
  const nomes = nomesTi(processo, config);
  return (
    <p className={cn('flex min-w-0 items-center gap-1.5 text-[12px]', className)}>
      {nomes.length > 0 && (
        <span className="min-w-0 truncate text-ink-3" title={`Com ${nomes.join(', ')} no TI`}>
          <span className="text-ink-4">TI · </span>
          {nomes.length === 1 ? nomes[0] : `${nomes.length} pessoas`}
        </span>
      )}
      <StatusTiBadge status={processo.ti.status} />
    </p>
  );
}
