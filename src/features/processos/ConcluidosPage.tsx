/**
 * Concluídos: os processos que chegaram à última etapa. Saem de Processos
 * para lá ficar só o que ainda pede trabalho, e vêm para cá com o histórico
 * inteiro — basta abrir. O encerrado mais recentemente fica em cima.
 *
 * No topo, o resumo do período para o CX e a diretoria: quatro números
 * (concluídos, tempo médio, no prazo, setores atendidos) comparados ao período
 * anterior. O período segue o calendário — semana, mês, trimestre, semestre,
 * ano — e as setas voltam no tempo, período a período. A lista embaixo é a do
 * período, com o que mudou em cada processo; a busca por texto procura no
 * histórico inteiro. Dá para exportar o período em PDF ou planilha.
 *
 * O processo abre aqui dentro (#/concluidos/CX-003), e de lá dá para
 * reabri-lo numa etapa anterior quando surgirem melhorias.
 */
import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Download, FileSpreadsheet, FolderCheck, Printer, SearchX } from 'lucide-react';
import { navegar, rotas } from '../../app/router';
import { PilhaDeAvatares } from '../../components/domain/Pessoas';
import { Status, Tag } from '../../components/ui/Badges';
import { Button, LinkButton } from '../../components/ui/Button';
import { SearchInput, Segmented } from '../../components/ui/Fields';
import { FiltroMenu } from '../../components/ui/FiltroMenu';
import { Menu } from '../../components/ui/Overlay';
import { Card, ChevronAffordance, EmptyState, PageHeader, Row } from '../../components/ui/Surfaces';
import { useToast } from '../../components/ui/Toast';
import type { Processo } from '../../data/types';
import {
  duracaoEmDias,
  entregueNoPrazo,
  lerRecorte,
  noPeriodo,
  PERIODOS,
  recorteParaQuery,
  resumoDaMudanca,
  type Periodo,
} from '../../domain/concluidos';
import { ativos, nomeDe } from '../../domain/config';
import { filtrarProcessos, ordenarConcluidos, paraQuery, type FiltrosProcessos } from '../../domain/filtros';
import { nomesResponsaveis, vezesAdiado } from '../../domain/processos';
import { useSnapshot } from '../../hooks/useStore';
import { formatarData } from '../../lib/dates';
import { plural } from '../../lib/text';
import { exportarPlanilhaDeConcluidos } from '../../services/exportacao';
import { IndicadoresDoPeriodo, resumoDoPeriodo } from './IndicadoresDoPeriodo';

const GRADE = 'lg:grid lg:grid-cols-[minmax(0,1fr)_110px_120px_130px_16px] lg:items-center lg:gap-4';

function Duracao({ p }: { p: Processo }) {
  const dias = duracaoEmDias(p);
  const noPrazo = entregueNoPrazo(p);
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[12px] text-ink-3">
        <span className="text-ink-4 lg:hidden">Levou </span>
        {dias === null ? '—' : plural(dias, 'dia', 'dias')}
      </span>
      {noPrazo === false && <Status tone="warn">Fora do prazo</Status>}
    </div>
  );
}

