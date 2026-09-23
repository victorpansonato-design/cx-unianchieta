/**
 * Painel de campos do processo (à direita, como no Jira): tudo o que
 * identifica o processo, editável no lugar, sem "modo de edição".
 */
import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Inbox } from 'lucide-react';
import { rotas } from '../../app/router';
import { CampoDeTags } from '../../components/domain/CamposExtras';
import { SeletorDePessoas } from '../../components/domain/Pessoas';
import { NivelStatus, PrioridadeStatus, SituacaoStatus } from '../../components/domain/StatusProcesso';
import { DateInput } from '../../components/ui/DateInput';
import { InlineText, InlineTextArea } from '../../components/ui/Fields';
import { SeletorInline } from '../../components/ui/SeletorInline';
import { Card } from '../../components/ui/Surfaces';
import type { ItemLista, Processo, Situacao, Snapshot } from '../../data/types';
import { ativos } from '../../domain/config';
import { ehEtapaFinal, estaVencido, SITUACOES } from '../../domain/processos';
import { formatarData, formatarMomento } from '../../lib/dates';
import { press } from '../../lib/motion';
import { normalizar } from '../../lib/text';
import { acoesProcesso } from '../../services/acoes';
import { useMoverEtapa } from './useMoverEtapa';

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[104px_minmax(0,1fr)] items-center gap-2">
      <dt className="text-[12px] text-ink-3">{rotulo}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function Bloco({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[12px] text-ink-3">{rotulo}</p>
      {children}
    </div>
  );
}

/** Opções de uma lista: as ativas + a atual, mesmo se arquivada (para continuar legível). */
function opcoesDe(lista: ItemLista[], atual: string | null) {
  return lista.filter((x) => !x.arquivado || x.id === atual).map((x) => ({ valor: x.id, nome: x.nome }));
}

