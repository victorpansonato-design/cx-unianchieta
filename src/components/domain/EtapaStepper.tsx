/**
 * Barra de progresso das etapas.
 *
 * Um segmento por etapa: percorridas em tinta média, a atual em tinta cheia,
 * as futuras no trilho. Sob cada percorrida, a data em que o processo entrou
 * nela. Cor nenhuma: o progresso é estrutura, não status (Regra 4).
 * Clicar numa etapa pede para mover o processo até ela.
 */
import { motion } from 'motion/react';
import type { Config, Processo } from '../../data/types';
import { entradasPorEtapa, indiceEtapa } from '../../domain/processos';
import { cn } from '../../lib/cn';
import { formatarDataCurta, paraDateOnly } from '../../lib/dates';
import { press } from '../../lib/motion';

export function EtapaStepper({
  processo,
  config,
  onEscolher,
}: {
  processo: Processo;
  config: Config;
  onEscolher?: (etapaId: string) => void;
}) {
  const atual = indiceEtapa(config, processo.etapaId);
  const entradas = entradasPorEtapa(processo);

  return (
    <ol aria-label="Etapas do processo" className="scroll-slim -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {config.etapas.map((etapa, i) => {
        const estado = i < atual ? 'feita' : i === atual ? 'atual' : 'futura';
        const entrada = i <= atual ? entradas.get(etapa.id) : undefined;
        const conteudo = (
          <>
            <span
              className={cn(
                'block h-1 w-full rounded-full transition-colors',
                estado === 'feita' ? 'bg-ink-3' : estado === 'atual' ? 'bg-ink' : 'bg-track',
              )}
            />
            <span
              className={cn(
                'mt-2 line-clamp-2 min-h-[2lh] text-[12px] leading-tight',
                estado === 'atual' ? 'font-semibold text-ink' : estado === 'feita' ? 'font-medium text-ink-2' : 'font-medium text-ink-4',
              )}
            >
              <span className="mr-1 font-mono text-[11px] text-ink-4">{i + 1}</span>
              {etapa.nome}
            </span>
            <span className="mt-0.5 block h-4 font-mono text-[11px] text-ink-4">
              {entrada ? formatarDataCurta(paraDateOnly(new Date(entrada))) : ''}
            </span>
          </>
        );
        return (
          <li key={etapa.id} className="min-w-[96px] flex-1" aria-current={estado === 'atual' ? 'step' : undefined}>
            {onEscolher && estado !== 'atual' ? (
              <motion.button
                type="button"
                whileTap={press}
                onClick={() => onEscolher(etapa.id)}
                title={`Mover para “${etapa.nome}”`}
                className="group block w-full rounded-sm text-left"
              >
                {conteudo}
              </motion.button>
            ) : (
              <div title={estado === 'atual' ? 'Etapa atual' : undefined}>{conteudo}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
