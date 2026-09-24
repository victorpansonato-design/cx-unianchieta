/**
 * Sidebar — DESIGN_SYSTEM §9.
 *
 * O que se usa todo dia fica plano e visível. Um único número na navegação:
 * os prazos vencidos, porque é o único que muda o que você faz a seguir.
 * No celular, o mesmo conteúdo vive num drawer que entra pela esquerda.
 */
import { useMemo, type ComponentType } from 'react';
import { motion } from 'motion/react';
import {
  FolderCheck,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  UserRoundCheck,
} from 'lucide-react';
import { CountBadge } from '../components/ui/Badges';
import { contarVencidos } from '../domain/processos';
import { usePrefsUI } from '../hooks/usePreferencias';
import { useStore } from '../hooks/useStore';
import { cn } from '../lib/cn';
import { press, spring } from '../lib/motion';
import { atualizarPrefsUI } from '../services/preferencias';
import { BrandMark, LOGO_URL } from './BrandMark';
import { rotas, type Rota } from './router';

type Secao = 'painel' | 'meu-trabalho' | 'processos' | 'concluidos' | 'demandas' | 'notas' | 'configuracoes';

interface ItemNav {
  id: Secao;
  label: string;
  href: string;
  Icone: ComponentType<{ className?: string }>;
}

const ITENS: ItemNav[] = [
  { id: 'painel', label: 'Painel', href: rotas.painel(), Icone: LayoutDashboard },
  { id: 'meu-trabalho', label: 'Meu trabalho', href: rotas.meuTrabalho(), Icone: UserRoundCheck },
  { id: 'processos', label: 'Processos', href: rotas.processos(), Icone: FolderKanban },
  { id: 'concluidos', label: 'Concluídos', href: rotas.concluidos(), Icone: FolderCheck },
  { id: 'demandas', label: 'Demandas', href: rotas.demandas(), Icone: Inbox },
  { id: 'notas', label: 'Notas da equipe', href: rotas.notas(), Icone: NotebookPen },
];

const CONFIG: ItemNav = {
  id: 'configuracoes',
  label: 'Configurações',
  href: rotas.configuracoes(),
  Icone: Settings,
};

function secaoAtiva(rota: Rota): Secao | null {
  switch (rota.nome) {
    case 'painel':
      return 'painel';
    case 'meu-trabalho':
      return 'meu-trabalho';
    case 'demandas':
      return 'demandas';
    case 'notas':
      return 'notas';
    case 'concluidos':
      return 'concluidos';
    case 'processo':
      return rota.concluido ? 'concluidos' : 'processos';
    case 'processos':
    case 'relatorio':
    case 'comparacao':
    case 'resumo':
      return 'processos';
    case 'configuracoes':
      return 'configuracoes';
    default:
      return null;
  }
}

function LinkNav({
  item,
  ativo,
  recolhida,
  layoutId,
  vencidos,
  onNavegar,
}: {
  item: ItemNav;
  ativo: boolean;
  recolhida: boolean;
  layoutId: string;
  vencidos?: number;
  onNavegar?: () => void;
}) {
  const { Icone } = item;
  const temBadge = vencidos !== undefined && vencidos > 0;
  return (
    <motion.a
      href={item.href}
      whileTap={press}
      onClick={onNavegar}
      aria-current={ativo ? 'page' : undefined}
      title={recolhida ? item.label : undefined}
      className={cn(
        'relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] font-medium transition-colors',
        ativo ? 'text-on-brand' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
      )}
    >
      {ativo && <motion.span layoutId={layoutId} transition={spring} className="absolute inset-0 rounded-md bg-brand" />}
      <Icone className={cn('relative h-4 w-4 shrink-0', ativo ? 'text-on-brand' : 'text-ink-4')} />
      {!recolhida && <span className="relative min-w-0 flex-1 truncate">{item.label}</span>}
      {temBadge && !recolhida && (
        <span className="relative ml-auto" title={`${vencidos} com prazo vencido`}>
          <CountBadge count={vencidos} tone="crit" sobreMarca={ativo} />
        </span>
      )}
      {temBadge && recolhida && (
        <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-crit" aria-hidden="true" />
      )}
      {temBadge && <span className="sr-only">, {vencidos} com prazo vencido</span>}
    </motion.a>
  );
}

/** Conteúdo da navegação — usado na sidebar e no drawer do celular. */
export function ConteudoNav({
  rota,
  recolhida = false,
  layoutId,
  onNavegar,
}: {
  rota: Rota;
  recolhida?: boolean;
  layoutId: string;
  onNavegar?: () => void;
}) {
  const processos = useStore((e) => e.snapshot.processos);
  const vencidos = useMemo(() => contarVencidos(processos), [processos]);
  const ativa = secaoAtiva(rota);

  return (
    <>
      <div
        className={cn(
          'flex shrink-0',
          recolhida
            ? 'h-[74px] items-center justify-center px-2'
            : LOGO_URL
              ? 'px-4 pt-5 pb-3'
              : 'h-[74px] items-center px-4',
        )}
      >
        <motion.a
          href={rotas.painel()}
          whileTap={press}
          onClick={onNavegar}
          className="flex min-w-0 items-center rounded-md"
          aria-label="Ir para o painel"
        >
          <BrandMark recolhida={recolhida} />
        </motion.a>
      </div>
      <nav aria-label="Principal" className="scroll-slim flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
        {ITENS.map((item) => (
          <LinkNav
            key={item.id}
            item={item}
            ativo={ativa === item.id}
            recolhida={recolhida}
            layoutId={layoutId}
            vencidos={item.id === 'processos' ? vencidos : undefined}
            onNavegar={onNavegar}
          />
        ))}
        <div className="mt-auto pt-2">
          <LinkNav
            item={CONFIG}
            ativo={ativa === 'configuracoes'}
            recolhida={recolhida}
            layoutId={layoutId}
            onNavegar={onNavegar}
          />
        </div>
      </nav>
    </>
  );
}

export function Sidebar({ rota }: { rota: Rota }) {
  const { sidebarRecolhida } = usePrefsUI();
  const Icone = sidebarRecolhida ? PanelLeftOpen : PanelLeftClose;
  const rotulo = sidebarRecolhida ? 'Expandir menu' : 'Recolher menu';

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarRecolhida ? 68 : 244 }}
      transition={spring}
      className="sticky top-0 z-30 hidden h-screen shrink-0 flex-col overflow-hidden bg-surface select-none md:flex print:hidden"
    >
      <ConteudoNav rota={rota} recolhida={sidebarRecolhida} layoutId="sidebar-active" />
      <div className="shrink-0 border-t border-hairline px-3 py-3">
        <motion.button
          type="button"
          whileTap={press}
          onClick={() => atualizarPrefsUI({ sidebarRecolhida: !sidebarRecolhida })}
          aria-label={rotulo}
          title={sidebarRecolhida ? rotulo : undefined}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[12px] font-medium text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <Icone className="h-4 w-4 shrink-0 text-ink-4" />
          {!sidebarRecolhida && <span className="truncate">{rotulo}</span>}
        </motion.button>
      </div>
    </motion.aside>
  );
}
