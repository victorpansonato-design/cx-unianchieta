/**
 * Peças do painel e do "Meu trabalho": lista curta de processos, barras de
 * processos por etapa e atividade recente.
 */
import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { rotas } from '../../app/router';
import { PrazoStatus } from '../../components/domain/StatusProcesso';
import { Card, CardHeader, Row } from '../../components/ui/Surfaces';
import type { Andamento, Processo, Snapshot } from '../../data/types';
import { estaVencido } from '../../domain/processos';
import { cn } from '../../lib/cn';
import { formatarRelativo } from '../../lib/dates';
import { press } from '../../lib/motion';

/** Card com uma lista curta de processos (até `limite`), ou a frase do vazio. */
export function CardDeProcessos({
  titulo,
  subtitulo,
  processos,
  vazio,
  detalhe,
  limite = 6,
  verTodos,
}: {
  titulo: string;
  subtitulo?: string;
  processos: Processo[];
  vazio: string;
  /** O que mostrar à direita de cada linha. Padrão: o prazo. */
  detalhe?: (p: Processo) => ReactNode;
  limite?: number;
  /** Link para a lista completa, quando houver mais do que cabe. */
  verTodos?: string;
}) {
  const visiveis = processos.slice(0, limite);
  return (
    <Card padded={false} className="flex flex-col">
      <CardHeader className="px-5 pt-5 pb-3" title={titulo} subtitle={subtitulo} />
      {processos.length === 0 ? (
        <p className="px-5 pb-5 text-[12px] leading-relaxed text-ink-3">{vazio}</p>
      ) : (
        <ul className="divide-y divide-hairline border-t border-hairline">
          {visiveis.map((p) => (
            <li key={p.id}>
              <Row href={rotas.processo(p.codigo)} tone={estaVencido(p) ? 'crit' : 'default'}>
                <div className="flex items-center gap-3 px-5 py-2.5">
                  <span className="w-[52px] shrink-0 font-mono text-[11px] text-ink-4">{p.codigo}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{p.titulo}</span>
                  <span className="shrink-0">{detalhe ? detalhe(p) : <PrazoStatus processo={p} curto />}</span>
                </div>
              </Row>
            </li>
          ))}
        </ul>
      )}
      {verTodos && processos.length > limite && (
        <div className="mt-auto border-t border-hairline px-5 py-2.5">
          <motion.a href={verTodos} whileTap={press} className="text-[12px] font-medium text-ink-2 transition-colors hover:text-ink">
            Ver todos os {processos.length}
          </motion.a>
        </div>
      )}
    </Card>
  );
}

/**
 * Processos por etapa, na ordem do fluxo. Uma série só → tinta neutra, rótulo
 * direto em mono, sem legenda (a pergunta que responde: onde o trabalho está
 * acumulando?). A etapa que mais acumula ganha a tinta mais forte, para a
 * resposta aparecer antes de ler os números. Cada barra leva à lista filtrada.
 */
export function BarrasPorEtapa({ dados }: { dados: Array<{ etapaId: string; nome: string; total: number }> }) {
  const maximo = Math.max(1, ...dados.map((d) => d.total));
  return (
    <ul className="space-y-0.5" aria-label="Processos por etapa">
      {dados.map((d, i) => (
        <li key={d.etapaId}>
          <motion.a
            // A última etapa é a dos concluídos, que têm a página deles.
            href={i === dados.length - 1 ? rotas.concluidos() : rotas.processos({ etapa: d.etapaId })}
            whileTap={press}
            title={`${d.total} em “${d.nome}”`}
            className="group -mx-2 grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)_2rem] items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-surface-hover"
          >
            <span className={cn('truncate text-[12.5px]', d.total ? 'font-medium text-ink-2' : 'text-ink-4')}>
              <span className="mr-1.5 font-mono text-[11px] text-ink-4">{i + 1}</span>
              {d.nome}
            </span>
            <span className="relative h-2 rounded-full">
              {d.total > 0 && (
                <motion.span
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-full transition-colors group-hover:bg-ink-2',
                    d.total === maximo ? 'bg-ink-2' : 'bg-ink-4',
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${(d.total / maximo) * 100}%` }}
                  transition={{ duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
                />
              )}
            </span>
            <span className={cn('text-right font-mono text-[12px]', d.total ? 'text-ink' : 'text-ink-4')}>{d.total}</span>
          </motion.a>
        </li>
      ))}
    </ul>
  );
}

export function AtividadeRecente({ itens, s }: { itens: Andamento[]; s: Snapshot }) {
  const porId = new Map(s.processos.map((p) => [p.id, p]));
  if (itens.length === 0) {
    return <p className="px-5 pb-5 text-[12px] text-ink-3">Nada registrado ainda.</p>;
  }
  return (
    <ul className="divide-y divide-hairline border-t border-hairline">
      {itens.map((a) => {
        const p = porId.get(a.processoId);
        if (!p) return null;
        return (
          <li key={a.id}>
            <Row href={rotas.processo(p.codigo, 'andamentos')}>
              <div className="flex items-start gap-3 px-5 py-2.5">
                <span className="w-[52px] shrink-0 pt-px font-mono text-[11px] text-ink-4">{p.codigo}</span>
                <div className="min-w-0 flex-1">
                  <p className={cn('line-clamp-2 text-[12.5px] leading-snug', a.automatico ? 'text-ink-3' : 'text-ink-2')}>{a.texto}</p>
                  <p className="mt-0.5 text-[11px] text-ink-4">
                    {a.autor.nome} · {formatarRelativo(a.quando)}
                  </p>
                </div>
              </div>
            </Row>
          </li>
        );
      })}
    </ul>
  );
}
