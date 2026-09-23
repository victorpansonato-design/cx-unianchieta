/**
 * Base das páginas para imprimir ou salvar em PDF (resumo do processo e
 * relatório geral): barra de ações que some na impressão, folha A4 e tema
 * sempre claro — papel é branco, mesmo para quem usa o tema escuro.
 */
import { useLayoutEffect, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Printer } from 'lucide-react';
import { APP_INSTITUICAO, APP_NAME } from '../config/app';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/cn';
import { formatarMomento, agoraISO } from '../lib/dates';
import { press } from '../lib/motion';
import { LOGO_URL, Monograma } from './BrandMark';

/** Tira o tema escuro enquanto a página estiver aberta; devolve ao sair. */
export function useTemaClaroNaFolha() {
  useLayoutEffect(() => {
    const html = document.documentElement;
    const estavaEscuro = html.classList.contains('dark');
    if (!estavaEscuro) return;
    html.classList.remove('dark');
    html.style.colorScheme = 'light';
    return () => {
      html.classList.add('dark');
      html.style.colorScheme = 'dark';
    };
  }, []);
}

export function PaginaDeImpressao({
  voltarPara,
  voltarRotulo,
  paisagem = false,
  titulo,
  autor,
  children,
}: {
  voltarPara: string;
  voltarRotulo: string;
  paisagem?: boolean;
  titulo: string;
  autor: string;
  children: ReactNode;
}) {
  useTemaClaroNaFolha();
  return (
    <div className="min-h-screen bg-canvas px-4 py-6 sm:px-6 print:bg-white print:p-0">
      <div className={cn('mx-auto mb-4 flex items-center justify-between gap-3 print:hidden', paisagem ? 'max-w-[297mm]' : 'max-w-[210mm]')}>
        <motion.a
          href={voltarPara}
          whileTap={press}
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-3 transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {voltarRotulo}
        </motion.a>
        <Button variant="primary" size="sm" icon={<Printer className="h-3.5 w-3.5" />} onClick={() => window.print()}>
          Imprimir ou salvar em PDF
        </Button>
      </div>
      <article
        className={cn(
          'folha mx-auto rounded-xl bg-surface p-10 print:max-w-none print:rounded-none print:p-0',
          paisagem ? 'folha-paisagem max-w-[297mm]' : 'max-w-[210mm]',
        )}
      >
        <header className="mb-6 flex items-start justify-between gap-4 border-b border-hairline pb-4">
          <div className="flex items-center gap-3">
            {LOGO_URL ? <img src={LOGO_URL} alt="Grupo Anchieta" className="h-9 w-auto" /> : <Monograma tamanho={36} />}
            <div>
              <p className="text-[13px] font-semibold text-ink">{APP_NAME}</p>
              <p className="text-[11px] text-ink-3">{APP_INSTITUICAO}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[12px] font-semibold text-ink-2">{titulo}</p>
            <p className="text-[11px] text-ink-4">
              Gerado em {formatarMomento(agoraISO())} por {autor}
            </p>
          </div>
        </header>
        {children}
      </article>
    </div>
  );
}

/** Seção da folha que não se parte entre páginas. */
export function SecaoDaFolha({ titulo, children, className }: { titulo: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('break-inside-avoid', className)}>
      <h2 className="mb-2 border-b border-hairline pb-1.5 text-[12px] font-semibold text-ink-3">{titulo}</h2>
      {children}
    </section>
  );
}
