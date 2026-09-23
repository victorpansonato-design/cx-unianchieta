/**
 * Meu trabalho: todos veem tudo no sistema, mas aqui cada pessoa acompanha só
 * o que é dela — os processos em que é responsável e as tarefas atribuídas a
 * ela, ordenadas por prazo. Para quem entra como Diretoria, a mesma tela
 * mostra o que está esperando a diretoria.
 */
import { useMemo } from 'react';
import { motion } from 'motion/react';
import { CircleCheck, UserRoundCheck } from 'lucide-react';
import { abrirSeletorDeIdentidade } from '../../app/IdentityGate';
import { navegar, rotas } from '../../app/router';
import { DiasNaEtapa, PrazoStatus } from '../../components/domain/StatusProcesso';
import { Status } from '../../components/ui/Badges';
import { Button } from '../../components/ui/Button';
import { AnimatedNumber } from '../../components/ui/Charts';
import { Checkbox } from '../../components/ui/Fields';
import { Card, CardHeader, EmptyState, Metric, PageHeader } from '../../components/ui/Surfaces';
import type { Tarefa } from '../../data/types';
import { temSinal } from '../../domain/filtros';
import { rotuloPrazo } from '../../domain/painel';
import { diasNaEtapa, estaAtivo, estaVencido } from '../../domain/processos';
import { ordenarProcessos } from '../../domain/filtros';
import { tarefaAtrasada } from '../../domain/tarefas';
import { useIdentidade } from '../../hooks/usePreferencias';
import { useSnapshot } from '../../hooks/useStore';
import { formatarData, hoje, somarDias } from '../../lib/dates';
import { press } from '../../lib/motion';
import { acoesTarefa } from '../../services/acoes';
import { ListaView } from '../processos/ListaView';
import { CardDeProcessos } from '../painel/ListasDoPainel';

function ordenarPorPrazo(lista: Tarefa[]) {
  return [...lista].sort((a, b) => {
    if (a.prazo && b.prazo && a.prazo !== b.prazo) return a.prazo < b.prazo ? -1 : 1;
    if (a.prazo !== b.prazo) return a.prazo ? -1 : 1;
    return a.criadaEm.localeCompare(b.criadaEm);
  });
}

function VisaoDiretoria() {
  const s = useSnapshot();
  const aguardando = useMemo(() => ordenarProcessos(s, s.processos.filter((p) => temSinal(s, p, 'diretoria'))), [s]);
  const vencidos = useMemo(() => ordenarProcessos(s, s.processos.filter((p) => estaVencido(p))), [s]);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Aguardando a diretoria"
        description="Você está como Diretoria. Aqui ficam os processos que dependem de um retorno seu."
        actions={
          <Button size="sm" variant="ghost" onClick={() => navegar(rotas.relatorio())}>
            Relatório para a diretoria
          </Button>
        }
      />
      {aguardando.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={<CircleCheck className="h-5 w-5" />}
            title="Nada esperando a diretoria"
            message="Quando um processo chegar a uma etapa marcada como “Aguarda diretoria”, ele aparece aqui."
          />
        </Card>
      ) : (
        <ListaView processos={aguardando} s={s} />
      )}
      <CardDeProcessos
        titulo="Com prazo vencido"
        subtitulo="De todos os processos, os que passaram do prazo previsto."
        processos={vencidos}
        vazio="Nenhum prazo vencido."
        detalhe={(p) => <PrazoStatus processo={p} />}
        limite={10}
      />
    </div>
  );
}

