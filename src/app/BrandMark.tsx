/**
 * Marca na sidebar.
 *
 * O logo oficial é carregado de src/assets/brand/logo.(svg|png|webp) se o
 * arquivo existir — basta colocá-lo lá. Sem arquivo, o monograma "A" no azul
 * registrado (--brand-mark) ocupa o lugar e o build não quebra.
 *
 * Sidebar recolhida (68px) sempre mostra o monograma: o wordmark não cabe.
 * O logo nunca é re-tingido; o monograma é o único peso 700+ do app, porque é
 * ativo de marca e não tipografia de UI. Sob o nome do sistema, o traço
 * amarelo — o mesmo que fica sob o título de cada página.
 */
import { AccentRule } from '../components/ui/Surfaces';
import { APP_NAME } from '../config/app';

const logos = import.meta.glob<string>('../assets/brand/logo.{svg,png,webp}', {
  eager: true,
  import: 'default',
});

export const LOGO_URL: string | null = Object.values(logos)[0] ?? null;

export function Monograma({ tamanho = 32 }: { tamanho?: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-md text-white select-none"
      style={{
        width: tamanho,
        height: tamanho,
        backgroundColor: 'var(--brand-mark)',
        fontSize: Math.round(tamanho * 0.55),
        fontWeight: 800,
        fontStyle: 'italic',
        letterSpacing: '-0.04em',
      }}
    >
      A
    </span>
  );
}

export function BrandMark({ recolhida = false }: { recolhida?: boolean }) {
  if (recolhida) {
    return (
      <span className="flex items-center" title={APP_NAME}>
        <Monograma />
        <span className="sr-only">{APP_NAME}</span>
      </span>
    );
  }
  if (LOGO_URL) {
    // Logo em destaque no topo e o nome do sistema embaixo, como nos outros
    // sistemas do grupo.
    return (
      <span className="flex min-w-0 flex-col items-start gap-2">
        <img
          src={LOGO_URL}
          alt="Grupo Anchieta"
          className="h-auto w-[168px] max-w-full shrink-0 select-none"
          draggable={false}
        />
        <span className="truncate text-[12px] font-medium text-ink-3">{APP_NAME}</span>
        <AccentRule className="mt-0.5" />
      </span>
    );
  }
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Monograma />
      <span className="min-w-0 text-[13px] leading-tight font-semibold text-ink">{APP_NAME}</span>
    </span>
  );
}
