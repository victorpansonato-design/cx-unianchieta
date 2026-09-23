/**
 * Painel: a tela que a diretoria abre e entende em poucos segundos.
 *
 * - Cinco números no topo, na única caixa de contraste da tela: é ela que
 *   ancora o olhar. Só um em azul: "aguardando a diretoria", o que responde
 *   "e agora?" para quem está olhando. Vencido em vermelho quando há.
 * - Onde o trabalho está acumulando (processos por etapa).
 * - O que precisa de atenção: vencidos, o que espera a diretoria, o que está
 *   com o TI, os prazos dos próximos 7 dias.
 * - O que aconteceu por último.
 */
import { useMemo, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArchiveRestore, FolderKanban, Plus, Printer } from 'lucide-react';
import { abrirNovoProcesso } from '../../app/novoProcesso';
import { navegar, rotas } from '../../app/router';
import { DiasNaEtapa, PrazoStatus } from '../../components/domain/StatusProcesso';
import { Status } from '../../components/ui/Badges';
import { AnimatedNumber } from '../../components/ui/Charts';
import { Button, LinkButton } from '../../components/ui/Button';
import { Callout, Card, CardHeader, EmptyState, Metric, PageHeader, Row } from '../../components/ui/Surfaces';
import { JANELA_PRAZOS, rotuloPrazo, resumoPainel } from '../../domain/painel';
import { useSnapshot } from '../../hooks/useStore';
import { diasNaEtapa } from '../../domain/processos';
import { diasEntre, formatarData, hoje, paraDateOnly, somarDias } from '../../lib/dates';
import { press } from '../../lib/motion';
import { plural } from '../../lib/text';
import { AtividadeRecente, BarrasPorEtapa, CardDeProcessos } from './ListasDoPainel';

/** Uma Metric que leva à lista filtrada: uma célula da caixa de contraste. */
function MetricLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <motion.a href={href} whileTap={press} className="block px-5 py-5 transition-colors hover:bg-contraste-hover">
      {children}
    </motion.a>
  );
}

function AvisoDeBackup({ ultimo }: { ultimo: string | null }) {
  const dias = ultimo ? diasEntre(paraDateOnly(new Date(ultimo)), hoje()) : null;
  if (dias !== null && dias < 7) return null;
  return (
    <Callout tone="warn" icon={<ArchiveRestore className="h-4 w-4" />} title="Hora de fazer um backup">
      {ultimo
        ? `O último foi em ${formatarData(paraDateOnly(new Date(ultimo)))}. `
        : 'Ainda não foi feito nenhum backup neste navegador. '}
      Os dados ficam só aqui; o arquivo de backup é o que protege contra perda.{' '}
      <LinkButton onClick={() => navegar(rotas.configuracoes('backup'))} className="text-[12px]">
        Fazer backup agora
      </LinkButton>
    </Callout>
  );
}

