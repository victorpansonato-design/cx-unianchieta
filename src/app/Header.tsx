/**
 * Header — DESIGN_SYSTEM §9.
 *
 * Busca rápida (⌘K / Ctrl K), indicador de salvamento, tema e quem está
 * usando. Sticky, translúcido sobre o conteúdo, com um hairline embaixo — o
 * divisor entre dois planos, não a moldura de uma caixa.
 */
import { motion } from 'motion/react';
import { ChevronDown, Menu as MenuIcon, Moon, Plus, Search, Sun, UserRound } from 'lucide-react';
import { Avatar } from '../components/ui/Badges';
import { Button } from '../components/ui/Button';
import { Menu } from '../components/ui/Overlay';
import { useIdentidade, useTema } from '../hooks/usePreferencias';
import { press } from '../lib/motion';
import { abrirSeletorDeIdentidade } from './IdentityGate';
import { abrirNovoProcesso } from './novoProcesso';
import { SaveIndicator } from './SaveIndicator';
import { trocarTema } from './transicaoDeTema';

export const ATALHO_BUSCA =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K';

function MenuIdentidade() {
  const { pessoa } = useIdentidade();
  const nome = pessoa?.nome ?? 'Sem identificação';
  return (
    <Menu
      label="Quem está usando"
      align="end"
      header={
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-ink-4">Você está como</p>
          <p className="truncate text-[13px] font-semibold text-ink">{nome}</p>
          {pessoa?.funcao && <p className="truncate text-[12px] text-ink-3">{pessoa.funcao}</p>}
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
          aria-label={`Você está como ${nome}`}
          className="flex h-9 shrink-0 items-center gap-2 rounded-full pr-2 pl-0.5 transition-colors hover:bg-surface-2 sm:pr-2.5"
        >
          <Avatar nome={nome} size="sm" />
          <span className="hidden max-w-[140px] truncate text-[13px] font-medium text-ink lg:inline">{nome}</span>
          <ChevronDown className="h-3.5 w-3.5 text-ink-4" />
        </motion.button>
      )}
    />
  );
}

/**
 * "Novo processo" vive no topo de toda tela, como o "Criar" do Jira: é a ação
 * que ninguém pode ter de procurar. Ele é o botão primário só nas telas em que
 * criar processo é a ação principal; nas outras (o detalhe, com "Avançar
 * etapa"), fica secundário — uma primária por tela.
 */
export function Header({
  onAbrirMenu,
  onAbrirBusca,
  novoEmDestaque,
}: {
  onAbrirMenu: () => void;
  onAbrirBusca: () => void;
  novoEmDestaque: boolean;
}) {
  const tema = useTema();
  const escuro = tema === 'dark';

  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-surface/85 backdrop-blur-xl print:hidden">
      <div className="flex h-[74px] items-center gap-3 px-4 sm:px-6">
        <Button
          variant="ghost"
          size="sm"
          square
          className="md:hidden"
          aria-label="Abrir navegação"
          icon={<MenuIcon className="h-4 w-4" />}
          onClick={onAbrirMenu}
        />

        <motion.button
          type="button"
          whileTap={press}
          onClick={onAbrirBusca}
          aria-label={`Buscar processos (${ATALHO_BUSCA})`}
          className="group flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-lg bg-surface-2 px-3 text-left transition-colors sm:max-w-md"
        >
          <Search className="h-3.5 w-3.5 shrink-0 text-ink-4 transition-colors group-hover:text-brand-2" />
          <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-4">Buscar processos…</span>
          <kbd className="hidden shrink-0 rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink-4 sm:block">
            {ATALHO_BUSCA}
          </kbd>
        </motion.button>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <SaveIndicator />
          {/* Invólucros decidem a visibilidade: `hidden` na própria classe do botão
              brigaria com o `inline-flex` dele pela ordem na folha de estilo. */}
          <div className="hidden sm:block">
            <Button
              variant={novoEmDestaque ? 'primary' : 'secondary'}
              size="sm"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => abrirNovoProcesso()}
              title="Novo processo (N)"
            >
              Novo processo
            </Button>
          </div>
          <div className="sm:hidden">
            <Button
              variant={novoEmDestaque ? 'primary' : 'secondary'}
              size="sm"
              square
              aria-label="Novo processo"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => abrirNovoProcesso()}
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            square
            aria-label={escuro ? 'Usar tema claro' : 'Usar tema escuro'}
            title={escuro ? 'Usar tema claro' : 'Usar tema escuro'}
            data-alternar-tema
            icon={escuro ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            onClick={(e) => trocarTema(escuro ? 'light' : 'dark', e.currentTarget)}
          />
          <MenuIdentidade />
        </div>
      </div>
    </header>
  );
}
