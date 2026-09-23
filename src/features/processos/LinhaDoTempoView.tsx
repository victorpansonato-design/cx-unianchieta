/**
 * Linha do tempo: cada processo é uma barra da abertura ao prazo, como um
 * cronograma — o que roda em paralelo e o que vence quando.
 *
 * Regras de gráfico (DESIGN_SYSTEM §11 e skill de dataviz):
 * - cor é status e nada mais: tinta para o previsto, vermelho SÓ no trecho de
 *   atraso (do prazo até hoje), apagado para concluído e cancelado;
 * - legenda sempre presente; datas em mono; grade de meses recessiva;
 * - barras em HTML (não SVG esticado): nítidas em qualquer largura, e cada
 *   linha é um link — Tab e setas caminham pelos processos, o tooltip segue o
 *   foco e o mouse.
 */
import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { rotas } from '../../app/router';
import { Card } from '../../components/ui/Surfaces';
import type { Processo, Snapshot } from '../../data/types';
import { diasDeAtraso, estaAtivo, estaVencido, etapaDe } from '../../domain/processos';
import { cn } from '../../lib/cn';
import { diasEntre, formatarData, hoje, lerDateOnly, NOMES_MESES, paraDateOnly, somarDias } from '../../lib/dates';
import { plural } from '../../lib/text';

const ROTULO = 'w-[180px] lg:w-[280px]';

interface Barra {
  de: string;
  ate: string;
  tipo: 'previsto' | 'atraso' | 'sem-prazo' | 'concluido' | 'cancelado';
}

const COR: Record<Barra['tipo'], string> = {
  previsto: 'bg-ink-3',
  atraso: 'bg-crit',
  'sem-prazo': 'bg-hairline-strong',
  concluido: 'bg-ink-4',
  cancelado: 'bg-track',
};

function barrasDe(p: Processo, referencia: string): Barra[] {
  const dataDe = (iso: string) => paraDateOnly(new Date(iso));
  if (p.situacao === 'concluido') return [{ de: p.abertura, ate: p.conclusao ?? dataDe(p.atualizadoEm), tipo: 'concluido' }];
  if (p.situacao === 'cancelado') return [{ de: p.abertura, ate: dataDe(p.atualizadoEm), tipo: 'cancelado' }];
  if (!p.prazo) return [{ de: p.abertura, ate: referencia, tipo: 'sem-prazo' }];
  if (estaVencido(p, referencia)) {
    // Prazo anterior à abertura (o processo já nasceu atrasado): só há atraso.
    if (p.prazo <= p.abertura) return [{ de: p.prazo, ate: referencia, tipo: 'atraso' }];
    return [
      { de: p.abertura, ate: p.prazo, tipo: 'previsto' },
      { de: p.prazo, ate: referencia, tipo: 'atraso' },
    ];
  }
  return [{ de: p.abertura < p.prazo ? p.abertura : p.prazo, ate: p.prazo > p.abertura ? p.prazo : p.abertura, tipo: 'previsto' }];
}

function descricaoDe(p: Processo, s: Snapshot, referencia: string) {
  const partes = [`Aberto em ${formatarData(p.abertura)}`];
  if (p.situacao === 'concluido') partes.push(`concluído em ${formatarData(p.conclusao)}`);
  else if (p.situacao === 'cancelado') partes.push('cancelado');
  else if (p.prazo) {
    partes.push(`prazo ${formatarData(p.prazo)}`);
    if (estaVencido(p, referencia)) partes.push(`vencido há ${plural(diasDeAtraso(p, referencia), 'dia', 'dias')}`);
  } else partes.push('sem prazo');
  const etapa = etapaDe(s.config, p.etapaId);
  if (etapa && estaAtivo(p)) partes.push(etapa.nome);
  return partes.join(' · ');
}

