/**
 * Busca rápida (⌘K / Ctrl K).
 *
 * Um campo, uma lista, o teclado inteiro: setas navegam, Enter abre, Escape
 * fecha. Encontra processos por título, código, setor ou responsável, e
 * também leva a qualquer tela ou ação do sistema.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Archive,
  Building2,
  FileText,
  FolderCheck,
  FolderKanban,
  FolderPlus,
  Inbox,
  LayoutDashboard,
  ListOrdered,
  Moon,
  NotebookPen,
  Palette,
  Printer,
  Search,
  SlidersHorizontal,
  Sun,
  UserRound,
  UserRoundCheck,
  Users,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { modalVariants, press, scrimVariants } from '../lib/motion';
import { combina } from '../lib/text';
import { useOverlayBehavior } from '../components/ui/Overlay';
import { buscarProcessos } from '../domain/filtros';
import { etapaDe } from '../domain/processos';
import { useTema } from '../hooks/usePreferencias';
import { useSnapshot } from '../hooks/useStore';
import { acoesNota } from '../services/acoes';
import { abrirSeletorDeIdentidade } from './IdentityGate';
import { abrirNovoProcesso } from './novoProcesso';
import { navegar, rotas } from './router';
import { trocarTema } from './transicaoDeTema';

interface Comando {
  id: string;
  grupo: string;
  titulo: string;
  detalhe?: string;
  icone: ReactNode;
  palavras?: string;
  executar: () => void;
}

const ICONE = 'h-4 w-4';

function useComandos(): Comando[] {
  const tema = useTema();
  return useMemo(() => {
    const ir = (href: string) => () => navegar(href);
    const criar: Comando[] = [
      { id: 'novo-processo', grupo: 'Criar', titulo: 'Novo processo', icone: <FolderPlus className={ICONE} />, palavras: 'criar abrir registrar', executar: () => abrirNovoProcesso() },
      {
        id: 'nova-nota',
        grupo: 'Criar',
        titulo: 'Nova nota da equipe',
        icone: <NotebookPen className={ICONE} />,
        palavras: 'ata anotacao',
        executar: () => navegar(rotas.notas(acoesNota.criar().id)),
      },
    ];
    const navegacao: Comando[] = [
      { id: 'ir-painel', grupo: 'Ir para', titulo: 'Painel', icone: <LayoutDashboard className={ICONE} />, palavras: 'inicio visao geral dashboard', executar: ir(rotas.painel()) },
      { id: 'ir-meu', grupo: 'Ir para', titulo: 'Meu trabalho', icone: <UserRoundCheck className={ICONE} />, palavras: 'minhas tarefas meus processos', executar: ir(rotas.meuTrabalho()) },
      { id: 'ir-processos', grupo: 'Ir para', titulo: 'Processos', icone: <FolderKanban className={ICONE} />, palavras: 'lista quadro kanban linha do tempo', executar: ir(rotas.processos()) },
      { id: 'ir-concluidos', grupo: 'Ir para', titulo: 'Concluídos', icone: <FolderCheck className={ICONE} />, palavras: 'encerrados finalizados historico', executar: ir(rotas.concluidos()) },
      { id: 'ir-demandas', grupo: 'Ir para', titulo: 'Caixa de demandas', icone: <Inbox className={ICONE} />, palavras: 'registrar demanda triagem', executar: ir(rotas.demandas()) },
      { id: 'ir-notas', grupo: 'Ir para', titulo: 'Notas da equipe', icone: <NotebookPen className={ICONE} />, palavras: 'atas', executar: ir(rotas.notas()) },
      { id: 'ir-relatorio', grupo: 'Ir para', titulo: 'Relatório para a diretoria', icone: <Printer className={ICONE} />, palavras: 'imprimir pdf', executar: ir(rotas.relatorio()) },
    ];
    const config: Comando[] = [
      { id: 'cfg-etapas', grupo: 'Configurações', titulo: 'Etapas do fluxo', icone: <ListOrdered className={ICONE} />, palavras: 'fluxo ordem', executar: ir(rotas.configuracoes('etapas')) },
      { id: 'cfg-equipe', grupo: 'Configurações', titulo: 'Equipe CX', icone: <Users className={ICONE} />, palavras: 'membros pessoas', executar: ir(rotas.configuracoes('equipe')) },
      { id: 'cfg-setores', grupo: 'Configurações', titulo: 'Setores', icone: <Building2 className={ICONE} />, executar: ir(rotas.configuracoes('setores')) },
      { id: 'cfg-origens', grupo: 'Configurações', titulo: 'Origens da demanda', icone: <Inbox className={ICONE} />, executar: ir(rotas.configuracoes('origens')) },
      { id: 'cfg-niveis', grupo: 'Configurações', titulo: 'Prioridade e impacto', icone: <SlidersHorizontal className={ICONE} />, palavras: 'niveis', executar: ir(rotas.configuracoes('niveis')) },
      { id: 'cfg-aparencia', grupo: 'Configurações', titulo: 'Aparência', icone: <Palette className={ICONE} />, palavras: 'tema claro escuro', executar: ir(rotas.configuracoes('aparencia')) },
      { id: 'cfg-backup', grupo: 'Configurações', titulo: 'Backup dos dados', icone: <Archive className={ICONE} />, palavras: 'exportar importar arquivo', executar: ir(rotas.configuracoes('backup')) },
    ];
    const acoes: Comando[] = [
      {
        id: 'tema',
        grupo: 'Ações',
        titulo: tema === 'dark' ? 'Usar tema claro' : 'Usar tema escuro',
        icone: tema === 'dark' ? <Sun className={ICONE} /> : <Moon className={ICONE} />,
        palavras: 'aparencia tema',
        // Sem elemento de origem: o círculo nasce do botão de tema do header.
        executar: () => trocarTema(tema === 'dark' ? 'light' : 'dark'),
      },
      { id: 'trocar', grupo: 'Ações', titulo: 'Trocar de pessoa', icone: <UserRound className={ICONE} />, palavras: 'identidade usuario quem', executar: abrirSeletorDeIdentidade },
    ];
    return [...criar, ...navegacao, ...config, ...acoes];
  }, [tema]);
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const [consulta, setConsulta] = useState('');
  const [ativo, setAtivo] = useState(0);
  const comandos = useComandos();
  const s = useSnapshot();
  useOverlayBehavior(open, { onClose, sheetRef, atrasoFoco: 0 });

  useEffect(() => {
    if (open) {
      setConsulta('');
      setAtivo(0);
    }
  }, [open]);

  // Processos vêm primeiro: é o que se busca. Sem consulta, os mexidos por último.
  const processos = useMemo<Comando[]>(() => {
    const lista = consulta.trim()
      ? buscarProcessos(s, consulta)
      : [...s.processos].sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm)).slice(0, 5);
    return lista.map((p) => ({
      id: `p-${p.id}`,
      grupo: consulta.trim() ? 'Processos' : 'Processos recentes',
      titulo: `${p.codigo} · ${p.titulo}`,
      detalhe: etapaDe(s.config, p.etapaId)?.nome,
      icone: <FileText className={ICONE} />,
      executar: () => navegar(rotas.processo(p.codigo)),
    }));
  }, [s, consulta]);

  const resultados = useMemo(
    () => [...processos, ...comandos.filter((c) => combina(consulta, c.titulo, c.detalhe, c.grupo, c.palavras))],
    [processos, comandos, consulta],
  );

  useEffect(() => setAtivo(0), [consulta]);

  useEffect(() => {
    listaRef.current?.querySelector(`[data-indice="${ativo}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [ativo]);

  const executar = (c: Comando | undefined) => {
    if (!c) return;
    onClose();
    // Deixa o overlay fechar antes de navegar ou abrir outro.
    window.setTimeout(c.executar, 0);
  };

  const grupos = resultados.reduce<Array<{ grupo: string; itens: Array<Comando & { indice: number }> }>>(
    (acc, c, indice) => {
      const ultimo = acc[acc.length - 1];
      if (ultimo && ultimo.grupo === c.grupo) ultimo.itens.push({ ...c, indice });
      else acc.push({ grupo: c.grupo, itens: [{ ...c, indice }] });
      return acc;
    },
    [],
  );

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="paleta"
          className="scrim fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh] sm:p-6 sm:pt-[12vh]"
          variants={scrimVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Busca rápida"
            tabIndex={-1}
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-surface shadow-overlay outline-none"
          >
            <div className="flex shrink-0 items-center gap-2.5 border-b border-hairline px-4">
              <Search className="h-4 w-4 shrink-0 text-ink-4" />
              <input
                data-autofocus
                value={consulta}
                onChange={(e) => setConsulta(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setAtivo((i) => Math.min(i + 1, resultados.length - 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setAtivo((i) => Math.max(i - 1, 0));
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    executar(resultados[ativo]);
                  }
                }}
                placeholder="Buscar processo, tela ou ação…"
                aria-label="Buscar"
                role="combobox"
                aria-expanded="true"
                aria-controls="paleta-resultados"
                aria-activedescendant={resultados[ativo] ? `paleta-${resultados[ativo].id}` : undefined}
                className="h-13 min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-4"
              />
            </div>

            <div ref={listaRef} id="paleta-resultados" role="listbox" className="scroll-slim min-h-0 flex-1 overflow-y-auto p-2">
              {resultados.length === 0 ? (
                <p className="px-3 py-8 text-center text-[12px] text-ink-3">Nada encontrado para “{consulta}”.</p>
              ) : (
                grupos.map((g) => (
                  <div key={g.grupo} className="pb-1">
                    <p className="px-3 pt-2 pb-1 text-[12px] font-semibold text-ink-3">{g.grupo}</p>
                    {g.itens.map((c) => (
                      <motion.div
                        key={c.id}
                        whileTap={press}
                        id={`paleta-${c.id}`}
                        role="option"
                        aria-selected={c.indice === ativo}
                        data-indice={c.indice}
                        onMouseMove={() => setAtivo(c.indice)}
                        onClick={() => executar(c)}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors',
                          c.indice === ativo ? 'bg-surface-2 text-ink' : 'text-ink-2',
                        )}
                      >
                        <span className="shrink-0 text-ink-4">{c.icone}</span>
                        <span className="min-w-0 flex-1 truncate font-medium">{c.titulo}</span>
                        {c.detalhe && <span className="shrink-0 truncate text-[12px] text-ink-3">{c.detalhe}</span>}
                      </motion.div>
                    ))}
                  </div>
                ))
              )}
            </div>

            <div className="hidden shrink-0 items-center gap-4 border-t border-hairline px-4 py-2.5 text-[11px] text-ink-4 sm:flex">
              <span>
                <kbd className="font-mono">↑↓</kbd> navegar
              </span>
              <span>
                <kbd className="font-mono">Enter</kbd> abrir
              </span>
              <span>
                <kbd className="font-mono">Esc</kbd> fechar
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
