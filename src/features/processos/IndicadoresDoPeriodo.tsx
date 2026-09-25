/**
 * Os quatro números dos concluídos, com a comparação ao período anterior.
 * Usados no topo de Concluídos (na caixa de contraste) e no relatório.
 *
 * A comparação é uma linha pequena sob cada número: a seta diz a direção, e
 * só a piora ganha vermelho. No tempo médio, piorar é SUBIR (TrendIndicator
 * invertido). Sem nada no período anterior, não há o que comparar e a linha
 * diz isso, em vez de inventar um "+100%".
 */
import type { ReactNode } from 'react';
import { TrendIndicator } from '../../components/ui/Badges';
import { AnimatedNumber } from '../../components/ui/Charts';
import { Metric } from '../../components/ui/Surfaces';
import type { Processo, Snapshot } from '../../data/types';
import {
  anteriorA,
  calcularIndicadores,
  concluidosDoRecorte,
  infoPeriodo,
  intervaloDoPeriodo,
  lerRecorte,
  type IndicadoresConcluidos,
  type Intervalo,
} from '../../domain/concluidos';
import { lerFiltros, type FiltrosProcessos } from '../../domain/filtros';
import { cn } from '../../lib/cn';
import { formatarNumero } from '../../lib/text';

export interface ResumoDoPeriodo {
  filtros: FiltrosProcessos;
  intervalo: Intervalo;
  anterior: Intervalo;
  lista: Processo[];
  atual: IndicadoresConcluidos;
  doAnterior: IndicadoresConcluidos;
}

/** Tudo o que a tela e o relatório precisam, lido da URL. */
export function resumoDoPeriodo(s: Snapshot, query: URLSearchParams): ResumoDoPeriodo {
  const filtros = lerFiltros(query);
  const { periodo, deslocamento } = lerRecorte(query);
  const intervalo = intervaloDoPeriodo(periodo, deslocamento);
  const anterior = anteriorA(intervalo);
  const lista = concluidosDoRecorte(s, filtros, intervalo);
  return {
    filtros,
    intervalo,
    anterior,
    lista,
    atual: calcularIndicadores(lista),
    doAnterior: calcularIndicadores(concluidosDoRecorte(s, filtros, anterior)),
  };
}

function Comparacao({
  atual,
  anterior,
  frase,
  unidade = '',
  invertido = false,
}: {
  atual: number | null;
  anterior: number | null;
  frase: string;
  unidade?: string;
  invertido?: boolean;
}) {
  if (atual === null) return null;
  if (anterior === null) return <span className="text-[11.5px] text-ink-3">Sem dados no período anterior</span>;
  const delta = atual - anterior;
  const direcao = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const texto = delta === 0 ? 'igual' : `${delta > 0 ? '+' : '−'}${formatarNumero(Math.abs(delta))}${unidade}`;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-ink-3">
      <TrendIndicator direcao={direcao} invertido={invertido}>
        {texto}
      </TrendIndicator>
      em relação {frase}
    </span>
  );
}

function Celula({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-2', className)}>{children}</div>;
}

export function IndicadoresDoPeriodo({
  resumo,
  animar = true,
  celula,
}: {
  resumo: ResumoDoPeriodo;
  /** Na folha impressa, o número já nasce pronto. */
  animar?: boolean;
  /** Classe de cada célula (padding na caixa de contraste). */
  celula?: string;
}) {
  const { atual, doAnterior } = resumo;
  const frase = infoPeriodo(resumo.intervalo.periodo).comparacao;
  const numero = (v: number) => (animar ? <AnimatedNumber value={v} /> : formatarNumero(v));

  return (
    <>
      <Celula className={celula}>
        <Metric value={numero(atual.total)} label="Processos concluídos" />
        <Comparacao atual={atual.total} anterior={doAnterior.total} frase={frase} />
      </Celula>
      <Celula className={celula}>
        <Metric
          value={
            atual.tempoMedio === null ? (
              '—'
            ) : (
              <>
                {numero(atual.tempoMedio)}
                <span className="ml-1.5 font-sans text-[13px] font-medium text-ink-3">{atual.tempoMedio === 1 ? 'dia' : 'dias'}</span>
              </>
            )
          }
          label="Tempo médio até concluir"
        />
        <Comparacao atual={atual.tempoMedio} anterior={doAnterior.tempoMedio} frase={frase} unidade=" d" invertido />
      </Celula>
      <Celula className={celula}>
        <Metric
          value={
            atual.noPrazo.percentual === null ? (
              '—'
            ) : (
              <>
                {numero(atual.noPrazo.percentual)}
                <span className="ml-0.5 font-sans text-[13px] font-medium text-ink-3">%</span>
              </>
            )
          }
          label={
            atual.noPrazo.comPrazo
              ? `Entregues no prazo (${atual.noPrazo.dentro} de ${atual.noPrazo.comPrazo})`
              : 'Entregues no prazo'
          }
        />
        <Comparacao atual={atual.noPrazo.percentual} anterior={doAnterior.noPrazo.percentual} frase={frase} unidade=" p.p." />
      </Celula>
      <Celula className={celula}>
        <Metric value={numero(atual.setores)} label="Setores atendidos" />
        <Comparacao atual={atual.setores} anterior={doAnterior.setores} frase={frase} />
      </Celula>
    </>
  );
}
