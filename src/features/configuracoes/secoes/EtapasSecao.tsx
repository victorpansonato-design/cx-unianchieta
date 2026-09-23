/**
 * Fluxo de etapas: renomear, descrever, sinalizar no painel, reordenar,
 * adicionar e remover. A descrição aparece como ajuda dentro do processo.
 */
import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { Tag } from '../../../components/ui/Badges';
import { Button } from '../../../components/ui/Button';
import { InlineText, InlineTextArea } from '../../../components/ui/Fields';
import { Menu, useConfirm } from '../../../components/ui/Overlay';
import { Card, CardHeader } from '../../../components/ui/Surfaces';
import { useToast } from '../../../components/ui/Toast';
import type { Etapa, SinalEtapa } from '../../../data/types';
import { processosNaEtapa } from '../../../domain/config';
import { useSnapshot } from '../../../hooks/useStore';
import { press, spring } from '../../../lib/motion';
import { plural } from '../../../lib/text';
import { acoesConfig } from '../../../services/acoes';
import { TarefasPadrao } from '../TarefasPadrao';

const SINAIS: Array<{ valor: SinalEtapa; rotulo: string }> = [
  { valor: null, rotulo: 'Sem sinal' },
  { valor: 'diretoria', rotulo: 'Aguarda diretoria' },
  { valor: 'ti', rotulo: 'Com o TI' },
];

function rotuloSinal(s: SinalEtapa) {
  return SINAIS.find((x) => x.valor === s)?.rotulo ?? 'Sem sinal';
}

export function EtapasSecao() {
  const snapshot = useSnapshot();
  const etapas = snapshot.config.etapas;
  const confirmar = useConfirm();
  const toast = useToast();
  const [recemCriada, setRecemCriada] = useState<string | null>(null);

  const renomear = (etapa: Etapa, nome: string) => {
    const r = acoesConfig.atualizarEtapa(etapa.id, { nome });
    if (!r.ok) {
      toast({ title: r.motivo, tone: 'crit' });
      return false;
    }
    return true;
  };

  const remover = async (etapa: Etapa) => {
    const emUso = processosNaEtapa(snapshot, etapa.id);
    if (emUso > 0 || etapas.length <= 2) {
      // Explica o bloqueio antes de pedir confirmação para algo que não vai acontecer.
      await confirmar({
        title: 'Esta etapa não pode ser removida agora',
        message:
          etapas.length <= 2
            ? 'O fluxo precisa de pelo menos duas etapas: uma para começar e outra para encerrar.'
            : `Há ${plural(emUso, 'processo', 'processos')} nesta etapa. Mova-os para outra etapa antes de removê-la.`,
        somenteAviso: true,
      });
      return;
    }
    const ok = await confirmar({
      title: `Remover a etapa “${etapa.nome}”?`,
      message:
        'Ela sai do fluxo, do quadro e da barra de progresso. Os andamentos já registrados sobre ela continuam na linha do tempo dos processos.',
      confirmLabel: 'Remover etapa',
      tone: 'danger',
    });
    if (!ok) return;
    const r = acoesConfig.removerEtapa(etapa.id);
    if (!r.ok) toast({ title: r.motivo, tone: 'crit' });
    else toast({ title: `Etapa “${etapa.nome}” removida.` });
  };

  const adicionar = () => {
    setRecemCriada(acoesConfig.adicionarEtapa());
  };

  return (
    <Card padded={false}>
      <CardHeader
        className="px-5 pt-5 pb-4"
        title="Fluxo de etapas"
        subtitle="A ordem aqui é a ordem do quadro e da barra de progresso de cada processo. A última etapa encerra o processo. Clique no nome ou na descrição para editar; em “Tarefas padrão”, escreva o checklist que toda etapa deve ter."
        action={
          <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={adicionar}>
            Adicionar etapa
          </Button>
        }
      />
      <ol className="divide-y divide-hairline border-t border-hairline">
        {etapas.map((etapa, i) => {
          const ultima = i === etapas.length - 1;
          const emUso = processosNaEtapa(snapshot, etapa.id);
          return (
            <motion.li key={etapa.id} layout="position" transition={spring} className="flex gap-3 px-5 py-3.5">
              <span className="mt-1.5 w-5 shrink-0 text-right font-mono text-[12px] text-ink-4">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <div className="min-w-[160px] flex-1">
                    <InlineText
                      value={etapa.nome}
                      aria-label={`Nome da etapa ${i + 1}`}
                      delay={null}
                      required
                      autoFocus={recemCriada === etapa.id}
                      onCommit={(v) => renomear(etapa, v)}
                      className="text-[13px] font-medium"
                    />
                  </div>
                  {ultima && <Tag>Encerra o processo</Tag>}
                  {emUso > 0 && <Tag>{plural(emUso, 'processo', 'processos')}</Tag>}
                </div>
                <InlineTextArea
                  variant="inline"
                  rows={1}
                  value={etapa.descricao}
                  aria-label={`Descrição da etapa ${etapa.nome}`}
                  placeholder="Descreva o que se espera nesta etapa"
                  onCommit={(v) => {
                    acoesConfig.atualizarEtapa(etapa.id, { descricao: v.trim() });
                  }}
                  className="mt-0.5 text-[12px] text-ink-3"
                />
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-4">
                  <span className="flex items-center gap-1.5">
                    <span>No painel:</span>
                    <Menu
                      label={`Sinal da etapa ${etapa.nome} no painel`}
                      align="start"
                      items={SINAIS.map((s) => ({
                        id: s.valor ?? 'nenhum',
                        label: s.rotulo,
                        selected: s.valor === etapa.sinal,
                        onSelect: () => acoesConfig.atualizarEtapa(etapa.id, { sinal: s.valor }),
                      }))}
                      trigger={(props) => (
                        <motion.button
                          type="button"
                          whileTap={press}
                          {...props}
                          className="inline-flex items-center gap-1 rounded-sm px-1 py-0.5 font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                        >
                          {rotuloSinal(etapa.sinal)}
                          <ChevronDown className="h-3 w-3 text-ink-4" />
                        </motion.button>
                      )}
                    />
                  </span>
                </div>
                <div className="mt-1">
                  <TarefasPadrao etapa={etapa} />
                </div>
              </div>
              <div className="flex shrink-0 items-start gap-0.5">
                <Button
                  variant="ghost"
                  size="xs"
                  square
                  aria-label={`Mover ${etapa.nome} para cima`}
                  disabled={i === 0}
                  icon={<ArrowUp className="h-3.5 w-3.5" />}
                  onClick={() => acoesConfig.moverEtapa(etapa.id, -1)}
                />
                <Button
                  variant="ghost"
                  size="xs"
                  square
                  aria-label={`Mover ${etapa.nome} para baixo`}
                  disabled={ultima}
                  icon={<ArrowDown className="h-3.5 w-3.5" />}
                  onClick={() => acoesConfig.moverEtapa(etapa.id, 1)}
                />
                <Button
                  variant="ghost"
                  size="xs"
                  square
                  aria-label={`Remover ${etapa.nome}`}
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                  onClick={() => remover(etapa)}
                />
              </div>
            </motion.li>
          );
        })}
      </ol>
      <p className="border-t border-hairline px-5 py-3 text-[11.5px] leading-relaxed text-ink-4">
        “Aguarda diretoria” e “Com o TI” dizem ao painel em quais etapas o processo está esperando por alguém de
        fora do CX.
      </p>
    </Card>
  );
}