export function MeuTrabalhoPage() {
  const s = useSnapshot();
  const { pessoa } = useIdentidade();
  const referencia = hoje();

  const meusProcessos = useMemo(
    () => (pessoa?.tipo === 'membro' ? ordenarProcessos(s, s.processos.filter((p) => p.responsaveisIds.includes(pessoa.id) && estaAtivo(p))) : []),
    [s, pessoa],
  );
  const minhasTarefas = useMemo(() => {
    if (pessoa?.tipo !== 'membro') return [];
    const ativos = new Set(s.processos.filter(estaAtivo).map((p) => p.id));
    return ordenarPorPrazo(s.tarefas.filter((t) => t.responsavelId === pessoa.id && !t.concluida && ativos.has(t.processoId)));
  }, [s, pessoa]);

  if (!pessoa) {
    return (
      <Card padded={false}>
        <EmptyState
          icon={<UserRoundCheck className="h-5 w-5" />}
          title="Escolha quem você é"
          message="O “Meu trabalho” mostra os processos e as tarefas de uma pessoa."
          action={
            <Button size="sm" onClick={abrirSeletorDeIdentidade}>
              Escolher
            </Button>
          }
        />
      </Card>
    );
  }

  if (pessoa.tipo === 'diretoria') return <VisaoDiretoria />;

  const porId = new Map(s.processos.map((p) => [p.id, p]));
  const limiteSemana = somarDias(referencia, 7);
  const atrasadas = minhasTarefas.filter((t) => tarefaAtrasada(t, referencia)).length;
  const daSemana = minhasTarefas.filter((t) => t.prazo && t.prazo >= referencia && t.prazo <= limiteSemana).length;
  const vencidos = meusProcessos.filter((p) => estaVencido(p, referencia)).length;
  const parados = meusProcessos
    .filter((p) => (diasNaEtapa(p, referencia) ?? 0) > 0)
    .sort((a, b) => (diasNaEtapa(b, referencia) ?? 0) - (diasNaEtapa(a, referencia) ?? 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader title="Meu trabalho" description={`Os processos e as tarefas de ${pessoa.nome}. Todos continuam vendo tudo; aqui fica só o que é seu.`} />

      <div className="flex flex-wrap gap-x-12 gap-y-5">
        <Metric value={<AnimatedNumber value={meusProcessos.length} />} label="Meus processos ativos" />
        <Metric value={<AnimatedNumber value={vencidos} />} label="Com prazo vencido" tone={vencidos ? 'crit' : 'default'} />
        <Metric value={<AnimatedNumber value={minhasTarefas.length} />} label="Tarefas abertas" />
        <Metric value={<AnimatedNumber value={daSemana} />} label="Tarefas desta semana" tone="brand" />
      </div>

      <Card padded={false}>
        <CardHeader
          className="px-5 pt-5 pb-3"
          title="Minhas tarefas"
          subtitle={atrasadas ? `${atrasadas} atrasada${atrasadas > 1 ? 's' : ''}. As mais urgentes primeiro.` : 'As mais urgentes primeiro.'}
        />
        {minhasTarefas.length === 0 ? (
          <p className="px-5 pb-5 text-[12px] text-ink-3">Nenhuma tarefa aberta atribuída a você.</p>
        ) : (
          <ul className="divide-y divide-hairline border-t border-hairline">
            {minhasTarefas.map((t) => {
              const p = porId.get(t.processoId);
              if (!p) return null;
              const atrasada = tarefaAtrasada(t, referencia);
              return (
                <li key={t.id} className="flex items-center gap-3 px-5 py-2.5">
                  <Checkbox checked={t.concluida} onChange={(v) => acoesTarefa.alternar(t.id, v)} label={`Concluir: ${t.titulo}`} />
                  <motion.a href={rotas.processo(p.codigo, 'tarefas')} whileTap={press} className="group min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink transition-colors group-hover:text-ink-2">{t.titulo}</p>
                    <p className="truncate text-[11px] text-ink-4">
                      <span className="font-mono">{p.codigo}</span> · {p.titulo}
                    </p>
                  </motion.a>
                  {t.prazo ? (
                    atrasada ? (
                      <Status tone="crit" solid title={formatarData(t.prazo)}>
                        {rotuloPrazo(t.prazo, referencia)}
                      </Status>
                    ) : (
                      <span className="shrink-0 font-mono text-[12px] text-ink-2" title={formatarData(t.prazo)}>
                        {rotuloPrazo(t.prazo, referencia)}
                      </span>
                    )
                  ) : (
                    <span className="shrink-0 text-[12px] text-ink-4">Sem prazo</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <section className="space-y-3">
        <h2 className="text-[15px] leading-tight font-semibold text-ink">Meus processos</h2>
        {meusProcessos.length === 0 ? (
          <Card padded={false}>
            <EmptyState
              compact
              title="Você não é responsável por nenhum processo ativo"
              message="Quando alguém colocar você como responsável, o processo aparece aqui."
            />
          </Card>
        ) : (
          <ListaView processos={meusProcessos} s={s} />
        )}
      </section>

      {parados.length > 0 && (
        <CardDeProcessos
          titulo="Há mais tempo na mesma etapa"
          subtitulo="Seus processos parados há mais dias."
          processos={parados}
          vazio=""
          detalhe={(p) => <DiasNaEtapa dias={diasNaEtapa(p)} curto />}
        />
      )}
    </div>
  );
}

