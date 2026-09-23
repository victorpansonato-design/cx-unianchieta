/**
 * Quadro: os processos em aberto em cards, lado a lado numa grade que rola
 * com a roda do mouse, sem barra horizontal. A ordem vem de fora
 * (ordenarPorPrioridade): Alta primeiro, depois Média, depois Baixa.
 *
 * O card mostra só o que decide o próximo passo — prioridade, título, etapa,
 * responsáveis, prazo e há quanto tempo está na etapa; o resto está a um
 * clique, no processo. O menu "Mover para…" de cada card muda a etapa com o
 * mesmo aviso de tarefas abertas do botão "Avançar". Quando a ordem muda, o
 * card desliza até o lugar novo em vez de pular.
 */
import { LayoutGroup, motion } from 'motion/react';
import { MoreHorizontal } from 'lucide-react';
import { navegar, rotas } from '../../app/router';
import { DiasNaEtapa, PrazoStatus, PrioridadeStatus, SituacaoStatus } from '../../components/domain/StatusProcesso';
import { PilhaDeAvatares } from '../../components/domain/Pessoas';
import { Button } from '../../components/ui/Button';
import { Menu } from '../../components/ui/Overlay';
import type { Processo, Snapshot } from '../../data/types';
import { diasNaEtapa, indiceEtapa, etapaDe, nomesResponsaveis } from '../../domain/processos';
import { press, spring } from '../../lib/motion';
import { useMoverEtapa } from '../processo/useMoverEtapa';

function CardProcesso({ processo, s, onMover }: { processo: Processo; s: Snapshot; onMover: (etapaId: string) => void }) {
  const nomes = nomesResponsaveis(processo, s.config);
  const etapa = etapaDe(s.config, processo.etapaId);
  const abrir = () => navegar(rotas.processo(processo.codigo));

  return (
    <motion.div
      layout="position"
      transition={spring}
      role="link"
      tabIndex={0}
      aria-label={`${processo.codigo}: ${processo.titulo}`}
      whileTap={press}
      onClick={abrir}
      onKeyDown={(e) => {
        if (e.key === 'Enter') abrir();
      }}
      className="group relative flex min-h-50 cursor-pointer flex-col rounded-xl bg-surface p-4 transition-colors hover:bg-surface-hover"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 pt-0.5">
          <span className="font-mono text-[11px] text-ink-4">{processo.codigo}</span>
          {processo.prioridadeId && <PrioridadeStatus lista={s.config.prioridades} id={processo.prioridadeId} />}
          {(processo.situacao === 'pausado' || processo.situacao === 'cancelado') && (
            <SituacaoStatus situacao={processo.situacao} />
          )}
        </div>
        {/* O menu não abre o card: o clique para aqui. */}
        <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} className="-mt-1 -mr-1">
          <Menu
            label={`Mover ${processo.codigo} para outra etapa`}
            align="end"
            header={<p className="text-[11px] font-medium text-ink-4">Mover para</p>}
            items={s.config.etapas.map((e, i) => ({
              id: e.id,
              label: `${i + 1}. ${e.nome}`,
              selected: e.id === processo.etapaId,
              disabled: e.id === processo.etapaId,
              onSelect: () => onMover(e.id),
            }))}
            trigger={(props) => (
              <Button
                {...props}
                variant="ghost"
                size="xs"
                square
                aria-label={`Mover ${processo.codigo} para outra etapa`}
                icon={<MoreHorizontal className="h-3.5 w-3.5" />}
                // No toque sempre visível; com mouse aparece no hover, no foco e com o menu aberto.
                className="sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100 sm:aria-expanded:opacity-100"
              />
            )}
          />
        </div>
      </div>
      <p className="mt-2.5 line-clamp-3 text-[15px] leading-snug font-semibold text-ink">{processo.titulo}</p>
      {etapa && (
        <p className="mt-1.5 truncate text-[12px] text-ink-3" title={etapa.descricao || etapa.nome}>
          <span className="mr-1.5 font-mono text-[11px] text-ink-4">{indiceEtapa(s.config, etapa.id) + 1}</span>
          {etapa.nome}
        </p>
      )}
      <div className="mt-auto pt-4">
        <div className="flex items-end justify-between gap-3 border-t border-hairline pt-3">
          {nomes.length ? (
            <PilhaDeAvatares nomes={nomes} />
          ) : (
            <span className="text-[12px] text-ink-4">Sem responsável</span>
          )}
          <div className="flex min-w-0 flex-col items-end gap-0.5">
            <PrazoStatus processo={processo} curto />
            <DiasNaEtapa dias={diasNaEtapa(processo)} curto />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function QuadroView({ processos, s }: { processos: Processo[]; s: Snapshot }) {
  const mover = useMoverEtapa();

  return (
    <LayoutGroup id="quadro">
      {/* Colunas pela largura do conteúdo, não da janela: a sidebar aberta ou recolhida muda o espaço. */}
      <div className="@container">
        <div className="grid gap-3 @xl:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4">
          {processos.map((p) => (
            <CardProcesso key={p.id} processo={p} s={s} onMover={(etapaId) => void mover(p, etapaId)} />
          ))}
        </div>
      </div>
    </LayoutGroup>
  );
}