function Legenda() {
  const itens: Array<[Barra['tipo'], string]> = [
    ['previsto', 'Previsto (abertura → prazo)'],
    ['atraso', 'Atraso'],
    ['sem-prazo', 'Sem prazo definido'],
    ['concluido', 'Concluído'],
  ];
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5" aria-label="Legenda">
      {itens.map(([tipo, nome]) => (
        <li key={tipo} className="flex items-center gap-1.5 text-[11px] font-medium text-ink-3">
          <span className={cn('h-2 w-4 rounded-full', COR[tipo])} />
          {nome}
        </li>
      ))}
      <li className="flex items-center gap-1.5 text-[11px] font-medium text-ink-3">
        <span className="h-3 w-px bg-ink-2" />
        Hoje
      </li>
    </ul>
  );
}

export function LinhaDoTempoView({ processos, s }: { processos: Processo[]; s: Snapshot }) {
  const referencia = hoje();
  const [dica, setDica] = useState<{ texto: string; caixa: DOMRect } | null>(null);

  // Janela: da abertura mais antiga ao prazo/conclusão mais distante (e hoje), com folga.
  const { inicio, fim, meses } = useMemo(() => {
    const datas = processos.flatMap((p) => [p.abertura, p.prazo, p.conclusao].filter((d): d is string => Boolean(d)));
    datas.push(referencia);
    let ini = somarDias(datas.reduce((a, b) => (a < b ? a : b)), -7);
    let fi = somarDias(datas.reduce((a, b) => (a > b ? a : b)), 14);
    if (diasEntre(ini, fi) < 60) fi = somarDias(ini, 60);
    // Começa no dia 1 do mês, para a grade abrir num rótulo inteiro.
    const d0 = lerDateOnly(ini)!;
    ini = paraDateOnly(new Date(d0.getFullYear(), d0.getMonth(), 1));
    const ms: Array<{ data: string; rotulo: string }> = [];
    const cursor = new Date(d0.getFullYear(), d0.getMonth(), 1);
    while (paraDateOnly(cursor) <= fi) {
      const m = cursor.getMonth();
      const nome = NOMES_MESES[m].slice(0, 3);
      ms.push({
        data: paraDateOnly(cursor),
        rotulo: ms.length === 0 || m === 0 ? `${nome} ${cursor.getFullYear()}` : nome,
      });
      cursor.setMonth(m + 1);
    }
    return { inicio: ini, fim: fi, meses: ms };
  }, [processos, referencia]);

  const total = Math.max(diasEntre(inicio, fim), 1);
  const pos = (data: string) => Math.min(Math.max((diasEntre(inicio, data) / total) * 100, 0), 100);

  const teclar = (e: KeyboardEvent<HTMLAnchorElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const item = e.currentTarget.closest('li');
    const vizinho = e.key === 'ArrowDown' ? item?.nextElementSibling : item?.previousElementSibling;
    vizinho?.querySelector<HTMLAnchorElement>('a')?.focus();
  };

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="border-b border-hairline px-5 py-3">
        <Legenda />
      </div>
      <div className="scroll-slim overflow-x-auto">
        <div className="min-w-[760px]">
          {/* Régua dos meses */}
          <div className="flex border-b border-hairline">
            <div className={cn(ROTULO, 'shrink-0 px-5 py-2 text-[11px] font-medium text-ink-4')}>Processo</div>
            <div className="relative mr-5 h-8 flex-1">
              {meses.map((m) => (
                <span
                  key={m.data}
                  className="absolute top-1/2 -translate-y-1/2 pl-1.5 font-mono text-[10.5px] whitespace-nowrap text-ink-4"
                  style={{ left: `${pos(m.data)}%` }}
                >
                  {m.rotulo}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            {/* Grade recessiva + linha de hoje, atrás das linhas */}
            <div className="pointer-events-none absolute inset-y-0 right-5 left-[180px] lg:left-[280px]" aria-hidden="true">
              {meses.map((m) => (
                <span key={m.data} className="absolute inset-y-0 w-px bg-hairline" style={{ left: `${pos(m.data)}%` }} />
              ))}
              <span className="absolute inset-y-0 w-px bg-ink-2" style={{ left: `${pos(referencia)}%` }} />
            </div>

            <ul className="relative divide-y divide-hairline">
              {processos.map((p) => {
                const barras = barrasDe(p, referencia);
                const inicioBarra = Math.min(...barras.map((b) => pos(b.de)));
                const fimBarra = Math.max(...barras.map((b) => pos(b.ate)));
                const descricao = descricaoDe(p, s, referencia);
                const mostrar = (el: HTMLElement) => {
                  const barra = el.querySelector('[data-barra]');
                  if (barra) setDica({ texto: descricao, caixa: barra.getBoundingClientRect() });
                };
                return (
                  <li key={p.id}>
                    <a
                      href={rotas.processo(p.codigo)}
                      onKeyDown={teclar}
                      onMouseEnter={(e) => mostrar(e.currentTarget)}
                      onFocus={(e) => mostrar(e.currentTarget)}
                      onMouseLeave={() => setDica(null)}
                      onBlur={() => setDica(null)}
                      aria-label={`${p.codigo}: ${p.titulo}. ${descricao}`}
                      className="group flex h-11 items-center transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none"
                    >
                      <div className={cn(ROTULO, 'min-w-0 shrink-0 px-5')}>
                        <p className="truncate text-[12.5px] font-medium text-ink">
                          <span className="mr-1.5 font-mono text-[11px] text-ink-4">{p.codigo}</span>
                          {p.titulo}
                        </p>
                      </div>
                      <div className="relative mr-5 h-full flex-1">
                        {/* Extensão total da barra: é dela que o tooltip mede onde ficar. */}
                        <span
                          data-barra
                          className="pointer-events-none absolute top-1/2 h-2 -translate-y-1/2"
                          style={{ left: `${inicioBarra}%`, width: `max(6px, ${fimBarra - inicioBarra}%)` }}
                        />
                        {barras.map((b, i) => {
                          const esquerda = pos(b.de);
                          const largura = Math.max(pos(b.ate) - esquerda, 0);
                          return (
                            <span
                              key={i}
                              className={cn('absolute top-1/2 h-2 -translate-y-1/2 rounded-full', COR[b.tipo])}
                              style={{
                                // 2px de superfície entre o previsto e o atraso: o encontro fica legível.
                                left: `calc(${esquerda}% + ${i > 0 ? 2 : 0}px)`,
                                width: `max(6px, calc(${largura}% - ${i > 0 ? 2 : 0}px))`,
                              }}
                            />
                          );
                        })}
                      </div>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
      <Dica dica={dica} />
    </Card>
  );
}

/**
 * Tooltip da barra, fora do card (portal, posição fixa): o contêiner rolável
 * da linha do tempo cortaria qualquer coisa que passasse da borda dele.
 * Fica ao lado da barra, do lado que tiver espaço; se nenhum tiver, em cima.
 */
function Dica({ dica }: { dica: { texto: string; caixa: DOMRect } | null }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    if (!dica || !ref.current) {
      setPos(null);
      return;
    }
    const w = ref.current.offsetWidth;
    const h = ref.current.offsetHeight;
    const { caixa } = dica;
    const meio = caixa.top + caixa.height / 2 - h / 2;
    if (caixa.right + 12 + w <= window.innerWidth - 8) setPos({ left: caixa.right + 12, top: meio });
    else if (caixa.left - 12 - w >= 8) setPos({ left: caixa.left - 12 - w, top: meio });
    else setPos({ left: Math.max(8, Math.min(caixa.left, window.innerWidth - w - 8)), top: caixa.top - h - 8 });
  }, [dica]);

  if (!dica) return null;
  return createPortal(
    <span
      ref={ref}
      role="tooltip"
      className="pointer-events-none fixed z-50 rounded-lg bg-surface px-2.5 py-1.5 text-[11.5px] font-medium whitespace-nowrap text-ink-2 shadow-overlay"
      style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}
    >
      {dica.texto}
    </span>,
    document.body,
  );
}