export function PainelPage() {
  const s = useSnapshot();
  const r = useMemo(() => resumoPainel(s), [s]);
  const referencia = hoje();

  if (s.processos.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Painel"
          description="A visão geral de todos os processos: onde cada um está, o que venceu e o que espera a diretoria ou o TI."
        />
        <Card padded={false}>
          <EmptyState
            icon={<FolderKanban className="h-5 w-5" />}
            title="Nenhum processo ainda"
            message="Crie o primeiro processo que o CX vai reestruturar. O painel se monta sozinho a partir deles."
            action={
              <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => abrirNovoProcesso()}>
                Criar o primeiro processo
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel"
        description="Onde cada processo está, o que venceu e o que espera a diretoria ou o TI."
        actions={
          <Button size="sm" variant="ghost" icon={<Printer className="h-3.5 w-3.5" />} onClick={() => navegar(rotas.relatorio())}>
            Relatório para a diretoria
          </Button>
        }
      />

      <AvisoDeBackup ultimo={s.meta.ultimoBackup} />

      <Card
        tone="contrast"
        padded={false}
        aria-label="Resumo dos processos"
        className="grid grid-cols-2 overflow-hidden sm:grid-cols-3 lg:grid-cols-5 lg:divide-x lg:divide-hairline-strong"
      >
        <MetricLink href={rotas.processos({ situacao: 'andamento' })}>
          <Metric value={<AnimatedNumber value={r.ativos.length} />} label="Processos ativos" />
        </MetricLink>
        <MetricLink href={rotas.processos({ rapido: 'vencidos' })}>
          <Metric
            value={<AnimatedNumber value={r.vencidos.length} />}
            label="Com prazo vencido"
            tone={r.vencidos.length ? 'crit' : 'default'}
          />
        </MetricLink>
        <MetricLink href={rotas.processos({ rapido: 'diretoria' })}>
          <Metric value={<AnimatedNumber value={r.aguardandoDiretoria.length} />} label="Aguardando a diretoria" tone="brand" />
        </MetricLink>
        <MetricLink href={rotas.processos({ rapido: 'ti' })}>
          <Metric value={<AnimatedNumber value={r.comTi.length} />} label="Com o TI" />
        </MetricLink>
        <MetricLink href={rotas.demandas()}>
          <Metric value={<AnimatedNumber value={r.demandasNovas} />} label="Demandas novas" />
        </MetricLink>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start">
        <Card>
          <CardHeader title="Processos por etapa" subtitle="Onde o trabalho está acumulando. Clique numa etapa para ver os processos dela." />
          <div className="mt-4">
            <BarrasPorEtapa dados={r.porEtapa} />
          </div>
        </Card>
        <CardDeProcessos
          titulo="Prazo vencido"
          subtitulo="Os mais atrasados primeiro."
          processos={r.vencidos.map((v) => v.processo)}
          vazio="Nenhum prazo vencido. Tudo dentro do previsto."
          verTodos={rotas.processos({ rapido: 'vencidos' })}
          detalhe={(p) => <PrazoStatus processo={p} />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <CardDeProcessos
          titulo="Aguardando a diretoria"
          processos={r.aguardandoDiretoria}
          vazio="Nenhum processo esperando retorno da diretoria."
          verTodos={rotas.processos({ rapido: 'diretoria' })}
          detalhe={(p) => <DiasNaEtapa dias={diasNaEtapa(p)} curto />}
        />
        <CardDeProcessos
          titulo="Com o TI"
          processos={r.comTi}
          vazio="Nenhum processo com o TI no momento."
          verTodos={rotas.processos({ rapido: 'ti' })}
          detalhe={(p) => <DiasNaEtapa dias={diasNaEtapa(p)} curto />}
        />
        <Card padded={false}>
          <CardHeader
            className="px-5 pt-5 pb-3"
            title="Próximos prazos"
            subtitle={`Processos e tarefas que vencem até ${formatarData(somarDias(referencia, JANELA_PRAZOS))}.`}
          />
          {r.proximosPrazos.length === 0 ? (
            <p className="px-5 pb-5 text-[12px] text-ink-3">Nenhum prazo nos próximos {JANELA_PRAZOS} dias.</p>
          ) : (
            <ul className="divide-y divide-hairline border-t border-hairline">
              {r.proximosPrazos.slice(0, 8).map((x) => {
                const atrasada = x.data < referencia;
                return (
                  <li key={x.chave}>
                    <Row href={rotas.processo(x.processo.codigo, x.tipo === 'tarefa' ? 'tarefas' : 'visao-geral')} tone={atrasada ? 'crit' : 'default'}>
                      <div className="flex items-center gap-3 px-5 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-ink">{x.tarefa ? x.tarefa.titulo : x.processo.titulo}</p>
                          <p className="truncate text-[11px] text-ink-4">
                            <span className="font-mono">{x.processo.codigo}</span>
                            {x.tarefa ? ` · tarefa de ${x.processo.titulo}` : ' · prazo do processo'}
                          </p>
                        </div>
                        {atrasada ? (
                          <Status tone="crit" solid>
                            {rotuloPrazo(x.data, referencia)}
                          </Status>
                        ) : (
                          <span className="shrink-0 font-mono text-[12px] text-ink-2" title={formatarData(x.data)}>
                            {rotuloPrazo(x.data, referencia)}
                          </span>
                        )}
                      </div>
                    </Row>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <CardDeProcessos
          titulo="Há mais tempo na mesma etapa"
          subtitulo="Processos ativos parados há mais dias."
          processos={r.maisTempoNaEtapa.map((x) => x.processo)}
          vazio="Nenhum processo parado há mais de um dia na mesma etapa."
          detalhe={(p) => (
            <span className="font-mono text-[12px] text-ink-2">{plural(diasNaEtapa(p) ?? 0, 'dia', 'dias')}</span>
          )}
        />
        <Card padded={false}>
          <CardHeader className="px-5 pt-5 pb-3" title="Atividade recente" subtitle="O que aconteceu por último nos processos." />
          <AtividadeRecente itens={r.atividade} s={s} />
        </Card>
      </div>
    </div>
  );
}
