/**
 * Concluídos: os processos que chegaram à última etapa. Saem de Processos
 * para lá ficar só o que ainda pede trabalho, e vêm para cá com o histórico
 * inteiro — basta abrir. O encerrado mais recentemente fica em cima.
 *
 * Uma linha por processo, com o que importa depois do fim: quando terminou e
 * quanto tempo levou. Para reabrir, mova o processo para outra etapa.
 */
import { useMemo } from 'react';
import { FolderCheck, SearchX } from 'lucide-react';
import { navegar, rotas } from '../../app/router';
import { PilhaDeAvatares } from '../../components/domain/Pessoas';
import { Tag } from '../../components/ui/Badges';
import { LinkButton } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/Fields';
import { FiltroMenu } from '../../components/ui/FiltroMenu';
import { Card, ChevronAffordance, EmptyState, PageHeader, Row } from '../../components/ui/Surfaces';
import type { Processo } from '../../data/types';
import { ativos, nomeDe } from '../../domain/config';
import {
  contarFiltrosAtivos,
  filtrarProcessos,
  FILTROS_VAZIOS,
  lerFiltros,
  ordenarConcluidos,
  paraQuery,
  type FiltrosProcessos,
} from '../../domain/filtros';
import { nomesResponsaveis } from '../../domain/processos';
import { useSnapshot } from '../../hooks/useStore';
import { diasEntre, formatarData } from '../../lib/dates';
import { plural } from '../../lib/text';

const GRADE = 'lg:grid lg:grid-cols-[minmax(0,1fr)_110px_120px_110px_16px] lg:items-center lg:gap-4';

function duracao(p: Processo): string {
  if (!p.conclusao) return '—';
  return plural(Math.max(0, diasEntre(p.abertura, p.conclusao)), 'dia', 'dias');
}

export function ConcluidosPage({ query }: { query: URLSearchParams }) {
  const s = useSnapshot();
  const filtros = useMemo(() => lerFiltros(query), [query]);
  const todos = useMemo(() => s.processos.filter((p) => p.situacao === 'concluido').length, [s]);
  const lista = useMemo(() => ordenarConcluidos(filtrarProcessos(s, filtros, 'concluidos')), [s, filtros]);

  const mudar = (parcial: Partial<FiltrosProcessos>) =>
    navegar(rotas.concluidos(paraQuery({ ...filtros, ...parcial })), { substituir: true });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Concluídos"
        description="Os processos que chegaram ao fim do fluxo, do mais recente para o mais antigo. O histórico completo continua em cada um."
      >
        {todos > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              aria-label="Buscar por título, código, setor ou pessoa"
              value={filtros.q}
              onChange={(q) => mudar({ q })}
              placeholder="Buscar processo…"
              className="w-full sm:w-72"
            />
            <FiltroMenu
              rotulo="Setor"
              valor={filtros.setor}
              opcoes={ativos(s.config.setores).map((x) => ({ valor: x.id, nome: x.nome }))}
              onChange={(setor) => mudar({ setor })}
            />
            <FiltroMenu
              rotulo="Responsável"
              valor={filtros.responsavel}
              opcoes={ativos(s.config.membros).map((m) => ({ valor: m.id, nome: m.nome }))}
              onChange={(responsavel) => mudar({ responsavel })}
            />
            <span className="ml-auto flex items-center gap-3 text-[12px] text-ink-3">
              {plural(lista.length, 'processo', 'processos')}
              {contarFiltrosAtivos(filtros) > 0 && (
                <LinkButton onClick={() => navegar(rotas.concluidos(), { substituir: true })}>Limpar filtros</LinkButton>
              )}
            </span>
          </div>
        )}
      </PageHeader>

      {todos === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={<FolderCheck className="h-5 w-5" />}
            title="Nenhum processo concluído ainda"
            message="Quando um processo chega à última etapa, ele sai de Processos e fica guardado aqui, com todo o histórico."
          />
        </Card>
      ) : lista.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            compact
            icon={<SearchX className="h-5 w-5" />}
            title="Nenhum concluído com esses filtros"
            message="Tente tirar algum filtro ou buscar por outra palavra."
            action={<LinkButton onClick={() => mudar(FILTROS_VAZIOS)}>Limpar filtros</LinkButton>}
          />
        </Card>
      ) : (
        <Card padded={false} className="overflow-hidden">
          <div className={`hidden border-b border-hairline px-5 py-2.5 text-[11px] font-medium text-ink-4 ${GRADE}`}>
            <span>Processo</span>
            <span>Responsáveis</span>
            <span>Concluído em</span>
            <span>Duração</span>
            <span />
          </div>
          <ul className="divide-y divide-hairline">
            {lista.map((p) => {
              const setor = nomeDe(s.config.setores, p.setorId);
              return (
                <li key={p.id}>
                  <Row href={rotas.processo(p.codigo)} className="group">
                    <div className={`flex flex-col gap-2 px-5 py-3 ${GRADE}`}>
                      <div className="min-w-0">
                        <span className="font-mono text-[11px] text-ink-4">{p.codigo}</span>
                        <p className="mt-0.5 truncate text-[13px] font-medium text-ink">{p.titulo}</p>
                        {setor && (
                          <div className="mt-1">
                            <Tag>{setor}</Tag>
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
                      <span className="text-[12px] text-ink-3">
                        <span className="text-ink-4 lg:hidden">Levou </span>
                        {duracao(p)}
                      </span>
                      <ChevronAffordance className="hidden lg:block" />
                    </div>
                  </Row>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
