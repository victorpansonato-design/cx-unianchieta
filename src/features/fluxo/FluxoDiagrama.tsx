/**
 * Desenho do fluxo proposto.
 *
 * Os passos em sequência, da esquerda para a direita, quebrando em linhas
 * conforme a largura (uma coluna no celular). Nós em HTML — o texto quebra e
 * trunca como qualquer texto, nítido em qualquer tamanho —, conectores num SVG
 * por cima, calculados a partir da largura MEDIDA do contêiner (DESIGN_SYSTEM
 * §11: nada de viewBox esticado).
 *
 * O nó é uma superfície de 12px, um passo de contraste acima do fundo, sem
 * contorno (Regra 1). Setas em tinta apagada: a estrutura não disputa com o
 * conteúdo.
 */
import { useId, useMemo } from 'react';
import type { PassoFluxo } from '../../data/types';
import { cn } from '../../lib/cn';
import { useMeasure } from '../../lib/useMeasure';
import { Tag } from '../../components/ui/Badges';

const ALTURA = 92;
const GAP_X = 36;
const GAP_Y = 40;
const LARGURA_MIN = 176;
const LARGURA_MAX = 228;

interface Layout {
  colunas: number;
  largura: number;
  altura: number;
  posicoes: Array<{ x: number; y: number }>;
}

function calcularLayout(total: number, larguraDisponivel: number): Layout {
  const w = Math.max(larguraDisponivel, LARGURA_MIN);
  let colunas = Math.max(1, Math.floor((w + GAP_X) / (LARGURA_MIN + GAP_X)));
  colunas = Math.min(colunas, Math.max(total, 1));
  const largura = colunas === 1 ? w : Math.min(LARGURA_MAX, (w - GAP_X * (colunas - 1)) / colunas);
  const linhas = Math.ceil(total / colunas);
  const posicoes = Array.from({ length: total }, (_, i) => ({
    x: (i % colunas) * (largura + GAP_X),
    y: Math.floor(i / colunas) * (ALTURA + GAP_Y),
  }));
  return { colunas, largura, altura: linhas * ALTURA + Math.max(linhas - 1, 0) * GAP_Y, posicoes };
}

/** Caminho do passo i ao i+1: reto na mesma linha; em cotovelo na quebra de linha. */
function caminho(a: { x: number; y: number }, b: { x: number; y: number }, largura: number): string {
  if (a.y === b.y) {
    const y = a.y + ALTURA / 2;
    return `M ${a.x + largura + 2} ${y} L ${b.x - 6} ${y}`;
  }
  const sx = a.x + largura / 2;
  const sy = a.y + ALTURA + 2;
  const meio = sy + GAP_Y / 2 - 2;
  const ex = b.x + largura / 2;
  const ey = b.y - 6;
  return `M ${sx} ${sy} L ${sx} ${meio} L ${ex} ${meio} L ${ex} ${ey}`;
}

export function FluxoDiagrama({
  passos,
  tone = 'inset',
  className,
}: {
  passos: PassoFluxo[];
  /** "inset": nós um passo mais escuros (dentro de um card); "plain": nós claros (sobre o canvas). */
  tone?: 'inset' | 'plain';
  className?: string;
}) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  // Um id por instância: duas setas com o mesmo id apontariam para o marcador errado.
  const idSeta = `fluxo-seta-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const validos = passos.filter((p) => p.nome.trim() || p.responsavel.trim() || p.sistema.trim());
  const layout = useMemo(() => calcularLayout(validos.length, width), [validos.length, width]);

  // O contêiner medido existe sempre: se ele só montasse quando surgisse o
  // primeiro passo, o ResizeObserver (ligado na montagem) nunca o veria.
  return (
    <div ref={ref} className={cn('w-full', validos.length > 0 && className)}>
      {width > 0 && validos.length > 0 && (
        <div className="relative" style={{ height: layout.altura }}>
          <svg className="pointer-events-none absolute inset-0 overflow-visible" width="100%" height={layout.altura} aria-hidden="true">
            <defs>
              <marker id={idSeta} viewBox="0 0 8 8" refX="6" refY="4" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                <path d="M 0 0 L 8 4 L 0 8 z" className="fill-ink-4" />
              </marker>
            </defs>
            {layout.posicoes.slice(0, -1).map((a, i) => (
              <path
                key={i}
                d={caminho(a, layout.posicoes[i + 1], layout.largura)}
                className="fill-none stroke-ink-4"
                strokeWidth={1.5}
                strokeLinejoin="round"
                markerEnd={`url(#${idSeta})`}
              />
            ))}
          </svg>
          <ol aria-label="Fluxo proposto">
            {validos.map((p, i) => (
              <li
                key={p.id}
                className={cn('absolute flex flex-col rounded-xl p-3', tone === 'inset' ? 'bg-surface-2' : 'bg-surface')}
                style={{ left: layout.posicoes[i].x, top: layout.posicoes[i].y, width: layout.largura, height: ALTURA }}
              >
                <div className="flex items-start gap-2">
                  <span className="mt-px font-mono text-[11px] font-medium text-ink-4">{i + 1}</span>
                  <p className="line-clamp-2 min-w-0 text-[13px] leading-snug font-medium text-ink" title={p.nome}>
                    {p.nome || 'Passo sem nome'}
                  </p>
                </div>
                <div className="mt-auto flex min-w-0 items-center justify-between gap-2 pl-4">
                  <span className="min-w-0 truncate text-[11.5px] text-ink-3" title={p.responsavel}>
                    {p.responsavel || '—'}
                  </span>
                  {p.sistema && <Tag className="max-w-[50%] truncate">{p.sistema}</Tag>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
