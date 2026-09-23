/**
 * Detalhe do processo, no formato Jira/iKeep: cabeçalho com título editável e
 * a ação principal ("Avançar para a próxima etapa"), a barra de etapas com as
 * datas, o conteúdo em abas à esquerda e o painel de campos à direita.
 * Tudo edita no lugar e salva sozinho.
 */
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, MoreHorizontal, Presentation, Printer, Trash2 } from 'lucide-react';
import { NaoEncontrada } from '../../app/NaoEncontrada';
import { navegar, rotas, type AbaProcesso } from '../../app/router';
import { EtapaStepper } from '../../components/domain/EtapaStepper';
import { DiasNaEtapa, PrazoStatus, SituacaoStatus } from '../../components/domain/StatusProcesso';
import { Status } from '../../components/ui/Badges';
import { Button } from '../../components/ui/Button';
import { InlineText } from '../../components/ui/Fields';
import { Menu, useConfirm } from '../../components/ui/Overlay';
import { AccentRule, Card, Tabs } from '../../components/ui/Surfaces';
import { useToast } from '../../components/ui/Toast';
import { anexosDoProcesso } from '../../domain/anexos';
import { diasNaEtapa, estaAtivo, etapaDe, processoPorCodigo, proximaEtapa } from '../../domain/processos';
import { useSnapshot } from '../../hooks/useStore';
import { enterFast, exitFast, press } from '../../lib/motion';
import { acoesProcesso } from '../../services/acoes';
import { AndamentosAba } from './abas/AndamentosAba';
import { AnexosAba } from './abas/AnexosAba';
import { AntesDepoisAba } from './abas/AntesDepoisAba';
import { TarefasAba } from './abas/TarefasAba';
import { VisaoGeralAba } from './abas/VisaoGeralAba';
import { PainelDeCampos } from './PainelDeCampos';
import { useMoverEtapa } from './useMoverEtapa';

