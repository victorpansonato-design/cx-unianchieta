/**
 * Processos: os processos em aberto do CX em quadro, lista ou linha do tempo,
 * da prioridade mais alta para a mais baixa. Os concluídos ficam na página
 * Concluídos. Os filtros vivem na URL; a visão escolhida fica lembrada neste
 * navegador. Criar processo: botão "Novo processo" no topo ou tecla N.
 */
import { useMemo } from 'react';
import { ChartGantt, FolderCheck, FolderKanban, LayoutGrid, List, Plus, Printer, SearchX } from 'lucide-react';
import { abrirNovoProcesso } from '../../app/novoProcesso';
import { navegar, rotas } from '../../app/router';
import { Button, LinkButton } from '../../components/ui/Button';
import { Segmented } from '../../components/ui/Fields';
import { Card, EmptyState, PageHeader } from '../../components/ui/Surfaces';
import {
  filtrarProcessos,
  FILTROS_VAZIOS,
  lerFiltros,
  noEscopo,
  ordenarPorPrioridade,
  paraQuery,
  temSinal,
  type FiltrosProcessos,
} from '../../domain/filtros';
import { estaVencido } from '../../domain/processos';
import { usePrefsUI } from '../../hooks/usePreferencias';
import { useSnapshot } from '../../hooks/useStore';
import { atualizarPrefsUI, type VisaoProcessos } from '../../services/preferencias';
import { FiltrosBar } from './FiltrosBar';
import { LinhaDoTempoView } from './LinhaDoTempoView';
import { ListaView } from './ListaView';
import { QuadroView } from './QuadroView';

export function ProcessosPage({ query }: { query: URLSearchParams }) {
  const s = useSnapshot();
  const { visaoProcessos: visao } = usePrefsUI();
  const filtros = useMemo(() => lerFiltros(query), [query]);

  const lista = useMemo(() => ordenarPorPrioridade(s, filtrarProcessos(s, filtros, 'abertos')), [s, filtros]);
  const abertos = useMemo(() => s.processos.filter((p) => noEscopo(p, 'abertos')).length, [s]);

  const contagensRapidas = useMemo(
    () => ({
      vencidos: s.processos.filter((p) => estaVencido(p)).length,
      diretoria: s.processos.filter((p) => temSinal(s, p, 'diretoria')).length,
      ti: s.processos.filter((p) => temSinal(s, p, 'ti')).length,
    }),
    [s],
  );

  const mudarFiltros = (f: FiltrosProcessos) => navegar(rotas.processos(paraQuery(f)), { substituir: true });
  const vazio = s.processos.length === 0;
  const semAbertos = !vazio && abertos === 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Processos"
        description="Os processos em aberto, da prioridade mais alta para a mais baixa. Clique num processo para abrir; os concluídos ficam em Concluídos."
        actions={
          !vazio &&
          !semAbertos && (
            <>
              <Button size="sm" variant="ghost" icon={<Printer className="h-3.5 w-3.5" />} onClick={() => navegar(rotas.relatorio())}>
                Relatório para a diretoria
              </Button>
              <Segmented<VisaoProcessos>
                layoutId="processos-visao"
                label="Forma de ver"
                value={visao}
                onChange={(v) => atualizarPrefsUI({ visaoProcessos: v })}
                items={[
                  { value: 'quadro', label: 'Quadro', icon: <LayoutGrid className="h-3.5 w-3.5" /> },
                  { value: 'lista', label: 'Lista', icon: <List className="h-3.5 w-3.5" /> },
                  { value: 'linha', label: 'Linha do tempo', icon: <ChartGantt className="h-3.5 w-3.5" /> },
                ]}
              />
            </>
          )
        }
      >
        {!vazio && !semAbertos && (
          <FiltrosBar
            config={s.config}
            filtros={filtros}
            onChange={mudarFiltros}
            total={lista.length}
            contagensRapidas={contagensRapidas}
          />
        )}
      </PageHeader>

      {vazio ? (
        <Card padded={false}>
          <EmptyState
            icon={<FolderKanban className="h-5 w-5" />}
            title="Nenhum processo ainda"
            message="Crie o primeiro processo que o CX vai reestruturar. Só o título é obrigatório; o resto se preenche ao longo do caminho."
            action={
              <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => abrirNovoProcesso()}>
                Criar o primeiro processo
              </Button>
            }
          />
        </Card>
      ) : semAbertos ? (
        <Card padded={false}>
          <EmptyState
            icon={<FolderCheck className="h-5 w-5" />}
            title="Nenhum processo em aberto"
            message="Todos os processos chegaram ao fim do fluxo e estão guardados em Concluídos."
            action={
              <Button size="sm" icon={<FolderCheck className="h-3.5 w-3.5" />} onClick={() => navegar(rotas.concluidos())}>
                Ver os concluídos
              </Button>
            }
          />
        </Card>
      ) : lista.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            compact
            icon={<SearchX className="h-5 w-5" />}
            title="Nenhum processo com esses filtros"
            message="Tente tirar algum filtro ou buscar por outra palavra."
            action={<LinkButton onClick={() => mudarFiltros(FILTROS_VAZIOS)}>Limpar filtros</LinkButton>}
          />
        </Card>
      ) : visao === 'quadro' ? (
        <QuadroView processos={lista} s={s} />
      ) : visao === 'linha' ? (
        <LinhaDoTempoView processos={lista} s={s} />
      ) : (
        <ListaView processos={lista} s={s} />
      )}
    </div>
  );
}