function LinhaConcluido({ p, s }: { p: Processo; s: ReturnType<typeof useSnapshot> }) {
  const setor = nomeDe(s.config.setores, p.setorId);
  const mudanca = resumoDaMudanca(p);
  const adiado = vezesAdiado(p);
  return (
    <li>
      <Row href={rotas.concluido(p.codigo)} className="group">
        <div className={`flex flex-col gap-2 px-5 py-3 ${GRADE}`}>
          <div className="min-w-0">
            <span className="font-mono text-[11px] text-ink-4">{p.codigo}</span>
            <p className="mt-0.5 truncate text-[13px] font-medium text-ink">{p.titulo}</p>
            {mudanca && <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-ink-3">{mudanca}</p>}
            {(setor || adiado > 0) && (
              <div className="mt-1 flex flex-wrap gap-1">
                {setor && <Tag>{setor}</Tag>}
                {adiado > 0 && <Tag>{adiado === 1 ? 'Prazo adiado 1 vez' : `Prazo adiado ${adiado} vezes`}</Tag>}
              </div>
            )}
          </div>
          <div>
            {p.responsaveisIds.length ? (
              <PilhaDeAvatares nomes={nomesResponsaveis(p, s.config)} />
            ) : (
              <span className="text-[12px] text-ink-4">Sem responsável</span>
            )}
          </div>
          {/* No celular não há cabeçalho de coluna: o rótulo vem junto do valor. */}
          <span className="text-[12px] text-ink-2">
            <span className="text-ink-4 lg:hidden">Concluído em </span>
            <span className="font-mono">{formatarData(p.conclusao)}</span>
          </span>
          <Duracao p={p} />
          <ChevronAffordance className="hidden lg:block" />
        </div>
      </Row>
    </li>
  );
}

export function ConcluidosPage({ query }: { query: URLSearchParams }) {
  const s = useSnapshot();
  const toast = useToast();
  const resumo = useMemo(() => resumoDoPeriodo(s, query), [s, query]);
  const { filtros, intervalo } = resumo;
  const { periodo, deslocamento } = lerRecorte(query);
  const todos = useMemo(() => s.processos.filter((p) => p.situacao === 'concluido').length, [s]);
  const buscando = filtros.q.trim().length > 0;

  // Com busca, procura no histórico inteiro; sem busca, mostra o período.
  const lista = useMemo(
    () => (buscando ? ordenarConcluidos(filtrarProcessos(s, filtros, 'concluidos')) : resumo.lista),
    [buscando, s, filtros, resumo.lista],
  );

  const ir = (parcial: Partial<FiltrosProcessos>, recorte: { periodo: Periodo; deslocamento: number } = { periodo, deslocamento }) =>
    navegar(
      rotas.concluidos({ ...paraQuery({ ...filtros, ...parcial }), ...recorteParaQuery(recorte.periodo, recorte.deslocamento) }),
      { substituir: true },
    );
  const mudarRecorte = (p: Periodo, d: number) => ir({}, { periodo: p, deslocamento: d });
  const temFiltro = Boolean(filtros.q.trim() || filtros.setor || filtros.responsavel);

  const exportarPlanilha = () => {
    const { nomeArquivo } = exportarPlanilhaDeConcluidos(resumo.lista, intervalo);
    toast({ title: 'Planilha exportada.', description: nomeArquivo });
  };

  const queryDoRelatorio = {
    ...paraQuery({ ...filtros, q: '' }),
    ...recorteParaQuery(periodo, deslocamento),
  };

  if (todos === 0) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Concluídos"
          description="Os processos que chegaram ao fim do fluxo, com o resumo do período para o CX e a diretoria."
        />
        <Card padded={false}>
          <EmptyState
            icon={<FolderCheck className="h-5 w-5" />}
            title="Nenhum processo concluído ainda"
            message="Quando um processo chega à última etapa, ele sai de Processos e fica guardado aqui, com todo o histórico."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Concluídos"
        description="O que o CX entregou no período, comparado ao período anterior. O histórico completo continua em cada processo."
        actions={
          <Menu
            label="Exportar o período"
            align="end"
            header={<p className="text-[11px] font-medium text-ink-4">{intervalo.rotulo}</p>}
            items={[
              {
                id: 'pdf',
                label: 'Relatório para imprimir ou PDF',
                icon: <Printer className="h-4 w-4" />,
                onSelect: () => navegar(rotas.relatorioConcluidos(queryDoRelatorio)),
              },
              {
                id: 'planilha',
                label: 'Planilha (Excel)',
                icon: <FileSpreadsheet className="h-4 w-4" />,
                disabled: resumo.lista.length === 0,
                onSelect: exportarPlanilha,
              },
            ]}
            trigger={(props) => (
              <Button {...props} size="sm" variant="secondary" icon={<Download className="h-3.5 w-3.5" />}>
                Exportar
              </Button>
            )}
          />
        }
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Segmented<Periodo>
            layoutId="concluidos-periodo"
            label="Período"
            value={periodo}
            onChange={(p) => mudarRecorte(p, 0)}
            items={PERIODOS.map((p) => ({ value: p.id, label: p.nome }))}
          />
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="xs"
              square
              aria-label="Período anterior"
              title="Período anterior"
              icon={<ChevronLeft className="h-3.5 w-3.5" />}
              onClick={() => mudarRecorte(periodo, deslocamento - 1)}
            />
            <span className="min-w-[200px] text-center text-[13px] font-medium text-ink" aria-live="polite">
              {intervalo.rotulo}
            </span>
            <Button
              variant="ghost"
              size="xs"
              square
              aria-label="Próximo período"
              title="Próximo período"
              disabled={deslocamento === 0}
              icon={<ChevronRight className="h-3.5 w-3.5" />}
              onClick={() => mudarRecorte(periodo, deslocamento + 1)}
            />
          </div>
          {deslocamento < 0 && <LinkButton onClick={() => mudarRecorte(periodo, 0)}>Voltar para o período atual</LinkButton>}
        </div>
      </PageHeader>

      <Card
        tone="contrast"
        padded={false}
        aria-label={`Resumo de ${intervalo.rotulo}`}
        className="grid grid-cols-1 overflow-hidden sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-hairline-strong"
      >
        <IndicadoresDoPeriodo resumo={resumo} celula="px-5 py-5" />
      </Card>

      <Card padded={false} className="overflow-hidden">
        <div className="flex flex-col gap-3 px-5 pt-5 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-[15px] leading-tight font-semibold text-ink">
              {buscando ? 'Resultado da busca' : `Concluídos ${noPeriodo(intervalo)}`}
            </h2>
            <p className="mt-1 text-[12px] text-ink-3">
              {buscando
                ? `${plural(lista.length, 'processo', 'processos')} em todo o histórico, fora do período.`
                : plural(lista.length, 'processo', 'processos')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              aria-label="Buscar em todos os concluídos por título, código, setor ou pessoa"
              value={filtros.q}
              onChange={(q) => ir({ q })}
              placeholder="Buscar em todos os concluídos…"
              className="w-full sm:w-72"
            />
            <FiltroMenu
              rotulo="Setor"
              valor={filtros.setor}
              opcoes={ativos(s.config.setores).map((x) => ({ valor: x.id, nome: x.nome }))}
              onChange={(setor) => ir({ setor })}
            />
            <FiltroMenu
              rotulo="Responsável"
              valor={filtros.responsavel}
              opcoes={ativos(s.config.membros).map((m) => ({ valor: m.id, nome: m.nome }))}
              onChange={(responsavel) => ir({ responsavel })}
            />
            {temFiltro && <LinkButton onClick={() => ir({ q: '', setor: null, responsavel: null })}>Limpar filtros</LinkButton>}
          </div>
        </div>

        {lista.length === 0 ? (
          <div className="border-t border-hairline">
            <EmptyState
              compact
              icon={<SearchX className="h-5 w-5" />}
              title={buscando || temFiltro ? 'Nenhum concluído com esses filtros' : `Nada concluído ${noPeriodo(intervalo)}`}
              message={buscando || temFiltro ? 'Tente tirar algum filtro ou buscar por outra palavra.' : 'Volte um período ou escolha um período maior.'}
              action={
                buscando || temFiltro ? (
                  <LinkButton onClick={() => ir({ q: '', setor: null, responsavel: null })}>Limpar filtros</LinkButton>
                ) : (
                  <LinkButton onClick={() => mudarRecorte(periodo, deslocamento - 1)}>Ver o período anterior</LinkButton>
                )
              }
            />
          </div>
        ) : (
          <>
            <div className={`hidden border-y border-hairline px-5 py-2.5 text-[11px] font-medium text-ink-4 ${GRADE}`}>
              <span>Processo e o que mudou</span>
              <span>Responsáveis</span>
              <span>Concluído em</span>
              <span>Duração</span>
              <span />
            </div>
            <ul className="divide-y divide-hairline border-t border-hairline lg:border-t-0">
              {lista.map((p) => (
                <LinhaConcluido key={p.id} p={p} s={s} />
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
