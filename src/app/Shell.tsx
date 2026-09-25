/**
 * Shell — DESIGN_SYSTEM §9: sidebar sticky + header sticky + main com a
 * largura máxima de 1440px. A troca de tela anima com pageVariants; a troca
 * de aba dentro de uma tela, não (ver chaveDaTela).
 *
 * Quem é do TI vê um shell enxuto: só a Fila do TI na navegação, sem busca de
 * processos, sem "Novo processo" e sem os atalhos de teclado do CX.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Drawer } from '../components/ui/Overlay';
import { useIdentidade } from '../hooks/usePreferencias';
import { pageVariants } from '../lib/motion';
import { ReabrirProcessoModal } from '../features/processo/ReabrirProcessoModal';
import { NovoProcessoModal } from '../features/processos/NovoProcessoModal';
import { CommandPalette } from './CommandPalette';
import { Header } from './Header';
import { abrirNovoProcesso } from './novoProcesso';
import { chaveDaTela, type Rota } from './router';
import { ConteudoNav, Sidebar } from './Sidebar';

function ehCampoEditavel(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

export function Shell({ rota, children }: { rota: Rota; children: ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const { pessoa } = useIdentidade();
  const modoTi = pessoa?.tipo === 'ti';
  const chave = chaveDaTela(rota);

  useEffect(() => {
    setMenuAberto(false);
    window.scrollTo({ top: 0 });
  }, [chave]);

  // ⌘K / Ctrl K em qualquer lugar; "/" para buscar e "N" para novo processo quando não se está digitando.
  useEffect(() => {
    if (modoTi) return;
    const aoTeclar = (e: KeyboardEvent) => {
      const atalho = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      const livre = !ehCampoEditavel(e.target) && !e.metaKey && !e.ctrlKey && !e.altKey;
      // Com um diálogo aberto, as teclas pertencem a ele.
      const semDialogo = !document.querySelector('[role="dialog"][aria-modal="true"]');
      if (atalho || (livre && semDialogo && e.key === '/')) {
        e.preventDefault();
        setBuscaAberta(true);
      } else if (livre && semDialogo && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        abrirNovoProcesso();
      }
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [modoTi]);

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar rota={rota} modoTi={modoTi} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          modoTi={modoTi}
          onAbrirMenu={() => setMenuAberto(true)}
          onAbrirBusca={() => setBuscaAberta(true)}
          novoEmDestaque={['painel', 'processos', 'meu-trabalho'].includes(rota.nome)}
        />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1440px]">
            <AnimatePresence mode="wait">
              <motion.div key={chave} variants={pageVariants} initial="initial" animate="animate" exit="exit">
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      <Drawer open={menuAberto} onClose={() => setMenuAberto(false)} label="Navegação" side="left" width="sm">
        <ConteudoNav rota={rota} modoTi={modoTi} layoutId="sidebar-active-mobile" onNavegar={() => setMenuAberto(false)} />
      </Drawer>
      {!modoTi && (
        <>
          <CommandPalette open={buscaAberta} onClose={() => setBuscaAberta(false)} />
          <NovoProcessoModal />
          <ReabrirProcessoModal />
        </>
      )}
    </div>
  );
}
