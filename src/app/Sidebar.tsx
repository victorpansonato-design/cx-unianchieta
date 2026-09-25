/**
 * Sidebar — DESIGN_SYSTEM §9.
 *
 * O que se usa todo dia fica plano e visível. Um único número na navegação:
 * para o CX, os prazos vencidos; para o TI, os processos que ninguém pegou.
 * É o único número que muda o que a pessoa faz a seguir.
 *
 * Quem está usando fica no pé da barra, logo acima de Configurações: é onde
 * se procura "a minha conta", e tira do header um nome que não muda nada na
 * tela. No celular, o mesmo conteúdo vive num drawer que entra pela esquerda.
 */
import { useMemo, type ComponentType } from 'react';
import { motion } from 'motion/react';
import {
  ChevronsUpDown,
  FolderCheck,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  ListTodo,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  UserRound,
  UserRoundCheck,
} from 'lucide-react';
import { Avatar, CountBadge } from '../components/ui/Badges';
import { Menu } from '../components/ui/Overlay';
import { contarVencidos } from '../domain/processos';
import { filaDoTi } from '../domain/ti';
import { useIdentidade, usePrefsUI } from '../hooks/usePreferencias';
import { useSnapshot } from '../hooks/useStore';
import { cn } from '../lib/cn';
import { press, spring } from '../lib/motion';
import { atualizarPrefsUI } from '../services/preferencias';
import { BrandMark, LOGO_URL } from './BrandMark';
import { abrirSeletorDeIdentidade } from './IdentityGate';
import { rotas, type Rota } from './router';

type Secao = 'painel' | 'meu-trabalho' | 'processos' | 'concluidos' | 'demandas' | 'notas' | 'configuracoes' | 'ti';

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

const ITENS_TI: ItemNav[] = [{ id: 'ti', label: 'Fila do TI', href: rotas.ti(), Icone: ListTodo }];

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
    case 'ti':
    case 'ti-processo':
      return 'ti';
    default:
      return null;
  }
}

interface Contagem {
  valor: number;
  tone: 'neutral' | 'crit';
  /** Para o leitor de tela e a dica: "3 com prazo vencido". */
  descricao: string;
}

function LinkNav({
  item,
  ativo,
  recolhida,
  layoutId,
  contagem,
  onNavegar,
}: {
  item: ItemNav;
  ativo: boolean;
  recolhida: boolean;
  layoutId: string;
  contagem?: Contagem;
  onNavegar?: () => void;
}) {
  const { Icone } = item;
  const temBadge = contagem !== undefined && contagem.valor > 0;
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
        <span className="relative ml-auto" title={contagem.descricao}>
          <CountBadge count={contagem.valor} tone={contagem.tone} sobreMarca={ativo} />
        </span>
      )}
      {temBadge && recolhida && (
        <span
          className={cn('absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full', contagem.tone === 'crit' ? 'bg-crit' : 'bg-ink-3')}
          aria-hidden="true"
        />
      )}
      {temBadge && <span className="sr-only">, {contagem.descricao}</span>}
    </motion.a>
  );
}

function detalheDaPessoa(tipo: 'membro' | 'ti' | 'diretoria' | undefined, funcao: string | null | undefined): string {
  if (funcao) return funcao;
  if (tipo === 'ti') return 'Equipe do TI';
  if (tipo === 'diretoria') return 'Acompanha os processos';
  return 'Equipe CX';
}

/** Quem está usando: avatar, nome e função. Abre o menu para trocar de pessoa. */
function QuemEstaUsando({ recolhida }: { recolhida: boolean }) {
  const { pessoa } = useIdentidade();
  const nome = pessoa?.nome ?? 'Sem identificação';
  const detalhe = detalheDaPessoa(pessoa?.tipo, pessoa?.funcao);

  return (
    <Menu
      label="Quem está usando"
      align="start"
      header={
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-ink-4">Você está como</p>
          <p className="truncate text-[13px] font-semibold text-ink">{nome}</p>
          <p className="truncate text-[12px] text-ink-3">{detalhe}</p>
        </div>
      }
      items={[
        {
          id: 'trocar',
          label: 'Trocar de pessoa',
          icon: <UserRound className="h-4 w-4" />,
          onSelect: abrirSeletorDeIdentidade,
        },
      ]}
      trigger={(props) => (
        <motion.button
          type="button"
          whileTap={press}
          {...props}
          aria-label={`Você está como ${nome}. Trocar de pessoa`}
          title={recolhida ? nome : undefined}
          className={cn(
            'flex w-full min-w-0 items-center gap-2.5 rounded-md py-1.5 text-left transition-colors hover:bg-surface-2',
            recolhida ? 'justify-center' : 'px-1.5',
          )}
        >
          <Avatar nome={nome} size="sm" />
          {!recolhida && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-ink">{nome}</span>
                <span className="block truncate text-[11px] text-ink-3">{detalhe}</span>
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-ink-4" />
            </>
          )}
        </motion.button>
      )}
    />
  );
}

/** Conteúdo da navegação — usado na sidebar e no drawer do celular. */
export function ConteudoNav({
  rota,
  modoTi = false,
  recolhida = false,
  layoutId,
  onNavegar,
}: {
  rota: Rota;
  modoTi?: boolean;
  recolhida?: boolean;
  layoutId: string;
  onNavegar?: () => void;
}) {
  const s = useSnapshot();
  const vencidos = useMemo(() => contarVencidos(s.processos), [s.processos]);
  const semNinguem = useMemo(() => (modoTi ? filaDoTi(s, null).semNinguem.length : 0), [s, modoTi]);
  const ativa = secaoAtiva(rota);

  const contagemDe = (id: Secao): Contagem | undefined => {
    if (id === 'processos') return { valor: vencidos, tone: 'crit', descricao: `${vencidos} com prazo vencido` };
    if (id === 'ti') return { valor: semNinguem, tone: 'neutral', descricao: `${semNinguem} esperando alguém do TI` };
    return undefined;
  };

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
          href={modoTi ? rotas.ti() : rotas.painel()}
          whileTap={press}
          onClick={onNavegar}
          className="flex min-w-0 items-center rounded-md"
          aria-label={modoTi ? 'Ir para a fila do TI' : 'Ir para o painel'}
        >
          <BrandMark recolhida={recolhida} />
        </motion.a>
      </div>
      <nav aria-label="Principal" className="scroll-slim flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
        {(modoTi ? ITENS_TI : ITENS).map((item) => (
          <LinkNav
            key={item.id}
            item={item}
            ativo={ativa === item.id}
            recolhida={recolhida}
            layoutId={layoutId}
            contagem={contagemDe(item.id)}
            onNavegar={onNavegar}
          />
        ))}
        <div className="mt-auto space-y-0.5 pt-2">
          <QuemEstaUsando recolhida={recolhida} />
          {!modoTi && (
            <LinkNav
              item={CONFIG}
              ativo={ativa === 'configuracoes'}
              recolhida={recolhida}
              layoutId={layoutId}
              onNavegar={onNavegar}
            />
          )}
        </div>
      </nav>
    </>
  );
}

export function Sidebar({ rota, modoTi = false }: { rota: Rota; modoTi?: boolean }) {
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
      <ConteudoNav rota={rota} modoTi={modoTi} recolhida={sidebarRecolhida} layoutId="sidebar-active" />
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