export function PainelDeCampos({ processo: p, s }: { processo: Processo; s: Snapshot }) {
  const mover = useMoverEtapa();
  const { config } = s;
  const final = ehEtapaFinal(config, p.etapaId);
  const atualizar = (m: Parameters<typeof acoesProcesso.atualizar>[1]) => void acoesProcesso.atualizar(p.id, m);

  const todasAsTags = (() => {
    const mapa = new Map<string, string>();
    for (const x of s.processos) for (const t of x.tags) mapa.set(normalizar(t), t);
    return [...mapa.values()].sort((a, b) => a.localeCompare(b));
  })();

  const demanda = p.demandaId ? s.demandas.find((d) => d.id === p.demandaId) : undefined;

  return (
    <Card padded={false}>
      <h2 className="px-5 pt-4 pb-1 text-[12px] font-semibold text-ink-3">Detalhes</h2>
      <dl className="space-y-0.5 px-5 pb-4">
        <Campo rotulo="Etapa">
          <SeletorInline
            rotulo="Etapa"
            valor={p.etapaId}
            permitirVazio={false}
            opcoes={config.etapas.map((e, i) => ({ valor: e.id, nome: `${i + 1}. ${e.nome}` }))}
            onChange={(v) => v && void mover(p, v)}
          />
        </Campo>
        <Campo rotulo="Situação">
          <SeletorInline<Situacao>
            rotulo="Situação"
            valor={p.situacao}
            permitirVazio={false}
            cabecalho={
              final ? (
                <p className="max-w-[240px] text-[11.5px] leading-relaxed text-ink-4">
                  O processo está na última etapa. Para reabri-lo, mova-o para outra etapa.
                </p>
              ) : undefined
            }
            opcoes={SITUACOES.map((x) => ({
              valor: x.id,
              nome: x.nome,
              desabilitada: final && x.id !== 'concluido',
            }))}
            renderValor={(o) => <SituacaoStatus situacao={o.valor} />}
            onChange={(v) => v && void acoesProcesso.definirSituacao(p.id, v)}
          />
        </Campo>
        <Campo rotulo="Responsáveis">
          <SeletorDePessoas
            membros={config.membros}
            selecionados={p.responsaveisIds}
            onChange={(ids) => atualizar({ responsaveisIds: ids })}
          />
        </Campo>
        <Campo rotulo="Prazo">
          <DateInput
            variant="inline"
            aria-label="Prazo previsto"
            placeholder="Sem prazo"
            value={p.prazo}
            tone={estaVencido(p) ? 'crit' : undefined}
            onChange={(v) => atualizar({ prazo: v })}
          />
        </Campo>
        <Campo rotulo="Prioridade">
          <SeletorInline
            rotulo="Prioridade"
            valor={p.prioridadeId}
            vazio="Não definida"
            opcoes={opcoesDe(config.prioridades, p.prioridadeId)}
            renderValor={(o) => <PrioridadeStatus lista={config.prioridades} id={o.valor} />}
            onChange={(v) => atualizar({ prioridadeId: v })}
          />
        </Campo>
        <Campo rotulo="Impacto no aluno">
          <SeletorInline
            rotulo="Impacto no aluno"
            valor={p.impactoId}
            vazio="Não definido"
            opcoes={opcoesDe(config.impactos, p.impactoId)}
            renderValor={(o) => <NivelStatus lista={config.impactos} id={o.valor} />}
            onChange={(v) => atualizar({ impactoId: v })}
          />
        </Campo>
        <Campo rotulo="Setor dono">
          <SeletorInline
            rotulo="Setor dono"
            valor={p.setorId}
            vazio={ativos(config.setores).length ? 'Sem setor' : 'Nenhum setor cadastrado'}
            opcoes={opcoesDe(config.setores, p.setorId)}
            onChange={(v) => atualizar({ setorId: v })}
          />
        </Campo>
        <Campo rotulo="Origem">
          <SeletorInline
            rotulo="Origem da demanda"
            valor={p.origemId}
            vazio="Não informada"
            opcoes={opcoesDe(config.origens, p.origemId)}
            onChange={(v) => atualizar({ origemId: v })}
          />
        </Campo>
      </dl>

      <div className="space-y-4 border-t border-hairline px-5 py-4">
        <Bloco rotulo="Envolvidos de outros setores">
          <InlineTextArea
            variant="inline"
            rows={1}
            value={p.envolvidos}
            aria-label="Envolvidos de outros setores"
            placeholder="Nomes e setores de quem participa"
            onCommit={(v) => atualizar({ envolvidos: v })}
            className="text-[13px]"
          />
        </Bloco>
        <Bloco rotulo="Etiquetas">
          <CampoDeTags tags={p.tags} sugestoes={todasAsTags} onChange={(tags) => atualizar({ tags })} />
        </Bloco>
        <Bloco rotulo="Lyceum">
          <InlineText
            value={p.lyceum}
            aria-label="Módulo ou rotina do Lyceum"
            placeholder="Módulo ou rotina envolvida"
            onCommit={(v) => atualizar({ lyceum: v })}
            className="text-[13px]"
          />
        </Bloco>
      </div>

      <dl className="space-y-1.5 border-t border-hairline px-5 py-4">
        <Campo rotulo="Abertura">
          <DateInput
            variant="inline"
            aria-label="Data de abertura"
            value={p.abertura}
            onChange={(v) => v && atualizar({ abertura: v })}
          />
        </Campo>
        <Campo rotulo="Conclusão">
          <span className="px-0 font-mono text-[13px] text-ink-2">{p.conclusao ? formatarData(p.conclusao) : '—'}</span>
        </Campo>
        <Campo rotulo="Atualizado">
          <span className="text-[12px] text-ink-3">{formatarMomento(p.atualizadoEm)}</span>
        </Campo>
        {demanda && (
          <Campo rotulo="Veio da demanda">
            <motion.a
              href={rotas.demandas(demanda.id)}
              whileTap={press}
              className="inline-flex max-w-full items-center gap-1.5 text-[12px] font-medium text-ink-2 transition-colors hover:text-ink"
            >
              <Inbox className="h-3.5 w-3.5 shrink-0 text-ink-4" />
              <span className="truncate">{demanda.titulo}</span>
            </motion.a>
          </Campo>
        )}
      </dl>
    </Card>
  );
}