export function ProcessoPage({ codigo, aba }: { codigo: string; aba: AbaProcesso }) {
  const s = useSnapshot();
  const p = processoPorCodigo(s, codigo);
  const mover = useMoverEtapa();
  const confirmar = useConfirm();
  const toast = useToast();

  if (!p) {
    return (
      <NaoEncontrada
        titulo="Processo não encontrado"
        mensagem={`Não há processo com o código ${codigo} neste navegador. Ele pode ter sido excluído.`}
      />
    );
  }

  const etapa = etapaDe(s.config, p.etapaId);
  const proxima = proximaEtapa(s.config, p.etapaId);
  const podeAvancar = proxima !== null && p.situacao !== 'cancelado';
  const tarefasAbertas = s.tarefas.filter((t) => t.processoId === p.id && !t.concluida).length;
  const andamentos = s.andamentos.filter((a) => a.processoId === p.id).length;
  const anexos = anexosDoProcesso(s, p.id).length;

  const excluir = async () => {
    const ok = await confirmar({
      title: `Excluir ${p.codigo} de vez?`,
      message: `“${p.titulo}” some do sistema, junto com as tarefas, os andamentos e os anexos. Se a ideia é só parar, prefira mudar a situação para “Cancelado”: o histórico fica guardado.`,
      confirmLabel: 'Excluir processo',
      tone: 'danger',
    });
    if (!ok) return;
    await acoesProcesso.remover(p.id);
    navegar(rotas.processos());
    toast({ title: `${p.codigo} excluído.` });
  };

  const conteudo = (() => {
    switch (aba) {
      case 'visao-geral':
        return <VisaoGeralAba processo={p} />;
      case 'antes-e-depois':
        return <AntesDepoisAba processo={p} s={s} />;
      case 'tarefas':
        return <TarefasAba processo={p} s={s} />;
      case 'andamentos':
        return <AndamentosAba processo={p} s={s} />;
      case 'anexos':
        return <AnexosAba processo={p} s={s} />;
    }
  })();

  return (
    <div className="space-y-5">
      {/* O concluído mora em Concluídos: voltar leva para lá. */}
      <motion.a
        href={p.situacao === 'concluido' ? rotas.concluidos() : rotas.processos()}
        whileTap={press}
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-3 transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {p.situacao === 'concluido' ? 'Concluídos' : 'Processos'}
      </motion.a>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono text-[12px] font-medium text-ink-3">{p.codigo}</span>
            <SituacaoStatus situacao={p.situacao} />
            {p.prazo && <PrazoStatus processo={p} />}
          </div>
          <h1 className="sr-only">{p.titulo}</h1>
          <InlineText
            value={p.titulo}
            aria-label="Título do processo"
            required
            maxLength={140}
            onCommit={(v) => void acoesProcesso.atualizar(p.id, { titulo: v })}
            className="mt-1 text-[24px] leading-[1.15] font-semibold tracking-[-0.02em] sm:text-[30px]"
          />
          <AccentRule className="mt-3" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {podeAvancar && proxima ? (
            <Button
              variant="primary"
              iconRight={<ArrowRight className="h-4 w-4" />}
              onClick={() => void mover(p, proxima.id)}
              title={`Mover para “${proxima.nome}”`}
              className="max-w-[320px]"
            >
              <span className="truncate">Avançar para {proxima.nome}</span>
            </Button>
          ) : (
            p.situacao === 'concluido' && <Status tone="quiet">Processo concluído</Status>
          )}
          <Menu
            label="Mais ações do processo"
            align="end"
            items={[
              {
                id: 'comparar',
                label: 'Apresentar antes e depois',
                icon: <Presentation className="h-4 w-4" />,
                onSelect: () => navegar(rotas.comparacao(p.codigo)),
              },
              {
                id: 'resumo',
                label: 'Resumo para impressão',
                icon: <Printer className="h-4 w-4" />,
                onSelect: () => navegar(rotas.resumo(p.codigo)),
              },
              {
                id: 'excluir',
                label: 'Excluir processo',
                icon: <Trash2 className="h-4 w-4" />,
                tone: 'danger',
                onSelect: excluir,
              },
            ]}
            trigger={(props) => (
              <Button {...props} variant="secondary" square aria-label="Mais ações do processo" icon={<MoreHorizontal className="h-4 w-4" />} />
            )}
          />
        </div>
      </header>

      <Card className="space-y-3">
        <EtapaStepper processo={p} config={s.config} onEscolher={(id) => void mover(p, id)} />
        {etapa && (
          <div className="flex flex-col gap-1 border-t border-hairline pt-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <p className="text-[12px] leading-relaxed text-ink-3">
              <span className="font-medium text-ink-2">Nesta etapa: </span>
              {etapa.descricao || 'Sem descrição. Dá para escrever uma em Configurações → Etapas.'}
            </p>
            {estaAtivo(p) && <DiasNaEtapa dias={diasNaEtapa(p)} />}
          </div>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="min-w-0 space-y-4">
          <Tabs<AbaProcesso>
            layoutId={`processo-abas-${p.id}`}
            label="Seções do processo"
            value={aba}
            onChange={(a) => navegar(rotas.processo(p.codigo, a), { substituir: true })}
            items={[
              { id: 'visao-geral', label: 'Visão geral' },
              { id: 'antes-e-depois', label: 'Antes e depois' },
              { id: 'tarefas', label: 'Tarefas', count: tarefasAbertas || undefined },
              { id: 'andamentos', label: 'Andamentos', count: andamentos || undefined },
              { id: 'anexos', label: 'Anexos', count: anexos || undefined },
            ]}
          />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={aba}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: enterFast }}
              exit={{ opacity: 0, transition: exitFast }}
            >
              {conteudo}
            </motion.div>
          </AnimatePresence>
        </div>
        <aside className="lg:sticky lg:top-[94px]">
          <PainelDeCampos processo={p} s={s} />
        </aside>
      </div>
    </div>
  );
}
